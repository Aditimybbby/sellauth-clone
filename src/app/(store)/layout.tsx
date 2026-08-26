import { db } from '@/lib/db';
import { runMigrations } from '@/lib/db/migrate';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { Store } from 'lucide-react';

try { await runMigrations(); } catch {}

export const dynamic = 'force-dynamic';

async function getSetting(key: string, defaultValue: string = '') {
  const result = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  return result?.value || defaultValue;
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const storeName = await getSetting('store_name', 'My Store');
  const announcement = await getSetting('announcement', '');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {announcement && (
        <div className="bg-primary text-primary-foreground text-center py-2 px-4 text-sm font-medium">
          {announcement}
        </div>
      )}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Store className="h-6 w-6 text-primary" />
            {storeName}
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {children}
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} {storeName}. Powered by SellAuth Clone.
      </footer>
    </div>
  );
}
