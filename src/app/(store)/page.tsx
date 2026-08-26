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
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-4 py-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Welcome to Our Store</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Browse our collection of digital products, premium keys, and professional services.
        </p>
      </section>

      {/* Categories Filter */}
      {activeCategories.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link 
            href="/"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'}`}
          >
            All Products
          </Link>
          {activeCategories.map(cat => (
            <Link 
              key={cat.id}
              href={`/?category=${cat.slug}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat.slug ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'}`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-24 bg-card/30 rounded-xl border border-dashed">
          <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-medium mb-2">No products found</h3>
          <p className="text-muted-foreground">Check back later for new inventory.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => {
            const inStock = product.stock > 0;
            const lowStock = inStock && product.stock <= 5;
            
            let avgRating = 0;
            if (product.reviews.length > 0) {
              avgRating = product.reviews.reduce((acc, rev) => acc + rev.rating, 0) / product.reviews.length;
            }

            return (
              <Link key={product.id} href={`/product/${product.slug}`} className="group block h-full">
                <div className="bg-card border rounded-xl overflow-hidden h-full flex flex-col transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                  {/* Image Placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-secondary/50 to-secondary flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10" />
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      getIconForType(product.type)
                    )}
                    
                    {/* Badges */}
                    <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
                      <span className="bg-background/80 backdrop-blur text-xs font-semibold px-2 py-1 rounded shadow-sm">
                        {product.type}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 z-20">
                      <span className={`text-xs font-bold px-2 py-1 rounded shadow-sm text-white ${inStock ? (lowStock ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-destructive'}`}>
                        {inStock ? (lowStock ? 'Low Stock' : 'In Stock') : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="font-black text-lg shrink-0">
                        ${Number(product.price).toFixed(2)}
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
                      {product.description}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                      <div className="flex items-center text-sm">
                        {avgRating > 0 ? (
                          <>
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500 mr-1.5" />
                            <span className="font-medium">{avgRating.toFixed(1)}</span>
                            <span className="text-muted-foreground ml-1">({product.reviews.length})</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">No reviews</span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-muted-foreground">
                        {product.category?.name || 'Uncategorized'}
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
