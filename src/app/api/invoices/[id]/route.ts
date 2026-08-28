import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Include the invoice's orders (with product info) so the invoice page
    // can display delivered content after payment.
    const invoiceOrders = await db.query.orders.findMany({
      where: eq(orders.invoiceId, id),
      with: { product: true },
    });

    return NextResponse.json({
      ...invoice,
      orders: invoiceOrders.map((o) => ({
        id: o.id,
        productId: o.productId,
        quantity: o.quantity,
        deliveredContent: o.deliveredContent ?? null,
        product: o.product ? { name: o.product.name, type: o.product.type } : null,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}
