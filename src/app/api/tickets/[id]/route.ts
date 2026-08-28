import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.id, resolvedParams.id),
    with: {
      customer: true
    }
  });

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  return NextResponse.json(ticket);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const body = await request.json();
  const { status } = body;

  if (status !== 'OPEN' && status !== 'CLOSED') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const result = await db.update(tickets)
    .set({
      status,
      updatedAt: new Date().toISOString()
    })
    .where(eq(tickets.id, resolvedParams.id))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}
