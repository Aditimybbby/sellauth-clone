import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { fulfillInvoice } from '@/lib/fulfillment';

/**
 * BlockCypher payment webhook.
 *
 * The callback URL is registered when the invoice's payment forwarder is
 * created: /api/webhooks/blockcypher?invoice_id=...&secret=...&coin=...
 * BlockCypher posts the observed transaction: { value, transaction_hash,
 * confirmations, ... } where `value` is in satoshis (1e8 base units).
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invoice_id = searchParams.get('invoice_id');
    const secret = searchParams.get('secret');

    if (!process.env.CRYPTO_WEBHOOK_SECRET || secret !== process.env.CRYPTO_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { value, transaction_hash, confirmations } = body;

    if (!invoice_id) return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });

    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoice_id));
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    if (invoice.status === 'COMPLETED') {
      return NextResponse.json({ success: true, message: 'Already completed' });
    }

    // Compare the observed payment against the expected crypto amount.
    // value is in satoshis; cryptoAmount is stored in whole coins (8 dp).
    const expectedBaseUnits = invoice.cryptoAmount
      ? Math.round(parseFloat(invoice.cryptoAmount) * 1e8)
      : 0;
    const paidValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    const sufficientPayment = expectedBaseUnits <= 0 || paidValue >= expectedBaseUnits;

    if (sufficientPayment) {
      await fulfillInvoice(
        invoice.id,
        transaction_hash,
        typeof confirmations === 'number' ? confirmations : 0
      );
      return NextResponse.json({ success: true });
    }

    await db.update(invoices)
      .set({
        status: 'PARTIALLY_PAID',
        txHash: transaction_hash,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(invoices.id, invoice.id));

    return NextResponse.json({ success: true, partiallyPaid: true });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
