import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { runMigrations } from '@/lib/db/migrate';
import { orders } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import OrdersClient from './orders-client';

try { await runMigrations(); } catch {}

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  // Server-side auth check (the layout only guards client-side)
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin/login');

  const allOrders = await db.query.orders.findMany({
    with: { 
      product: true,
      customer: true
    },
    orderBy: [desc(orders.createdAt)],
  });

  return <OrdersClient orders={JSON.parse(JSON.stringify(allOrders))} />;
}
