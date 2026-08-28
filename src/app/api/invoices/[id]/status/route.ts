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

interface BlockCypherTxRef {
  received?: string;
  value?: number;
  double_spend?: boolean;
}

async function fetchAddressTxs(
  coin: string,
  address: string
): Promise<{ txrefs: BlockCypherTxRef[]; totalReceived: number }> {
  const token = process.env.BLOCKCYPHER_TOKEN;
  const url = `https://api.blockcypher.com/v1/${coin}/main/addrs/${address}${token ? `?token=***}` : ''}`;
  const res = await axios.get(url, { timeout: 8000 });
  return {
    txrefs: [...(res.data?.txrefs || []), ...(res.data?.unconfirmed_txrefs || [])],
    totalReceived: Number(res.data?.total_received || 0),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let receivedSats: number | null = null;

    // 1. Payment auto-detection. Two independent checks:
    //    A) sum of transactions received on the address AFTER the invoice was
    //       created (includes unconfirmed — fast),
    //    B) increase in the address's lifetime received balance since the
    //       invoice baseline (authoritative, confirmed only).
    //    Either reaching the expected amount fulfils the invoice.
    const coin = (invoice.cryptoCurrency || '').toLowerCase();
    const address = invoice.paymentAddress || '';
    const addressOk = address && !PLACEHOLDER_RE.test(address);
    const pollable =
      ['PENDING', 'DETECTED', 'CONFIRMING', 'PARTIALLY_PAID'].includes(invoice.status) &&
      CHAINS.includes(coin) &&
      addressOk;

    if (pollable) {
      const now = Date.now();
      const last = pollThrottle.get(invoice.id) || 0;
      if (now - last >= POLL_INTERVAL_MS) {
        pollThrottle.set(invoice.id, now);
        try {
          const expected = Math.round(parseFloat(invoice.cryptoAmount || '0') * 1e8);
          const { txrefs, totalReceived } = await fetchAddressTxs(coin, address);

          const since = new Date(invoice.createdAt || new Date().toISOString()).getTime() - 5 * 60 * 1000;
          let windowSum = 0;
          for (const tx of txrefs) {
            if (tx.double_spend) continue;
            if (tx.received && new Date(tx.received).getTime() >= since) {
              windowSum += tx.value || 0;
            }
          }

          // Balance delta is only meaningful for invoices created after the
          // baseline feature existed (baselineBalance > 0).
          const baseline = Number(invoice.baselineBalance || 0);
          const balanceDelta = baseline > 0 ? totalReceived - baseline : 0;

          receivedSats = Math.max(windowSum, balanceDelta);
          const expectedUsdFriendly = invoice.cryptoAmount;
          console.log(
            `[payment-detect] ${id.slice(0, 8)}: received=${receivedSats} sat (window=${windowSum}, delta=${balanceDelta}) expected=${expected} sat (${expectedUsdFriendly} ${coin})`
          );

          if (expected > 0 && receivedSats >= Math.round(expected * 0.995)) {
            await fulfillInvoice(invoice.id);
          } else if (receivedSats > 0 && invoice.status === 'PENDING') {
            await db.update(invoices)
              .set({ status: 'DETECTED', updatedAt: new Date().toISOString() })
              .where(eq(invoices.id, invoice.id));
          }
        } catch (err) {
          console.error('[payment-detect] failed for invoice', id.slice(0, 8), ':', (err as Error).message);
        }
        [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
      }
    }

    let status = invoice.status;

    // 2. Expiry (only invoices that never received any payment)
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

    const showReceived =
      (status === 'DETECTED' || status === 'PARTIALLY_PAID' || status === 'CONFIRMING') &&
      receivedSats !== null &&
      receivedSats > 0;

    return NextResponse.json({
      status,
      confirmations: invoice.confirmations || 0,
      deliveredContent,
      txHash: invoice.txHash,
      receivedCrypto: showReceived ? (receivedSats as number) / 1e8 : undefined,
      expectedCrypto: showReceived ? invoice.cryptoAmount || undefined : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invoice status' }, { status: 500 });
  }
}
