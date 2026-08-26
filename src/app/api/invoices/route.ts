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
    const { productId, quantity = 1, email, coin = 'btc', couponCode } = body;

    if (!productId || !email) {
      return NextResponse.json({ error: 'productId and email are required' }, { status: 400 });
    }

    // 1. Validate product
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (product.stock < quantity && product.stock !== -1) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
    }

    // 2. Fraud checks
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const blacklistCheck = await isBlacklisted(email, ip);
    if (blacklistCheck.blocked) {
      return NextResponse.json({ error: blacklistCheck.reason }, { status: 403 });
    }
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
    }

    // 3. Calculate total
    let totalAmount = product.price * quantity;
    let discountAmount = 0;
    let couponId: string | null = null;

    // 4. Validate coupon
    if (couponCode) {
      const coupon = await db.query.coupons.findFirst({
        where: eq(coupons.code, couponCode),
      });
      if (coupon && coupon.isActive) {
        if (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date()) {
          if (!coupon.maxUses || coupon.usedCount < coupon.maxUses) {
            if (!coupon.productId || coupon.productId === productId) {
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

    // 5. Convert to crypto
    let cryptoAmount = '0';
    let rate = 0;
    try {
      const conversion = await convertUsdToCrypto(totalAmount, coin);
      cryptoAmount = conversion.cryptoAmount;
      rate = conversion.rate;
    } catch {
      cryptoAmount = (totalAmount / 65000).toFixed(8); // Fallback
    }

    // 6. Get or create customer
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

    // 7. Create invoice
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

    // 8. Create order
    await db.insert(orders).values({
      invoiceId: newInvoice.id,
      productId: product.id,
      customerId: customer.id,
      quantity,
      unitPrice: product.price,
      totalPrice: totalAmount,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

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
