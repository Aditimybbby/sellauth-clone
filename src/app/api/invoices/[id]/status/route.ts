import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, orders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import axios from 'axios';
import { fulfillInvoice } from '@/lib/fulfillment';

// Throttle on-chain lookups per invoice — public explorers are generous but
// we still keep it polite (one check per 45s per invoice, page-driven).
const pollThrottle = new Map<string, number>();
const POLL_INTERVAL_MS = 45_000;

const PLACEHOLDER_RE = /^your-/i;
const CHAINS = ['btc', 'ltc', 'doge'];

// One payment fulfils exactly one invoice — in-memory record of spent txids
// so the same on-chain payment can't complete two different invoices.
const consumedTxids = new Set<string>();

// Keyless blockchain explorers (Esplora API). No API key, no shared-IP quota.
const ESPLORA_HOSTS: Record<string, string> = {
  ltc: 'https://litecoinspace.org',
  btc: 'https://blockstream.info',
};

interface BlockCypherTxRef {
  received?: string;
  value?: number;
  double_spend?: boolean;
  tx_hash?: string;
}

interface TxOut {
  txid: string;
  index: number;
  value: number;
}

/** Esplora explorers: latest 50 txs (mempool first). Sum outputs paid to the
 *  invoice address from confirmed txs after `since`, plus anything in mempool. */
async function getReceivedEsplora(
  coin: string,
  address: string,
  sinceMs: number
): Promise<number> {
  const host = ESPLORA_HOSTS[coin];
  if (!host) throw new Error('no esplora explorer for ' + coin);
  const res = await axios.get(`${host}/api/address/${address}/txs`, { timeout: 8000 });
  let sum = 0;
  for (const tx of res.data || []) {
    const confirmed = tx.status?.confirmed === true;
    const ts = confirmed ? (tx.status?.block_time || 0) * 1000 : Date.now(); // mempool ≈ now
    if (confirmed && ts < sinceMs) continue;
    for (const v of tx.vout || []) {
      if (v.scriptpubkey_address === address) {
        sum += v.value || 0;
      }
    }
  }
  return sum;
}

/** BlockCypher fallback: A) txrefs received after invoice creation,
 *  B) lifetime-received increase since the invoice baseline. */
async function getReceivedBlockCypher(
  coin: string,
  address: string,
  sinceIso: string,
  baseline: number
): Promise<number> {
  const token = process.env.BLOCKCYPHER_TOKEN;
  const url = `https://api.blockcypher.com/v1/${coin}/main/addrs/${address}${token ? `?token=***}` : ''}`;
  const res = await axios.get(url, { timeout: 8000 });
  const since = new Date(sinceIso).getTime() - 5 * 60 * 1000;
  let windowSum = 0;
  const refs = [...(res.data?.txrefs || []), ...(res.data?.unconfirmed_txrefs || [])];
  for (const tx of refs) {
    if (tx.double_spend) continue;
    if (tx.received && new Date(tx.received).getTime() >= since) {
      windowSum += tx.value || 0;
    }
  }
  const balanceDelta = baseline > 0 ? Number(res.data?.total_received || 0) - baseline : 0;
  return Math.max(windowSum, balanceDelta);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let receivedSats: number | null = null;

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
          const sinceMs = new Date(invoice.createdAt || new Date().toISOString()).getTime() - 5 * 60 * 1000;

          // Primary: keyless Esplora explorers.
          let windowSum = 0;
          const matchedTxids: string[] = [];
          try {
            const host = ESPLORA_HOSTS[coin];
            const res = await axios.get(`${host}/api/address/${address}/txs`, { timeout: 8000 });
            for (const tx of res.data || []) {
              const confirmed = tx.status?.confirmed === true;
              const ts = confirmed ? (tx.status?.block_time || 0) * 1000 : Date.now();
              if (confirmed && ts < sinceMs) continue;
              for (const v of tx.vout || []) {
                if (v.scriptpubkey_address === address) {
                  const key = tx.txid + ':' + v.value;
                  if (consumedTxids.has(key)) continue;
                  windowSum += v.value || 0;
                  matchedTxids.push(key);
                }
              }
            }
            receivedSats = windowSum;
          } catch (esploraErr) {
            console.error('[payment-detect] esplora failed, trying blockcypher:', (esploraErr as Error).message);
            // Fallback: BlockCypher
            const baseline = Number(invoice.baselineBalance || 0);
            receivedSats = await getReceivedBlockCypher(coin, address, invoice.createdAt || new Date().toISOString(), baseline);
          }

          console.log(
            `[payment-detect] ${id.slice(0, 8)}: received=${receivedSats} sat, expected=${expected} sat (${invoice.cryptoAmount} ${coin})`
          );

          if (expected > 0 && receivedSats >= Math.round(expected * 0.995)) {
            for (const key of matchedTxids) consumedTxids.add(key);
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

    // Expiry (only invoices that never received any payment)
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
