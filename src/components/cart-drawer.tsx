'use client';

import { useCartStore } from '@/lib/cart-store';
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cart = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="btn">
        <svg xmlns="http://www.w3.org/2000/svg" className="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M7 22q-.825 0-1.412-.587T5 20t.588-1.412T7 18t1.413.588T9 20t-.587 1.413T7 22m10 0q-.825 0-1.412-.587T15 20t.588-1.412T17 18t1.413.588T19 20t-.587 1.413T17 22M6.15 6l2.4 5h7l2.75-5zM5.2 4h14.75q.575 0 .875.513t.025 1.037l-3.55 6.4q-.275.5-.737.775T15.55 13H8.1L7 15h11q.425 0 .713.288T19 16t-.288.713T18 17H7q-1.125 0-1.7-.987t-.05-1.963L6.6 11.6L3 4H2q-.425 0-.712-.288T1 3t.288-.712T2 2h1.625q.275 0 .525.15t.375.425zm3.35 7h7z"/></svg>
        {cart.items.length > 0 && (
          <span className="count">
            <span>{cart.items.length > 9 ? '9+' : cart.items.length}</span>
          </span>
        )}
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-background border-l z-50 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Shopping Cart</h2>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {cart.items.length === 0 ? (
            <div className="text-center text-muted-foreground mt-20 flex flex-col items-center gap-4">
              <ShoppingCart className="w-12 h-12 opacity-20" />
              <p>Your cart is empty.</p>
            </div>
          ) : (
            cart.items.map(item => (
              <div key={item.id} className="flex gap-4 items-center bg-card p-4 rounded-xl border hover:border-primary/50 transition-colors">
                <div className="flex-1">
                  <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                  <div className="text-sm font-medium text-primary mt-1">${item.price.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
                  <button onClick={() => cart.updateQuantity(item.id, Math.max(1, item.quantity - 1))} className="p-1 hover:bg-background rounded-md transition-colors"><Minus className="w-3 h-3"/></button>
                  <span className="w-4 text-center text-xs font-bold">{item.quantity}</span>
                  <button onClick={() => cart.updateQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-background rounded-md transition-colors"><Plus className="w-3 h-3"/></button>
                </div>
                <button onClick={() => cart.removeItem(item.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="pt-6 border-t mt-auto">
            <div className="flex justify-between font-bold mb-4 text-lg">
              <span>Total</span>
              <span>${cart.total().toFixed(2)}</span>
            </div>
            <Link href="/checkout" onClick={() => setIsOpen(false)} className="block w-full py-4 bg-primary text-primary-foreground text-center rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg hover:shadow-primary/25">
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
