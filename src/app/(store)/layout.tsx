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

/** Convert #rrggbb to the "H S% L%" triplet consumed by the --primary CSS variable. */
function hexToHslTriplet(hex: string): string | null {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return `${Math.round(h * 60)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const storeName = await getSetting('store_name', 'Prime Store');
  const announcement = await getSetting('announcement', '');
  const accent = await getSetting('accent_color', '');
  const accentTriplet = hexToHslTriplet(accent);

  return (
    <div
      className="flex-wrapper bg-[#000000] text-white min-h-screen"
      style={accentTriplet ? ({ '--primary': accentTriplet } as React.CSSProperties) : undefined}
    >
      {announcement && (
        <div className="announcement">
          <span>{announcement}</span>
        </div>
      )}

      <nav className="navbar component" data-component-id="navbar">
        <div className="container">
          <div className="navbar-inner navbar-reveal">
            <Link className="navbar-brand" href="/">
              <Store className="h-7 w-7 text-white" />
              <span>{storeName}</span>
            </Link>

            <ul className="navbar-nav hidden min-[992px]:flex items-center mx-2 lg:mx-4">
              <li className="nav-item">
                <Link className="nav-link" href="/">Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" href="/customer/tickets">Support</Link>
              </li>
            </ul>

            <div className="ml-auto flex items-center gap-2">
              <span className="nav-separator hidden min-[992px]:block" aria-hidden="true"></span>
              <Link href="/customer" className="btn btn-outline-primary">My Account</Link>
              <div className="cart">
                <CartDrawer />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full">
        {children}
      </main>

      <footer className="mt-auto bg-[#0a0a0a] border-t border-white/10">
        <div className="container mx-auto py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 text-center sm:text-left">
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
              <Store className="h-5 w-5 text-white" />
              <span className="font-bold">{storeName}</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs mx-auto sm:mx-0 mb-0">
              Premium digital products delivered instantly. Pay with crypto, receive your keys in seconds.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-white/60 hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/customer" className="text-white/60 hover:text-white transition-colors">My Account</Link></li>
              <li><Link href="/customer/tickets" className="text-white/60 hover:text-white transition-colors">Support</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Payments</h4>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              {['Bitcoin', 'Litecoin', 'Test Pay'].map((p) => (
                <span
                  key={p}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 py-4">
          <p className="container mx-auto text-center text-white/40 text-sm mb-0">
            &copy; {new Date().getFullYear()} {storeName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
