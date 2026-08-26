import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
  const resolvedParams = await params;
  const body = await request.json();
  const { status } = body;

  const result = await db.update(tickets)
    .set({ 
      status, 
      updatedAt: new Date().toISOString() 
    })
    .where(eq(tickets.id, resolvedParams.id))
    .returning();

  return NextResponse.json(result[0]);
}
