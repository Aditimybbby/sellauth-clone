import { db } from '@/lib/db';
import { runMigrations } from '@/lib/db/migrate';
import { products } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import ProductsClient from './products-client';

try { await runMigrations(); } catch {}

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const allProducts = await db.query.products.findMany({
    with: { category: true },
    orderBy: [desc(products.createdAt)],
  });

  return <ProductsClient products={JSON.parse(JSON.stringify(allProducts))} />;
}
