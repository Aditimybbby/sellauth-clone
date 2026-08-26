import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reviews, orders, customers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { productId, orderId, rating, comment, customerEmail } = await req.json();

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    
    const [customer] = await db.select().from(customers).where(eq(customers.id, order.customerId as string));
    if (!customer || customer.email !== customerEmail) {
      return NextResponse.json({ error: 'Unauthorized review attempt' }, { status: 401 });
    }

    const [newReview] = await db.insert(reviews).values({
      productId,
      orderId,
      customerEmail: customer.email,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
