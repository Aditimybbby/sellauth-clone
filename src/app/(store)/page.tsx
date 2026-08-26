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
            className={"px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 " + (!selectedCategory ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.3)]' : 'bg-white/5 hover:bg-white/10 text-white/80')}
          >
            All Products
          </Link>
          {activeCategories.map(cat => (
            <Link 
              key={cat.id}
              href={"/?category=" + cat.slug}
              className={"px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 " + (selectedCategory === cat.slug ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.3)]' : 'bg-white/5 hover:bg-white/10 text-white/80')}
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
                  href={/product/ + product.slug}
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
                        <span className="current-price">${Number(product.price).toFixed(2)}</span>
                      </p>
                      
                      {isUnlimited ? (
                        <p className="product-stock stock-in mb-0 flex items-center text-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" className="mr-1"><path d="M248,128a56,56,0,0,1-95.6,39.6l-.33-.35L92.12,99.55a40,40,0,1,0,0,56.9l8.52-9.62a8,8,0,1,1,12,10.61l-8.69,9.81-.33.35a56,56,0,1,1,0-79.2l.33.35,59.95,67.7a40,40,0,1,0,0-56.9l-8.52,9.62a8,8,0,1,1-12-10.61l8.69-9.81.33-.35A56,56,0,0,1,248,128Z"></path></svg>
                          In Stock
                        </p>
                      ) : inStock ? (
                        <p className={"product-stock mb-0 text-xs " + (lowStock ? 'stock-low' : 'stock-in')}>
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

