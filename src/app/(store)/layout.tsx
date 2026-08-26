import { db } from '@/lib/db';
import { runMigrations } from '@/lib/db/migrate';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { Store, User } from 'lucide-react';
import { CartDrawer } from '@/components/cart-drawer';

try { await runMigrations(); } catch {}

export const dynamic = 'force-dynamic';

async function getSetting(key: string, defaultValue: string = '') {
  const result = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  return result?.value || defaultValue;
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const storeName = await getSetting('store_name', 'Prime Store');
  const announcement = await getSetting('announcement', 'Welcome to our premium storefront!');

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-white">
      {announcement && (
        <div className="bg-primary/10 text-primary border-b border-primary/20 text-center py-2.5 px-4 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
          {announcement}
        </div>
      )}
      <header className="border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-extrabold text-xl tracking-tight text-white hover:text-white/80 transition-colors">
            <Store className="h-7 w-7 text-primary" />
            {storeName}
          </Link>
          
          <nav className="flex items-center gap-6">
            <Link href="/customer" className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white transition-colors">
              <User className="w-4 h-4" />
              <span>Portal</span>
            </Link>
            <div className="w-px h-5 bg-white/10"></div>
            <CartDrawer />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        {children}
      </main>
      <footer className="border-t border-white/5 py-8 text-center text-sm font-medium text-white/30 bg-[#050505]">
        &copy; {new Date().getFullYear()} {storeName}. Powered by SellAuth Clone.
      </footer>
    </div>
  );
}
