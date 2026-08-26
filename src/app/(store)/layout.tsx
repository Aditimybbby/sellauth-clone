import { db } from '@/lib/db';
import { runMigrations } from '@/lib/db/migrate';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { CartDrawer } from '@/components/cart-drawer';

try { await runMigrations(); } catch {}

export const dynamic = 'force-dynamic';

async function getSetting(key: string, defaultValue: string = '') {
  const result = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  return result?.value || defaultValue;
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const storeName = await getSetting('store_name', 'Prime Store');
  const announcement = await getSetting('announcement', '');

  return (
    <div className="flex-wrapper bg-[#000000] text-white min-h-screen">
      {announcement && (
        <div className="announcement">
          <span>{announcement}</span>
        </div>
      )}
      <nav className="navbar navbar-expand-lg component" data-component-id="navbar">
        <div className="container">
          <div className="navbar-inner navbar-reveal">
            
            <div className="d-flex justify-content-between align-items-center w-100 d-lg-none">
              <Link className="navbar-brand fw-bold" href="/">
                <Store className="h-7 w-7 text-white" />
                <span className="ms-2">{storeName}</span>
              </Link>
              <div className="d-flex align-items-center gap-2">
                <div className="cart">
                  <CartDrawer />
                </div>
              </div>
            </div>

            <div className="collapse navbar-collapse justify-content-center d-none d-lg-flex" id="navbarSupportedContent">
              <Link className="navbar-brand fw-bold" href="/">
                <Store className="h-7 w-7 text-white" />
                <span className="ms-2">{storeName}</span>
              </Link>

              <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">
                <li className="nav-item">
                  <Link className="nav-link" href="/">Home</Link>
                </li>
              </ul>
              
              <ul className="navbar-nav gap-2 align-items-lg-center ms-lg-auto">
                <li className="nav-separator d-none d-lg-block"></li>
                <li className="nav-item user">
                  <Link href="/customer" className="btn btn-outline-primary">My Account</Link>
                </li>
                <li className="nav-item cart d-none d-lg-block">
                  <CartDrawer />
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="flex-1 w-100">
        {children}
      </main>

      <footer className="footer py-5 mt-auto bg-[#0a0a0a] border-t border-white/10">
        <div className="container text-center">
          <p className="text-white/50 text-sm mb-0">
            &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
