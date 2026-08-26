import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, orders, customers, products, coupons } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { runMigrations } from '@/lib/db/migrate';
import { convertUsdToCrypto } from '@/lib/crypto-pricing';
import { isBlacklisted, checkRateLimit } from '@/lib/fraud';
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

    // 4. Convert to crypto
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

    // 6. Create invoice
    const paymentAddress = process.env.CRYPTO_DESTINATION_ADDRESS || '';
    const expiresAt = new Date(Date.now() + 30 * 60000).toISOString();

    const [newInvoice] = await db.insert(invoices).values({
      customerEmail: email,
      customerId: customer.id,
      totalAmount,
      cryptoAmount,
      cryptoCurrency: coin,
      paymentAddress,
      status: 'PENDING',
      couponId,
      discountAmount,
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    // 7. Create orders
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
