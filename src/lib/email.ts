import nodemailer from 'nodemailer';
import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.EMAIL_FROM
  );
}

async function getStoreName(): Promise<string> {
  try {
    const s = await db.query.settings.findFirst({ where: eq(settings.key, 'store_name') });
    return s?.value || 'Store';
  } catch {
    return 'Store';
  }
}

async function transporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER as string,
      pass: process.env.SMTP_PASS as string,
    },
  });
}

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.log('[email] SMTP not configured — skipping email to', to);
    return false;
  }
  try {
    const t = await transporter();
    await t.sendMail({ from: process.env.EMAIL_FROM as string, to, subject, html });
    console.log('[email] sent:', subject, '->', to);
    return true;
  } catch (err) {
    console.error('[email] failed to send:', err);
    return false;
  }
}

interface InvoiceLike {
  id: string;
  customerEmail: string;
  totalAmount: number;
  cryptoAmount: string | null;
  cryptoCurrency: string | null;
  paymentAddress: string | null;
  expiresAt: string | null;
}

export async function sendInvoiceEmail(invoice: InvoiceLike): Promise<boolean> {
  const store = await getStoreName();
  const isTest = (invoice.cryptoCurrency || '').toUpperCase() === 'TEST';
  const link = (process.env.NEXT_PUBLIC_APP_URL || '') + '/invoice/' + invoice.id;
  const expiry = invoice.expiresAt ? new Date(invoice.expiresAt).toLocaleString('en-US') : '30 minutes';

  const amountLine = isTest
    ? `<strong>$${invoice.totalAmount.toFixed(2)}</strong> (test payment)`
    : `<strong>${invoice.cryptoAmount} ${String(invoice.cryptoCurrency).toUpperCase()}</strong>`;

  const paymentBlock = isTest
    ? `<p>Open the invoice page and press <strong>Simulate Payment</strong> to complete the mock checkout.</p>`
    : `<p>Send exactly <strong>${invoice.cryptoAmount} ${String(invoice.cryptoCurrency).toUpperCase()}</strong> to:</p>
       <p style="font-family:monospace;word-break:break-all;background:#141414;padding:12px;border-radius:8px;">${invoice.paymentAddress}</p>
       <p>Payment is detected automatically; your order completes within a minute of confirmation.</p>`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#eee;background:#0a0a0a;border-radius:12px;padding:24px;">
      <h2 style="color:#fff;">Invoice from ${store}</h2>
      <p>Invoice <span style="font-family:monospace;">${invoice.id}</span></p>
      <p>Amount due: ${amountLine}</p>
      ${paymentBlock}
      <p>Invoice expires: ${expiry}</p>
      <p><a href="${link}" style="color:#7c9cff;">Open your invoice page</a></p>
      <p style="color:#888;font-size:12px;">Keep this email — your purchase links live on the invoice page.</p>
    </div>`;

  return sendMail(invoice.customerEmail, `Complete your payment — ${store} invoice ${invoice.id.slice(0, 8)}`, html);
}

interface OrderLike {
  product?: { name: string } | null;
  deliveredContent?: string | null;
}

export async function sendFulfillmentEmail(invoice: InvoiceLike, orders: OrderLike[]): Promise<boolean> {
  const store = await getStoreName();
  const link = (process.env.NEXT_PUBLIC_APP_URL || '') + '/invoice/' + invoice.id;

  const items = orders
    .map(
      (o) => `<div style="margin-bottom:16px;">
        <h3 style="color:#fff;margin:0 0 8px;">${o.product?.name || 'Product'}</h3>
        <pre style="white-space:pre-wrap;font-family:monospace;background:#141414;padding:12px;border-radius:8px;color:#7ce38b;">${o.deliveredContent || 'Contact support with your invoice ID.'}</pre>
      </div>`
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#eee;background:#0a0a0a;border-radius:12px;padding:24px;">
      <h2 style="color:#fff;">Payment confirmed — ${store}</h2>
      <p>Thanks for your purchase! Here is everything you ordered:</p>
      ${items}
      <p><a href="${link}" style="color:#7c9cff;">Open your invoice page again</a></p>
    </div>`;

  return sendMail(invoice.customerEmail, `Payment confirmed — your ${store} order`, html);
}
