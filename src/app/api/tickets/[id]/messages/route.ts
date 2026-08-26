import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketMessages, tickets } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { cookies } from 'next/headers';

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
