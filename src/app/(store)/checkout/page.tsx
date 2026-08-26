
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bitcoin, Loader2, ArrowRight, ShieldCheck, Tag, CreditCard } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const initialQuantity = parseInt(searchParams.get('quantity') || '1');
  const cart = useCartStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [email, setEmail] = useState('');
  const [coin, setCoin] = useState('TEST'); // Defaulting to TEST based on request
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState<{ type: string, value: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadDirectProduct = async () => {
      if (productId) {
        setLoading(true);
        try {
          const res = await fetch(/api/products/\);
          if (res.ok) {
            const prod = await res.json();
            cart.clearCart();
            cart.addItem({
              id: prod.id,
              name: prod.name,
              price: prod.price,
              quantity: initialQuantity
            });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        if (cart.items.length === 0) {
          router.push('/');
        }
      }
    };
    
    loadDirectProduct();
  }, [productId, mounted]);

  const validateCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, items: cart.items.map(i => ({ productId: i.id, quantity: i.quantity })) })
      });
      const data = await res.json();
      if (res.ok) {
        setDiscount({ type: data.discountType, value: data.discountValue });
      } else {
        setCouponError(data.error || 'Invalid coupon');
        setDiscount(null);
      }
    } catch {
      setCouponError('Error validating coupon');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        items: cart.items.map(item => ({ productId: item.id, quantity: item.quantity })),
        email,
        coin,
        couponCode: couponCode && discount ? couponCode : undefined
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create invoice');
      }

      cart.clearCart();
      router.push(/invoice/\);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice. Please try again.');
      setSubmitting(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="text-center py-20 text-white">
        <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
        <button onClick={() => router.push('/')} className="text-primary hover:underline">
          Go back to store
        </button>
      </div>
    );
  }

  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let total = subtotal;
  if (discount) {
    if (discount.type === 'PERCENTAGE') {
      total = subtotal - (subtotal * (discount.value / 100));
    } else {
      total = Math.max(0, subtotal - discount.value);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-4xl font-extrabold mb-10 text-white tracking-tight">Checkout</h1>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <div className="bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl shadow-xl mb-8">
            <h2 className="text-xl font-bold mb-6 text-white">Order Summary</h2>
            <div className="space-y-4 mb-6">
              {cart.items.map(item => (
                <div key={item.id} className="flex justify-between items-center pb-4 border-b border-white/5">
                  <div className="flex-1">
                    <div className="font-semibold text-white/90">{item.name}</div>
                    <div className="text-sm text-white/40">Qty: {item.quantity}</div>
                  </div>
                  <div className="font-bold text-white">\</div>
                </div>
              ))}
            </div>

            <div className="flex justify-between mb-2 text-white/60 font-medium">
              <span>Subtotal</span>
              <span>\</span>
            </div>

            {discount && (
              <div className="flex justify-between mb-2 text-emerald-400 font-medium">
                <span>Discount</span>
                <span>-{discount.type === 'PERCENTAGE' ? \% : \$\}</span>
              </div>
            )}

            <div className="flex justify-between mt-6 pt-6 border-t border-white/10 text-2xl font-black text-white">
              <span>Total</span>
              <span>\</span>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-3xl shadow-xl">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Have a coupon code?"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full bg-[#141414] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <button 
                type="button"
                onClick={validateCoupon}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors"
              >
                Apply
              </button>
            </div>
            {couponError && <p className="text-red-400 text-sm mt-3">{couponError}</p>}
          </div>
        </div>

        <div>
          <form onSubmit={handleSubmit} className="bg-[#0a0a0a] border border-white/5 p-8 rounded-3xl shadow-xl sticky top-24">
            <h2 className="text-xl font-bold mb-6 text-white">Payment Details</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#141414] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Where should we send your order?"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCoin('TEST')}
                    className={lex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all \}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="font-bold">Test Pay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoin('BTC')}
                    className={lex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all \}
                  >
                    <Bitcoin className="w-5 h-5" />
                    <span className="font-bold">Bitcoin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoin('LTC')}
                    className={lex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all \}
                  >
                    <span className="font-bold">L</span>
                    <span className="font-bold">Litecoin</span>
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 rounded-xl font-bold text-lg bg-primary text-white shadow-[0_0_20px_rgba(var(--primary),0.4)] hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(var(--primary),0.6)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Complete Order
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-emerald-400/80 font-medium mt-4 bg-emerald-400/10 py-3 rounded-lg border border-emerald-400/20">
                <ShieldCheck className="w-4 h-4" />
                Secure, encrypted checkout
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
