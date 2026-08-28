import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import { fulfillInvoice } from '@/lib/fulfillment';

// Throttle BlockCypher lookups per invoice — the free tier rate-limits hard.
const pollThrottle = new Map<string, number>();
const POLL_INTERVAL_MS = 45_000;

const PLACEHOLDER_RE = /^your-/i;
const CHAINS = ['btc', 'ltc', 'doge'];

async function getReceivedSince(coin: string, address: string, sinceIso: string): Promise<number> {
  const token = process.env.BLOCKCYPHER_TOKEN;
  const url = `https://api.blockcypher.com/v1/${coin}/main/addrs/${address}${token ? `?token=${token}` : ''}`;
  const res = await axios.get(url, { timeout: 8000 });
  const since = new Date(sinceIso).getTime() - 5 * 60 * 1000; // 5 min clock-skew tolerance
  let received = 0;
  const refs = [...(res.data?.txrefs || []), ...(res.data?.unconfirmed_txrefs || [])];
  for (const tx of refs) {
    if (tx.double_spend) continue;
    if (tx.received && new Date(tx.received).getTime() >= since) {
      received += tx.value || 0;
    }
  }
  return received; // base units (satoshis / litoshis)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // 1. Payment auto-detection: for invoices without a forwarding address
    //    (where BlockCypher webhooks don't apply) we watch the payment
    //    address for incoming transactions since the invoice was created.
    const coin = (invoice.cryptoCurrency || '').toLowerCase();
    const address = invoice.paymentAddress || '';
    if (
      (invoice.status === 'PENDING' || invoice.status === 'PARTIALLY_PAID') &&
      CHAINS.includes(coin) &&
      address &&
      !PLACEHOLDER_RE.test(address)
    ) {
      const now = Date.now();
      const last = pollThrottle.get(invoice.id) || 0;
      if (now - last >= POLL_INTERVAL_MS) {
        pollThrottle.set(invoice.id, now);
        try {
          const baseline = Number(invoice.baselineBalance || 0);
          const received = await getReceivedSince(coin, address, invoice.createdAt || new Date().toISOString()) - baseline;
          const expected = Math.round(parseFloat(invoice.cryptoAmount || '0') * 1e8);

          if (expected > 0 && received >= Math.round(expected * 0.995)) {
            await fulfillInvoice(invoice.id);
          } else if (received > 0 && invoice.status === 'PENDING') {
            await db.update(invoices)
              .set({ status: 'PARTIALLY_PAID', updatedAt: new Date().toISOString() })
              .where(eq(invoices.id, invoice.id));
          }
        } catch (err) {
          console.error('Payment polling failed for invoice', id.slice(0, 8), ':', (err as Error).message);
        }
      }
    }

    // 2. Re-read after possible fulfillment
    [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    let status = invoice.status;

    // 3. Expiry
    if (status === 'PENDING' && invoice.expiresAt && new Date(invoice.expiresAt) < new Date()) {
      status = 'EXPIRED';
      await db.update(invoices)
        .set({ status, updatedAt: new Date().toISOString() })
        .where(eq(invoices.id, invoice.id));
    }

    let deliveredContent: string | null = null;
    if (status === 'COMPLETED') {
      const [order] = await db.select().from(orders).where(eq(orders.invoiceId, invoice.id));
      if (order) deliveredContent = order.deliveredContent;
    }

    return NextResponse.json({
      status,
      confirmations: invoice.confirmations || 0,
      deliveredContent,
      txHash: invoice.txHash,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoice status' }, { status: 500 });
  }
}
