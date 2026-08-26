'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bitcoin, Loader2, ArrowRight, ShieldCheck, Tag } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');
  const initialQuantity = parseInt(searchParams.get('quantity') || '1');

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(initialQuantity);
  const [coin, setCoin] = useState('BTC');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState<{ type: string, value: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) {
      router.push('/');
      return;
    }

    // Mock fetch for now as API might not exist yet
    // In a real implementation: fetch(`/api/products/${productId}`)
    setLoading(true);
    setTimeout(() => {
      setProduct({
        id: productId,
        name: 'Premium Product',
        price: 19.99,
        type: 'KEY',
      });
      setLoading(false);
    }, 500);
  }, [productId, router]);

  const validateCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    // Mock coupon validation
    setTimeout(() => {
      if (couponCode === 'SAVE20') {
        setDiscount({ type: 'PERCENT', value: 20 });
      } else {
        setCouponError('Invalid coupon code');
        setDiscount(null);
      }
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setSubmitting(true);
    setError('');

    // Mock API call to create invoice
    try {
      // const res = await fetch('/api/invoices', { method: 'POST', body: JSON.stringify(...) });
      // const data = await res.json();
      
      setTimeout(() => {
        // Mock success redirect
        router.push(`/invoice/inv_mock_${Date.now()}`);
      }, 1500);
    } catch (err) {
      setError('Failed to create invoice. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) return null;

  const subtotal = product.price * quantity;
  let total = subtotal;
  if (discount) {
    if (discount.type === 'PERCENT') total = subtotal * (1 - discount.value / 100);
    else if (discount.type === 'FIXED') total = Math.max(0, subtotal - discount.value);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>
        <p className="text-muted-foreground mt-2">Complete your purchase securely.</p>
      </div>

      <div className="grid md:grid-cols-[1.5fr,1fr] gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Contact Information</h2>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-background border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
                <p className="text-xs text-muted-foreground mt-1">Your product will be sent to this email.</p>
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              <div className="grid grid-cols-2 gap-4">
                <label className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${coin === 'BTC' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="coin" value="BTC" checked={coin === 'BTC'} onChange={(e) => setCoin(e.target.value)} className="sr-only" />
                    <div className="w-10 h-10 rounded-full bg-[#F7931A]/20 flex items-center justify-center">
                      <Bitcoin className="w-6 h-6 text-[#F7931A]" />
                    </div>
                    <div className="font-bold">Bitcoin</div>
                  </div>
                </label>
                <label className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${coin === 'LTC' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="coin" value="LTC" checked={coin === 'LTC'} onChange={(e) => setCoin(e.target.value)} className="sr-only" />
                    <div className="w-10 h-10 rounded-full bg-[#345D9D]/20 flex items-center justify-center font-black text-[#345D9D]">
                      Ł
                    </div>
                    <div className="font-bold">Litecoin</div>
                  </div>
                </label>
              </div>
            </div>
            
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={submitting || !email}
              className="w-full py-4 rounded-xl font-bold text-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 group"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Pay with Crypto
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Secure, anonymous crypto payments
            </div>
          </form>
        </div>

        {/* Right Column - Summary */}
        <div>
          <div className="bg-card border rounded-2xl p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-6">Order Summary</h2>
            
            <div className="flex items-start gap-4 mb-6 pb-6 border-b">
              <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <Tag className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold leading-tight">{product.name}</h3>
                <div className="text-sm text-muted-foreground mt-1">Qty: {quantity} &times; ${product.price.toFixed(2)}</div>
              </div>
              <div className="font-bold">${subtotal.toFixed(2)}</div>
            </div>

            <div className="space-y-4 mb-6 pb-6 border-b">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Discount code" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button 
                  type="button"
                  onClick={validateCoupon}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium rounded-lg transition-colors"
                >
                  Apply
                </button>
              </div>
              {couponError && <p className="text-xs text-destructive">{couponError}</p>}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount && (
                <div className="flex justify-between text-emerald-500 font-medium">
                  <span>Discount</span>
                  <span>-${(subtotal - total).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black pt-4 border-t">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
