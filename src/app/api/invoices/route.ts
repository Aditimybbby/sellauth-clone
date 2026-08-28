import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, orders, customers, products, coupons, settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { runMigrations } from '@/lib/db/migrate';
import { convertUsdToCrypto } from '@/lib/crypto-pricing';
import { isBlacklisted, checkRateLimit } from '@/lib/fraud';
import { createPaymentForwarder } from '@/lib/payments/blockcypher';
import { nanoid } from 'nanoid';

try { await runMigrations(); } catch {}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, email, coin = 'btc', couponCode } = body;

    if (!items || items.length === 0 || !email) {
      return NextResponse.json({ error: 'items and email are required' }, { status: 400 });
    }

    // 1. Fraud checks
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const blacklistCheck = await isBlacklisted(email, ip);
    if (blacklistCheck.blocked) {
      return NextResponse.json({ error: blacklistCheck.reason }, { status: 403 });
    }
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    // 2. Validate products and calculate subtotal
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });
      if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
      if (product.stock < item.quantity && product.stock !== -1) {
        return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      validatedItems.push({ product, quantity: item.quantity, itemTotal });
    }

    let discountAmount = 0;
    let couponId: string | null = null;

    // 3. Validate coupon
    if (couponCode) {
      const coupon = await db.query.coupons.findFirst({
        where: eq(coupons.code, couponCode),
      });
      if (coupon && coupon.isActive) {
        if (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date()) {
          if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
            // Apply coupon logic
            if (coupon.productId) {
              // Apply only to specific product
              const eligibleItem = validatedItems.find(i => i.product.id === coupon.productId);
              if (eligibleItem) {
                if (coupon.discountType === 'PERCENTAGE') {
                  discountAmount = eligibleItem.itemTotal * (coupon.discountValue / 100);
                } else {
                  discountAmount = Math.min(coupon.discountValue, eligibleItem.itemTotal);
                }
                couponId = coupon.id;
                totalAmount -= discountAmount;
              }
            } else {
              // Apply globally
              if (coupon.discountType === 'PERCENTAGE') {
                discountAmount = totalAmount * (coupon.discountValue / 100);
              } else {
                discountAmount = Math.min(coupon.discountValue, totalAmount);
              }
              couponId = coupon.id;
              totalAmount -= discountAmount;
            }
          }
        }
      }
    }

    // 4. Convert to crypto (coin case is normalised inside; 'TEST' stays 1:1)
    let cryptoAmount = '0';
    let rate = 0;
    try {
      const conversion = await convertUsdToCrypto(totalAmount, coin);
      cryptoAmount = conversion.cryptoAmount;
      rate = conversion.rate;
    } catch {
      cryptoAmount = (totalAmount / 65000).toFixed(8); // Fallback
    }

    // 5. Get or create customer
    let customer = await db.query.customers.findFirst({
      where: eq(customers.email, email),
    });
    if (!customer) {
      const [newCustomer] = await db.insert(customers).values({
        email,
        ipAddress: ip,
        createdAt: new Date().toISOString(),
      }).returning();
      customer = newCustomer;
    }

    // 6. Reserve the invoice id up-front so the BlockCypher forwarding
    //    callback can embed it before the invoice row exists.
    const invoiceId = nanoid(16);
    const lowerCoin = (coin || '').toLowerCase();

    // 7. Payment address: when a BlockCypher token and destination wallet are
    //    configured, generate a per-invoice forwarding address. Destination is
    //    resolved per-coin from Settings (btc_address / ltc_address) because a
    //    forwarding destination must live on the same chain as the invoice's
    //    coin; otherwise fall back to the static CRYPTO_DESTINATION_ADDRESS.
    let paymentAddress = '';
    const destSetting = await db.query.settings.findFirst({
      where: eq(settings.key, lowerCoin + '_address'),
    });
    if (destSetting?.value) paymentAddress = destSetting.value;
    if (!paymentAddress) paymentAddress = process.env.CRYPTO_DESTINATION_ADDRESS || '';
    let forwarderId: string | null = null;
    if (
      paymentAddress &&
      process.env.BLOCKCYPHER_TOKEN &&
      (lowerCoin === 'btc' || lowerCoin === 'ltc' || lowerCoin === 'doge')
    ) {
      try {
        const forwarder = await createPaymentForwarder(
          lowerCoin as 'btc' | 'ltc' | 'doge',
          paymentAddress,
          invoiceId,
          process.env.CRYPTO_WEBHOOK_SECRET || ''
        );
        paymentAddress = forwarder.input_address;
        forwarderId = forwarder.id;
      } catch (err) {
        // Forwarding is best-effort; the static address still works for manual payments.
        console.error('BlockCypher forwarder creation failed, using static address:', err);
      }
    }

    // 8. Expiry from settings (invoice_timeout_minutes, clamped 5..120)
    const timeoutSetting = await db.query.settings.findFirst({
      where: eq(settings.key, 'invoice_timeout_minutes'),
    });
    const timeoutMinutes = Math.min(120, Math.max(5, parseInt(timeoutSetting?.value || '30', 10) || 30));
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60000).toISOString();

    // 9. Create invoice
    const [newInvoice] = await db.insert(invoices).values({
      id: invoiceId,
      customerEmail: email,
      customerId: customer.id,
      totalAmount,
      cryptoAmount,
      cryptoCurrency: coin,
      paymentAddress,
      forwarderId,
      status: 'PENDING',
      couponId,
      discountAmount,
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    // 10. Create orders
    for (const item of validatedItems) {
      await db.insert(orders).values({
        invoiceId: newInvoice.id,
        productId: item.product.id,
        customerId: customer.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: item.itemTotal,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // 11. Count coupon usage so maxUses is enforced
    if (couponId) {
      const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, couponId) });
      if (coupon) {
        await db.update(coupons)
          .set({ usedCount: coupon.usedCount + 1 })
          .where(eq(coupons.id, couponId));
      }
    }

    return NextResponse.json({
      invoiceId: newInvoice.id,
      paymentAddress: newInvoice.paymentAddress,
      cryptoAmount: newInvoice.cryptoAmount,
      cryptoCurrency: coin,
      totalAmount,
      expiresAt: newInvoice.expiresAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Invoice creation failed:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
