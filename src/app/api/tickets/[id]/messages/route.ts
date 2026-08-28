import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketMessages, tickets } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const messages = await db.query.ticketMessages.findMany({
    where: eq(ticketMessages.ticketId, resolvedParams.id),
    orderBy: [asc(ticketMessages.createdAt)]
  });

  return NextResponse.json(messages);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const body = await request.json();
  const { message, sender = 'CUSTOMER' } = body;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  if (sender === 'ADMIN') {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    // Customer messages must come from the ticket owner's session.
    const cookieStore = await cookies();
    const session = cookieStore.get('customer_session');
    if (!session?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, resolvedParams.id),
      with: { customer: true },
    });
    if (!ticket || ticket.customer?.email?.toLowerCase() !== session.value.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await db.insert(ticketMessages).values({
    ticketId: resolvedParams.id,
    sender,
    message
  }).returning();

  // Update ticket updatedAt
  await db.update(tickets)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(tickets.id, resolvedParams.id));

  return NextResponse.json(result[0]);
}
