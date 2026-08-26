import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Star, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

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
    avgRating = product.reviews.reduce((acc, rev) => acc + rev.rating, 0) / product.reviews.length;
  }

  return (
    <div className="max-w-6xl mx-auto py-10">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-white/50 mb-10 font-medium tracking-wide">
        <Link href="/" className="hover:text-white transition-colors">STORE</Link>
        <ChevronRight className="w-4 h-4 mx-3 opacity-50" />
        {product.category && (
          <>
            <Link href={`/?category=${product.category.slug}`} className="hover:text-white transition-colors uppercase">
              {product.category.name}
            </Link>
            <ChevronRight className="w-4 h-4 mx-3 opacity-50" />
          </>
        )}
        <span className="text-white truncate uppercase">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
        {/* Left Column: Image */}
        <div className="lg:col-span-7 space-y-6">
          <div className="aspect-[4/3] rounded-3xl bg-[#0a0a0a] border border-white/5 shadow-2xl overflow-hidden relative group flex items-center justify-center">
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10 duration-500" />
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center flex-col text-white/30">
                <span className="font-bold text-2xl uppercase tracking-widest">{product.type}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-white/60 bg-[#0a0a0a] border border-white/5 p-5 rounded-2xl shadow-xl">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <p className="leading-relaxed">Secure checkout provided by our platform. Instant digital delivery upon payment confirmation.</p>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1.5 text-[0.7rem] font-bold bg-primary/20 text-primary border border-primary/20 rounded-md uppercase tracking-wider">
                {product.type}
              </span>
              <span className={`px-3 py-1.5 text-[0.7rem] font-bold rounded-md border flex items-center gap-1.5 uppercase tracking-wider ${inStock || isUnlimited ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                {inStock || isUnlimited ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {isUnlimited ? 'Unlimited Stock' : (inStock ? `${product.stock} in stock` : 'Out of Stock')}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6 text-white drop-shadow-sm leading-tight">{product.name}</h1>
            
            <div className="flex items-center gap-5 mb-8 pb-8 border-b border-white/10">
              <div className="text-4xl font-black text-white">
                ${Number(product.price).toFixed(2)}
              </div>
              
              {product.reviews.length > 0 && (
                <div className="flex items-center border-l border-white/10 pl-5">
                  <Star className="w-6 h-6 fill-yellow-500 text-yellow-500 mr-2" />
                  <span className="font-bold text-xl text-white">{avgRating.toFixed(1)}</span>
                  <span className="text-white/50 ml-2 font-medium">({product.reviews.length} reviews)</span>
                </div>
              )}
            </div>

            <div className="prose prose-invert prose-lg max-w-none text-white/70 font-light leading-relaxed mb-8">
              {(product.description || '').split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>

          <div className="mt-auto bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-50"></div>
            <form action={`/checkout`} method="GET" className="space-y-6">
              <input type="hidden" name="productId" value={product.id} />
              
              <div className="space-y-3">
                <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Quantity</label>
                <div className="flex items-center w-32 border border-white/10 rounded-xl bg-[#141414]">
                  <input 
                    type="number" 
                    name="quantity" 
                    defaultValue="1" 
                    min={product.minQuantity || 1} 
                    max={isUnlimited ? 100 : Math.min(product.maxQuantity || 100, product.stock)}
                    className="w-full text-center bg-transparent py-3 focus:outline-none font-bold text-white" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={!inStock && !isUnlimited}
                className="w-full py-4 rounded-xl font-bold text-lg bg-primary text-white shadow-[0_0_20px_rgba(var(--primary),0.4)] hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(var(--primary),0.6)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:-translate-y-0 disabled:shadow-none flex justify-center items-center gap-2"
              >
                {!inStock && !isUnlimited ? 'Out of Stock' : 'Purchase Now'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="border-t pt-12">
        <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
          Customer Reviews 
          <span className="text-muted-foreground text-lg font-normal">({product.reviews.length})</span>
        </h2>

        {product.reviews.length === 0 ? (
          <div className="text-center py-12 bg-card/30 rounded-2xl border border-dashed">
            <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-30" />
            <p className="text-muted-foreground text-lg">No reviews yet for this product.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {product.reviews.map(review => (
              <div key={review.id} className="bg-card border p-6 rounded-2xl">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted/50'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt || '').toLocaleDateString()}
                  </span>
                </div>
                {review.comment && <p className="text-sm/relaxed">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
