import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { fulfillInvoice } from '@/lib/fulfillment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const invoiceId = resolvedParams.id;

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    if (invoice.status === 'COMPLETED') {
      return NextResponse.json({ success: true, message: 'Already completed' });
    }

    // Security: only TEST (mock) invoices may be "paid" by the customer.
    // Real crypto invoices complete via payment detection / the webhook,
    // or manually by an admin.
    const isTest = (invoice.cryptoCurrency || '').toUpperCase() === 'TEST';
    if (!isTest) {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json(
          { error: 'Only test invoices can be simulated. Real invoices complete automatically when payment is detected.' },
          { status: 401 }
        );
      }
    }

    const result = await fulfillInvoice(invoiceId, 'test_tx_' + Date.now(), 0);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Test Payment failed:', error);
    return NextResponse.json({ error: 'Failed to simulate payment' }, { status: 500 });
  }
}
