import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, orders, invoices } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { orderId, productId, rating, comment, customerEmail } = await req.json();

    if (!orderId || !customerEmail) {
      return NextResponse.json({ error: 'orderId and customerEmail are required' }, { status: 400 });
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, order.invoiceId));
    if (!invoice || invoice.customerEmail.toLowerCase() !== String(customerEmail).toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized review attempt' }, { status: 401 });
    }

    if (productId && productId !== order.productId) {
      return NextResponse.json({ error: 'Product does not match this order' }, { status: 400 });
    }

    // One review per order.
    const [existing] = await db.select().from(reviews).where(eq(reviews.orderId, order.id)).limit(1);
    if (existing) {
      return NextResponse.json({ error: 'A review was already submitted for this order' }, { status: 409 });
    }

    const [newReview] = await db.insert(reviews).values({
      productId: order.productId,
      orderId: order.id,
      customerEmail: invoice.customerEmail,
      rating: ratingNum,
      comment: comment ? String(comment).slice(0, 2000) : null,
      createdAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
