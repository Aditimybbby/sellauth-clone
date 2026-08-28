import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { runMigrations } from '@/lib/db/migrate';
import { customers } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import CustomersClient from './customers-client';

try { await runMigrations(); } catch {}

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  // Server-side auth check (the layout only guards client-side)
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin/login');

  const allCustomers = await db.query.customers.findMany({
    orderBy: [desc(customers.createdAt)],
  });

  return <CustomersClient customers={JSON.parse(JSON.stringify(allCustomers))} />;
}
