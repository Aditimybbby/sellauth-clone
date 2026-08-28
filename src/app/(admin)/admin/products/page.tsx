import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { runMigrations } from '@/lib/db/migrate';
import { products } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import ProductsClient from './products-client';

try { await runMigrations(); } catch {}

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  // Server-side auth check (the layout only guards client-side)
  const session = await getServerSession(authOptions);
  if (!session) redirect('/admin/login');

  const allProducts = await db.query.products.findMany({
    with: { category: true },
    orderBy: [desc(products.createdAt)],
  });

  return <ProductsClient products={JSON.parse(JSON.stringify(allProducts))} />;
}
