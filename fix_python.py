import os

checkout_code = '''
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
'''

product_code = '''
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Star, AlertCircle, CheckCircle2, ShieldCheck, Box, Tag, ShoppingCart } from 'lucide-react';
import { AddToCartButton } from './add-to-cart-button';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      category: true,
      reviews: {
        orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
      },
    }
  });

  if (!product || product.visibility === 'HIDDEN') {
    notFound();
  }

  const inStock = product.stock > 0;
  const isUnlimited = product.stock === -1;
  const availableStock = isUnlimited ? 999 : product.stock;
  
  let avgRating = 0;
  if (product.reviews.length > 0) {
    avgRating = product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length;
  }

  return (
    <div className="py-8">
      <div className="flex items-center gap-2 text-sm text-white/40 mb-8 font-semibold uppercase tracking-widest">
        <Link href="/" className="hover:text-white transition-colors">Store</Link>
        <ChevronRight className="w-4 h-4" />
        {product.category && (
          <>
            <Link href={/?category=\} className="hover:text-white transition-colors">{product.category.name}</Link>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
        <span className="text-primary truncate">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-12">
        <div className="space-y-8">
          {product.imageUrl ? (
            <div className="rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative aspect-[16/9] group">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white font-bold text-sm">
                  <Tag className="w-4 h-4 text-primary" />
                  {product.type}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/5 shadow-2xl aspect-[16/9] bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-[#0a0a0a] to-[#0a0a0a]"></div>
              <Box className="w-32 h-32 text-white/10 transition-transform duration-700 group-hover:scale-110" />
            </div>
          )}

          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/5 pb-4">Product Description</h2>
            {product.description ? (
              <div className="prose prose-invert max-w-none text-white/70 leading-relaxed font-medium">
                {product.description}
              </div>
            ) : (
              <p className="text-white/40 italic">No description provided for this product.</p>
            )}
          </div>
        </div>

        <div>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl sticky top-24">
            <h1 className="text-4xl font-black tracking-tight text-white mb-4 leading-tight">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5">
              <div className="flex gap-1 text-primary">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={w-5 h-5 \} />
                ))}
              </div>
              <span className="text-white/40 text-sm font-semibold">{product.reviews.length} reviews</span>
            </div>

            <div className="mb-8">
              <div className="text-sm font-bold text-white/40 uppercase tracking-widest mb-2">Price</div>
              <div className="text-5xl font-black text-white flex items-center gap-4">
                \
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-[#141414] border border-white/5 rounded-2xl">
                <span className="text-white/60 font-semibold">Availability</span>
                {isUnlimited ? (
                  <span className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-400/10 px-3 py-1.5 rounded-lg border border-emerald-400/20">
                    <CheckCircle2 className="w-4 h-4" />
                    In Stock
                  </span>
                ) : inStock ? (
                  <span className={lex items-center gap-2 font-bold px-3 py-1.5 rounded-lg border \}>
                    {product.stock <= 5 ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {product.stock} In Stock
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-red-400 font-bold bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20">
                    <AlertCircle className="w-4 h-4" />
                    Out of Stock
                  </span>
                )}
              </div>
            </div>

            <AddToCartButton 
              product={{
                id: product.id,
                name: product.name,
                price: product.price,
                stock: availableStock
              }}
              inStock={inStock || isUnlimited} 
              maxQuantity={availableStock} 
              minQuantity={product.minQuantity || 1}
            />

            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-emerald-400/80 font-bold bg-emerald-400/10 py-3 rounded-xl border border-emerald-400/20">
              <ShieldCheck className="w-5 h-5" />
              Instant Secure Delivery
            </div>
          </div>
        </div>
      </div>
      
      {/* Reviews Section */}
      {product.reviews.length > 0 && (
        <div className="mt-16 bg-[#0a0a0a] border border-white/5 rounded-3xl p-10 shadow-2xl">
          <h2 className="text-2xl font-bold mb-8 text-white border-b border-white/5 pb-4">Customer Reviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {product.reviews.map((review) => (
              <div key={review.id} className="bg-[#141414] border border-white/5 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-bold text-white">{review.customerEmail.split('@')[0]}***</div>
                  <div className="flex text-primary">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={w-4 h-4 \} />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-white/70 italic text-sm">{review.comment}</p>
                )}
                <div className="text-xs text-white/30 mt-4 uppercase tracking-widest font-bold">
                  {new Date(review.createdAt!).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
'''

store_page_code = '''
import { db } from '@/lib/db';
import { products, categories, reviews } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StorePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category: selectedCategory } = await searchParams;
  
  // Fetch all public products with relations
  const allProducts = await db.query.products.findMany({
    where: eq(products.visibility, 'PUBLIC'),
    with: {
      category: true,
      reviews: true,
    },
    orderBy: [desc(products.createdAt)],
  });

  const categoryMap = new Map();
  allProducts.forEach(p => {
    if (p.category) {
      if (!categoryMap.has(p.category.id)) categoryMap.set(p.category.id, p.category);
    }
  });

  const filteredProducts = selectedCategory 
    ? allProducts.filter(p => p.category?.slug === selectedCategory)
    : allProducts;

  const activeCategories = Array.from(categoryMap.values());

  return (
    <div className="container py-20 component">
      <div className="section-title scroll-reveal revealed">
        <h2 className="drop-shadow-sm">Welcome to Our Store</h2>
      </div>
      <div className="section-subtitle scroll-reveal revealed">
        <p>Great products don't have to be expensive, and we prove it by delivering high quality with fair, honest prices.</p>
      </div>

      {/* Categories Filter */}
      {activeCategories.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <Link 
            href="/"
            className={px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 \}
          >
            All Products
          </Link>
          {activeCategories.map(cat => (
            <Link 
              key={cat.id}
              href={/?category=\}
              className={px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 \}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-24 bg-[#0a0a0a] rounded-2xl border border-white/5 shadow-2xl">
          <Search className="w-12 h-12 mx-auto text-white/30 mb-5" />
          <h3 className="text-2xl font-semibold mb-2 text-white">No products found</h3>
          <p className="text-white/50">Check back later for new inventory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 products">
          {filteredProducts.map(product => {
            const inStock = product.stock > 0;
            const lowStock = inStock && product.stock <= 5;
            const isUnlimited = product.stock === -1;
            
            return (
              <div key={product.id} className="product-card-reveal is-revealed h-full">
                <Link
                  className="product-card text-decoration-none d-block"
                  href={/product/\}
                >
                  <div className="product-image-wrapper position-relative overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} className="product-image w-100 object-cover w-full h-full" alt={product.name} />
                    ) : (
                      <div className="product-img-placeholder flex items-center justify-center h-full w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 256 256" opacity="0.3" className="text-white">
                          <path fill="currentColor" d="m222.72 67.91l-88-48.18a13.9 13.9 0 0 0-13.44 0l-88 48.18A14 14 0 0 0 26 80.18v95.64a14 14 0 0 0 7.28 12.27l88 48.18a13.92 13.92 0 0 0 13.44 0l88-48.18a14 14 0 0 0 7.28-12.27V80.18a14 14 0 0 0-7.28-12.27ZM127 30.25a2 2 0 0 1 1.92 0L212.51 76l-33.94 18.57l-84.52-46.26ZM122 223l-83-45.43a2 2 0 0 1-1-1.75V86.66l84 46ZM43.49 76l38.07-20.85l84.51 46.26L128 122.24ZM218 175.82a2 2 0 0 1-1 1.75L134 223v-90.36l36-19.71V152a6 6 0 0 0 12 0v-45.63l36-19.71Z" />
                        </svg>
                      </div>
                    )}
              
                    <div className="product-badges">
                      <div className="product-badge" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                        <span>{product.type}</span>
                      </div>
                    </div>
                    
                    <div className="product-overlay">
                      <div className="overlay-content">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"></circle>
                          <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <span>View Details</span>
                      </div>
                    </div>
                  </div>
              
                  <div className="product-info">
                    <h5 className="product-title text-white">{product.name}</h5>
                    
                    <div className="product-meta flex justify-between items-end">
                      <p className="product-price mb-0">
                        <span className="price-label d-block" style={{ opacity: 0, pointerEvents: 'none' }}>STARTING FROM</span>
                        <span className="current-price">\</span>
                      </p>
                      
                      {isUnlimited ? (
                        <p className="product-stock stock-in mb-0 flex items-center text-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" className="mr-1"><path d="M248,128a56,56,0,0,1-95.6,39.6l-.33-.35L92.12,99.55a40,40,0,1,0,0,56.9l8.52-9.62a8,8,0,1,1,12,10.61l-8.69,9.81-.33.35a56,56,0,1,1,0-79.2l.33.35,59.95,67.7a40,40,0,1,0,0-56.9l-8.52,9.62a8,8,0,1,1-12-10.61l8.69-9.81.33-.35A56,56,0,0,1,248,128Z"></path></svg>
                          In Stock
                        </p>
                      ) : inStock ? (
                        <p className={product-stock mb-0 text-xs \}>
                          {product.stock} In Stock
                        </p>
                      ) : (
                        <p className="product-stock stock-out mb-0 text-xs">Out of Stock</p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
'''

with open('src/app/(store)/checkout/page.tsx', 'w', encoding='utf-8') as f:
    f.write(checkout_code)
with open('src/app/(store)/product/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(product_code)
with open('src/app/(store)/page.tsx', 'w', encoding='utf-8') as f:
    f.write(store_page_code)
