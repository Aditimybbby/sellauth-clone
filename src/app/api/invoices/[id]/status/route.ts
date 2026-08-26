import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let status = invoice.status;
    
    if (status === 'PENDING' && invoice.expiresAt && new Date(invoice.expiresAt) < new Date()) {
      status = 'EXPIRED';
      await db.update(invoices).set({ status, updatedAt: new Date().toISOString() }).where(eq(invoices.id, invoice.id));
    }

    let deliveredContent = null;
    if (status === 'COMPLETED') {
      const [order] = await db.select().from(orders).where(eq(orders.invoiceId, invoice.id));
      if (order) deliveredContent = order.deliveredContent;
    }

    return NextResponse.json({
      status,
      confirmations: invoice.confirmations || 0,
      deliveredContent,
      txHash: invoice.txHash
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoice status' }, { status: 500 });
  }
}
