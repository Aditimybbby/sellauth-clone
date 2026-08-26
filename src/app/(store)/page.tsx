import { db } from '@/lib/db';
import { products, categories, reviews } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { Star, Package, FileKey, File, Wrench, Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

function getIconForType(type: string) {
  switch (type) {
    case 'KEY': return <FileKey className="w-8 h-8 text-primary/50" />;
    case 'FILE': return <File className="w-8 h-8 text-primary/50" />;
    case 'SERVICE': return <Wrench className="w-8 h-8 text-primary/50" />;
    default: return <Package className="w-8 h-8 text-primary/50" />;
  }
}

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

  // Filter by category if selected
  const filteredProducts = selectedCategory 
    ? allProducts.filter(p => p.category?.slug === selectedCategory)
    : allProducts;

  // Get unique categories that have public products
  const categoryMap = new Map();
  allProducts.forEach(p => {
    if (p.category) {
      categoryMap.set(p.category.id, p.category);
    }
  });
  const activeCategories = Array.from(categoryMap.values());

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-10 pb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-sm">Welcome to Our Store</h1>
        <p className="text-lg text-white/70 max-w-2xl mx-auto font-light leading-relaxed">
          Great products don't have to be expensive, and we prove it by delivering high quality with fair, honest prices.
        </p>
      </section>

      {/* Categories Filter */}
      {activeCategories.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link 
            href="/"
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${!selectedCategory ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.3)]' : 'bg-secondary hover:bg-secondary/80 text-white/80'}`}
          >
            All Products
          </Link>
          {activeCategories.map(cat => (
            <Link 
              key={cat.id}
              href={`/?category=${cat.slug}`}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${selectedCategory === cat.slug ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.3)]' : 'bg-secondary hover:bg-secondary/80 text-white/80'}`}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map(product => {
            const inStock = product.stock > 0;
            const lowStock = inStock && product.stock <= 5;
            const isUnlimited = product.stock === -1;
            
            let avgRating = 0;
            if (product.reviews.length > 0) {
              avgRating = product.reviews.reduce((acc, rev) => acc + rev.rating, 0) / product.reviews.length;
            }

            return (
              <Link key={product.id} href={`/product/${product.slug}`} className="group block h-full">
                <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden h-full flex flex-col transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_25px_rgba(101,113,255,0.15)] hover:-translate-y-1 relative">
                  
                  {/* Image Container */}
                  <div className="aspect-[4/3] bg-[#141414] relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10 duration-500" />
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      getIconForType(product.type)
                    )}
                    
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
                      <span className="bg-black/60 backdrop-blur-md border border-white/10 text-[0.7rem] font-bold px-3 py-1.5 rounded-md text-white uppercase tracking-wider">
                        {product.type}
                      </span>
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="p-5 flex-1 flex flex-col bg-gradient-to-b from-[#0a0a0a] to-[#050505] relative before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent">
                    <h3 className="font-semibold text-[1.1rem] leading-snug group-hover:text-white text-white/90 transition-colors line-clamp-2 mb-4">
                      {product.name}
                    </h3>
                    
                    <div className="flex items-end justify-between mt-auto">
                      <div className="flex flex-col">
                        <span className="text-[0.688rem] text-white/50 uppercase tracking-widest font-semibold mb-1 group-hover:text-white/70 transition-colors">Price</span>
                        <div className="font-bold text-xl text-white">
                          ${Number(product.price).toFixed(2)}
                        </div>
                      </div>
                      
                      <div>
                        {isUnlimited ? (
                           <span className="text-[0.813rem] uppercase tracking-wider font-semibold px-3 py-1.5 rounded-md border text-emerald-400 bg-emerald-400/10 border-emerald-400/30 group-hover:bg-emerald-400/15">
                            In Stock
                          </span>
                        ) : inStock ? (
                          <span className={`text-[0.813rem] uppercase tracking-wider font-semibold px-3 py-1.5 rounded-md border ${lowStock ? 'text-orange-400 bg-orange-400/10 border-orange-400/30 group-hover:bg-orange-400/15' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30 group-hover:bg-emerald-400/15'}`}>
                            {lowStock ? 'Low Stock' : 'In Stock'}
                          </span>
                        ) : (
                          <span className="text-[0.813rem] uppercase tracking-wider font-semibold px-3 py-1.5 rounded-md border text-red-400 bg-red-400/10 border-red-400/30 group-hover:bg-red-400/15">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
