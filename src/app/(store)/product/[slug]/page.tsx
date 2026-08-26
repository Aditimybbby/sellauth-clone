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
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">Store</Link>
        <ChevronRight className="w-4 h-4 mx-2" />
        {product.category && (
          <>
            <Link href={`/?category=${product.category.slug}`} className="hover:text-foreground transition-colors">
              {product.category.name}
            </Link>
            <ChevronRight className="w-4 h-4 mx-2" />
          </>
        )}
        <span className="text-foreground truncate">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
        {/* Left Column: Image */}
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl bg-secondary/30 border overflow-hidden relative">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center flex-col text-muted-foreground">
                <span className="font-medium text-lg opacity-50">{product.type}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground bg-card p-4 rounded-xl border">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <p>Secure checkout provided by SellAuth Clone. Instant delivery upon payment confirmation.</p>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="flex flex-col">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 text-xs font-bold bg-primary/10 text-primary rounded-md">
                {product.type}
              </span>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 ${inStock || isUnlimited ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                {inStock || isUnlimited ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {isUnlimited ? 'Unlimited Stock' : (inStock ? `${product.stock} in stock` : 'Out of Stock')}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-6 pb-6 border-b">
              <div className="text-3xl font-black text-primary">
                ${Number(product.price).toFixed(2)}
              </div>
              
              {product.reviews.length > 0 && (
                <div className="flex items-center border-l pl-4">
                  <Star className="w-5 h-5 fill-yellow-500 text-yellow-500 mr-2" />
                  <span className="font-bold text-lg">{avgRating.toFixed(1)}</span>
                  <span className="text-muted-foreground ml-1.5">({product.reviews.length} reviews)</span>
                </div>
              )}
            </div>

            <div className="prose prose-invert max-w-none text-muted-foreground mb-8">
              {(product.description || '').split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>

          <div className="mt-auto bg-card border rounded-2xl p-6 shadow-sm">
            <form action={`/checkout`} method="GET" className="space-y-4">
              <input type="hidden" name="productId" value={product.id} />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <div className="flex items-center w-32 border rounded-lg bg-background">
                  <input 
                    type="number" 
                    name="quantity" 
                    defaultValue="1" 
                    min={product.minQuantity || 1} 
                    max={isUnlimited ? 100 : Math.min(product.maxQuantity || 100, product.stock)}
                    className="w-full text-center bg-transparent py-2 focus:outline-none font-medium" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={!inStock && !isUnlimited}
                className="w-full py-4 rounded-xl font-bold text-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {!inStock && !isUnlimited ? 'Out of Stock' : 'Buy Now'}
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
