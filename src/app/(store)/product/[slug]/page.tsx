import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Star, AlertCircle, CheckCircle2, ShieldCheck, Box, Tag } from 'lucide-react';
import { AddToCartButton } from './add-to-cart-button';

const TYPE_LABELS: Record<string, string> = {
  ACCOUNTS: 'Accounts', TEXT: 'Text', FILE: 'File', LINKS: 'Links', KEY: 'Accounts', SERVICE: 'Service',
};

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
            <Link href={`/?category=${product.category.slug}`} className="hover:text-white transition-colors">{product.category.name}</Link>
            <ChevronRight className="w-4 h-4" />
          </>
        )}
        <span className="text-primary truncate">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12">
        <div className="space-y-8">
          {product.imageUrl ? (
            <div className="rounded-3xl overflow-hidden border border-white/5 shadow-2xl relative aspect-[16/9] group">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white font-bold text-sm">
                  <Tag className="w-4 h-4 text-primary" />
                  {TYPE_LABELS[product.type] || product.type}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/5 shadow-2xl aspect-[16/9] bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.10),#0a0a0a_70%)]"></div>
              <Box className="w-32 h-32 text-white/10 transition-transform duration-700 group-hover:scale-110" />
            </div>
          )}

          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-white border-b border-white/5 pb-4">Product Description</h2>
            {product.description ? (
              <div className="whitespace-pre-wrap break-words text-white/70 leading-relaxed font-medium">
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
                  <Star key={star} className={`w-5 h-5 ${star <= Math.round(avgRating) ? 'fill-current' : 'text-white/10 fill-transparent'}`} />
                ))}
              </div>
              <span className="text-white/40 text-sm font-semibold">{product.reviews.length} reviews</span>
            </div>

            <div className="mb-8">
              <div className="text-sm font-bold text-white/40 uppercase tracking-widest mb-2">Price</div>
              <div className="text-5xl font-black text-white flex items-center gap-4">
                ${product.price.toFixed(2)}
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
                  <span className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg border ${product.stock <= 5 ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'}`}>
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
                      <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'fill-current' : 'text-white/10 fill-transparent'}`} />
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
