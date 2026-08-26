import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, orders, products, licenseKeys, customers } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invoice_id = searchParams.get('invoice_id');
    const secret = searchParams.get('secret');
    const coin = searchParams.get('coin');

    if (secret !== process.env.CRYPTO_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const body = await req.json();
    const { value, transaction_hash, confirmations } = body;

    if (!invoice_id) return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });

    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoice_id));
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (invoice.status === 'COMPLETED') return NextResponse.json({ success: true, message: 'Already completed' });

    // Mock validation logic, normally verify on-chain and compare expected amount
    const sufficientPayment = true; 

    if (sufficientPayment) {
      await db.update(invoices).set({
        status: 'COMPLETED',
        txHash: transaction_hash,
        confirmations,
        updatedAt: new Date().toISOString()
      }).where(eq(invoices.id, invoice.id));
      
      const [order] = await db.select().from(orders).where(eq(orders.invoiceId, invoice.id));
      if (order) {
        await db.update(orders).set({ status: 'FULFILLED', updatedAt: new Date().toISOString() }).where(eq(orders.id, order.id));
      }
    } else {
      await db.update(invoices).set({ status: 'PARTIALLY_PAID', updatedAt: new Date().toISOString() }).where(eq(invoices.id, invoice.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
