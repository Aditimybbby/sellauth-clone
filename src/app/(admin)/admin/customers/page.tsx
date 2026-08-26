import { db } from '@/lib/db';
import { runMigrations } from '@/lib/db/migrate';
import { customers } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import CustomersClient from './customers-client';

try { await runMigrations(); } catch {}

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const allCustomers = await db.query.customers.findMany({
    orderBy: [desc(customers.createdAt)],
  });

  return <CustomersClient customers={JSON.parse(JSON.stringify(allCustomers))} />;
}
