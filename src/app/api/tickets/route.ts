import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tickets, customers, ticketMessages } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isAdmin = url.searchParams.get('admin') === 'true';

  if (isAdmin) {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const allTickets = await db.query.tickets.findMany({
      with: {
        customer: true
      },
      orderBy: [desc(tickets.updatedAt)]
    });
    return NextResponse.json(allTickets);
  }

  // Customer view
  const cookieStore = await cookies();
  const session = cookieStore.get('customer_session');

  if (session?.value) {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.email, session.value)
    });
    if (customer) {
      const myTickets = await db.query.tickets.findMany({
        where: eq(tickets.customerId, customer.id),
        orderBy: [desc(tickets.updatedAt)]
      });
      return NextResponse.json(myTickets);
    }
  }

  return NextResponse.json([]);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get('customer_session');
  if (!session?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let customer = await db.query.customers.findFirst({
    where: eq(customers.email, session.value)
  });

  if (!customer) {
    const result = await db.insert(customers).values({ email: session.value }).returning();
    customer = result[0];
  }

  const body = await request.json();
  const { subject, orderId, message } = body;

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
  }

  const result = await db.insert(tickets).values({
    customerId: customer.id,
    subject,
    orderId: orderId || null
  }).returning();

  const ticket = result[0];

  await db.insert(ticketMessages).values({
    ticketId: ticket.id,
    sender: 'CUSTOMER',
    message
  });

  return NextResponse.json(ticket);
}
