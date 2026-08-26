import { db } from '@/lib/db';
import { products, categories, reviews } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StorePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category: selectedCategory } = await searchParams;
  
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
    <>
      <section className="hero alignment-center height-medium component" data-component-id="hero">
        <div className="gradient-bg"></div>
        <div className="shapes-container">
          <img src="https://i.ibb.co/hRQSLmLk/3d-0.webp" className="elegant-shape shape-1" alt="Decorative shape" />
          <img src="https://i.ibb.co/M4JkzKd/3d-1.webp" className="elegant-shape shape-2" alt="Decorative shape" />
          <img src="https://i.ibb.co/Xxt3c2nt/3d-2.webp" className="elegant-shape shape-3" alt="Decorative shape" />
          <img src="https://i.ibb.co/YBV0n1Xh/3d-3.webp" className="elegant-shape shape-4" alt="Decorative shape" />
          <img src="https://i.ibb.co/hRQSLmLk/3d-0.webp" className="elegant-shape shape-5" alt="Decorative shape" />
        </div>
        <div className="bg-overlay"></div>
        <div className="container">
          <div className="content">
            <h1>
              <span className="title-line-1">Welcome to Our Store</span>
            </h1>
            <p>Great products don't have to be expensive, and we prove it by delivering high quality with fair, honest prices.</p>
            
            <div className="hero-stats mt-8">
              <div className="stat-item">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M234.5,114.38l-45.1,39.36,13.51,58.6a16,16,0,0,1-23.84,17.34l-51.11-31-51,31a16,16,0,0,1-23.84-17.34L66.61,153.8,21.5,114.38a16,16,0,0,1,9.11-28.06l59.46-5.15,23.21-55.36a15.95,15.95,0,0,1,29.44,0h0L166,81.17l59.44,5.15a16,16,0,0,1,9.11,28.06Z"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">5.0</div>
                  <div className="stat-label">Feedback Rating</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M216,64H176a48,48,0,0,0-96,0H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm88,168H40V80H80V96a8,8,0,0,0,16,0V80h64V96a8,8,0,0,0,16,0V80h40Z"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">1000+</div>
                  <div className="stat-label">Products Sold</div>
                </div>
              </div>
            </div>
          </div>
          <div></div>
        </div>
        <div className="bottom-fade"></div>
      </section>

      <div className="container py-20 component">
        <div className="section-title">
          <h2>Our Products</h2>
        </div>
        <div className="section-subtitle">
          <p>Check out our latest offerings below.</p>
        </div>

        {activeCategories.length > 0 && (
          <div className="chips justify-center">
            <Link 
              href="/"
              className={`btn ${!selectedCategory ? 'btn-primary' : 'btn-outline-primary'}`}
            >
              All Products
            </Link>
            {activeCategories.map(cat => (
              <Link 
                key={cat.id}
                href={`/?category=${cat.slug}`}
                className={`btn ${selectedCategory === cat.slug ? 'btn-primary' : 'btn-outline-primary'}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 products">
          {filteredProducts.map(product => {
            const inStock = product.stock > 0;
            const lowStock = inStock && product.stock <= 5;
            const isUnlimited = product.stock === -1;
            
            return (
              <div key={product.id} className="product-card-reveal is-revealed h-full">
                <Link
                  className="product-card text-decoration-none d-block h-full"
                  href={`/product/${product.slug}`}
                >
                  <div className="product-image-wrapper position-relative overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} className="product-image w-100 h-full object-cover" alt={product.name} />
                    ) : (
                      <div className="product-img-placeholder d-flex align-items-center justify-content-center h-full w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 256 256" opacity="0.3">
                          <path fill="currentColor" d="m222.72 67.91l-88-48.18a13.9 13.9 0 0 0-13.44 0l-88 48.18A14 14 0 0 0 26 80.18v95.64a14 14 0 0 0 7.28 12.27l88 48.18a13.92 13.92 0 0 0 13.44 0l88-48.18a14 14 0 0 0 7.28-12.27V80.18a14 14 0 0 0-7.28-12.27ZM127 30.25a2 2 0 0 1 1.92 0L212.51 76l-33.94 18.57l-84.52-46.26ZM122 223l-83-45.43a2 2 0 0 1-1-1.75V86.66l84 46ZM43.49 76l38.07-20.85l84.51 46.26L128 122.24ZM218 175.82a2 2 0 0 1-1 1.75L134 223v-90.36l36-19.71V152a6 6 0 0 0 12 0v-45.63l36-19.71Z" />
                        </svg>
                      </div>
                    )}
              
                    <div className="product-badges">
                      <div className="product-badge" style={{ backgroundColor: '#2563eb' }}>
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
                    
                    <div className="product-meta d-flex justify-content-between align-items-end">
                      <p className="product-price mb-0">
                        <span className="price-label d-block" style={{ opacity: 0, pointerEvents: 'none' }}>STARTING FROM</span>
                        <span className="current-price">${Number(product.price).toFixed(2)}</span>
                      </p>
                      
                      {isUnlimited ? (
                        <p className="product-stock stock-in mb-0 d-flex align-items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" className="me-1"><path d="M248,128a56,56,0,0,1-95.6,39.6l-.33-.35L92.12,99.55a40,40,0,1,0,0,56.9l8.52-9.62a8,8,0,1,1,12,10.61l-8.69,9.81-.33.35a56,56,0,1,1,0-79.2l.33.35,59.95,67.7a40,40,0,1,0,0-56.9l-8.52,9.62a8,8,0,1,1-12-10.61l8.69-9.81.33-.35A56,56,0,0,1,248,128Z"></path></svg>
                          In Stock
                        </p>
                      ) : inStock ? (
                        <p className={`product-stock mb-0 ${lowStock ? 'stock-low' : 'stock-in'}`}>
                          {product.stock} In Stock
                        </p>
                      ) : (
                        <p className="product-stock stock-out mb-0">Out of Stock</p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
