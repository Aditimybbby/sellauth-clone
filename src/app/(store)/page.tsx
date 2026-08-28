import { db } from '@/lib/db';
import { products, orders, reviews } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Search, Star, PackageOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

const TYPE_BADGE_COLORS: Record<string, string> = {
  KEY: '#2563eb',
  FILE: '#7c3aed',
  SERVICE: '#059669',
};

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest' },
  { key: 'price-asc', label: 'Price ↑' },
  { key: 'price-desc', label: 'Price ↓' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['key'];

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>;
}) {
  const { category: selectedCategory, q: rawQuery, sort } = await searchParams;
  const query = (rawQuery || '').trim();
  const sortKey: SortKey = sort === 'price-asc' || sort === 'price-desc' ? sort : 'newest';

  const allProducts = await db.query.products.findMany({
    where: eq(products.visibility, 'PUBLIC'),
    with: {
      category: true,
      reviews: true,
    },
    orderBy: [sql`datetime(${products.createdAt}) DESC`],
  });

  const allReviews = await db.query.reviews.findMany();
  const [soldRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${orders.quantity}), 0)` })
    .from(orders)
    .where(eq(orders.status, 'FULFILLED'));
  const [listedRow] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(products)
    .where(eq(products.visibility, 'PUBLIC'));

  // Real store stats (no hardcoded numbers).
  const avgRating = allReviews.length
    ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
    : null;
  const soldTotal = Number(soldRow?.total || 0);
  const listedCount = Number(listedRow?.count || 0);

  const categoryMap = new Map<string, { id: string; name: string; slug: string }>();
  allProducts.forEach((p) => {
    if (p.category && !categoryMap.has(p.category.id)) {
      categoryMap.set(p.category.id, { id: p.category.id, name: p.category.name, slug: p.category.slug });
    }
  });
  const activeCategories = Array.from(categoryMap.values());

  let filtered = allProducts;
  if (selectedCategory) filtered = filtered.filter((p) => p.category?.slug === selectedCategory);
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || (p.shortDescription || '').toLowerCase().includes(q)
    );
  }
  if (sortKey === 'price-asc') filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sortKey === 'price-desc') filtered = [...filtered].sort((a, b) => b.price - a.price);

  const buildHref = (over: { category?: string | null; q?: string | null; sort?: string | null }) => {
    const params = new URLSearchParams();
    const cat = 'category' in over ? over.category : selectedCategory;
    const qq = 'q' in over ? over.q : query;
    const ss = 'sort' in over ? over.sort : sortKey === 'newest' ? null : sortKey;
    if (cat) params.set('category', cat);
    if (qq) params.set('q', qq);
    if (ss) params.set('sort', ss);
    const str = params.toString();
    return str ? `/?${str}` : '/';
  };

  const hasActiveFilters = Boolean(selectedCategory || query);

  return (
    <>
      <section className="hero alignment-center height-medium component" data-component-id="hero">
        <div className="gradient-bg"></div>
        <div className="shapes-container">
          <img src="https://i.ibb.co/hRQSLmLk/3d-0.webp" className="elegant-shape shape-1" alt="" />
          <img src="https://i.ibb.co/M4JkzKd/3d-1.webp" className="elegant-shape shape-2" alt="" />
          <img src="https://i.ibb.co/Xxt3c2nt/3d-2.webp" className="elegant-shape shape-3" alt="" />
          <img src="https://i.ibb.co/YBV0n1Xh/3d-3.webp" className="elegant-shape shape-4" alt="" />
          <img src="https://i.ibb.co/hRQSLmLk/3d-0.webp" className="elegant-shape shape-5" alt="" />
        </div>
        <div className="bg-overlay"></div>
        <div className="container">
          <div className="content">
            <h1>
              <span className="title-line-1">Welcome to Our Store</span>
            </h1>
            <p>
              Great products don&apos;t have to be expensive, and we prove it by delivering high
              quality with fair, honest prices.
            </p>

            <form action="/" method="get" className="hero-search" role="search">
              {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
              {sortKey !== 'newest' && <input type="hidden" name="sort" value={sortKey} />}
              <Search className="h-4 w-4 shrink-0 text-white/50" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search products..."
                aria-label="Search products"
              />
              <button type="submit" className="hero-search-btn">Search</button>
            </form>

            <div className="hero-stats">
              <div className="stat-item">
                <div className="stat-icon">
                  <Star className="h-5 w-5" fill="currentColor" />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{avgRating ?? '—'}</div>
                  <div className="stat-label">Feedback Rating</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256" className="h-5 w-5">
                    <path d="M216,64H176a48,48,0,0,0-96,0H40A16,16,0,0,0,24,80V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64ZM128,32a32,32,0,0,1,32,32H96A32,32,0,0,1,128,32Zm88,168H40V80H80V96a8,8,0,0,0,16,0V80h64V96a8,8,0,0,0,16,0V80h40Z"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{soldTotal}</div>
                  <div className="stat-label">Products Sold</div>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 256 256" className="h-5 w-5">
                    <path d="M222.72,67.91l-88-48.18a13.9,13.9,0,0,0-13.44,0l-88,48.18A14,14,0,0,0,26,80.18v95.64a14,14,0,0,0,7.28,12.27l88,48.18a13.92,13.92,0,0,0,13.44,0l88-48.18a14,14,0,0,0,7.28-12.27V80.18A14,14,0,0,0,222.72,67.91Z"></path>
                  </svg>
                </div>
                <div className="stat-content">
                  <div className="stat-value">{listedCount}</div>
                  <div className="stat-label">Products Listed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bottom-fade"></div>
      </section>

      <div className="container mx-auto py-16">
        <div className="section-title">
          <h2>Our Products</h2>
        </div>
        <div className="section-subtitle">
          <p>Check out our latest offerings below.</p>
        </div>

        {query && (
          <p className="text-sm text-white/50 mb-4">
            Showing results for <span className="text-white font-semibold">&ldquo;{query}&rdquo;</span>{' '}
            — <Link href={buildHref({ q: null })} className="text-primary hover:underline">clear search</Link>
          </p>
        )}

        {activeCategories.length > 0 && (
          <div className="chips">
            <Link href={buildHref({ category: null })} className={`btn ${!selectedCategory ? 'btn-primary' : 'btn-outline-primary'}`}>
              All Products
            </Link>
            {activeCategories.map((cat) => (
              <Link
                key={cat.id}
                href={buildHref({ category: cat.slug })}
                className={`btn ${selectedCategory === cat.slug ? 'btn-primary' : 'btn-outline-primary'}`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-white/40 mr-1">Sort</span>
          {SORT_OPTIONS.map((opt) => (
            <Link
              key={opt.key}
              href={buildHref({ sort: opt.key === 'newest' ? null : opt.key })}
              className={`btn text-sm ${sortKey === opt.key ? 'btn-primary' : 'btn-outline-primary'}`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-white/10 bg-white/[0.02]">
            <PackageOpen className="w-14 h-14 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No products found</h3>
            <p className="text-white/40 mb-6">
              {hasActiveFilters
                ? 'Try a different search term or category.'
                : 'New products are coming soon. Check back shortly!'}
            </p>
            {hasActiveFilters && (
              <Link href="/" className="btn btn-primary">
                Clear Filters
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 products">
            {filtered.map((product) => {
              const inStock = product.stock > 0;
              const lowStock = inStock && product.stock <= 5;
              const isUnlimited = product.stock === -1;

              return (
                <div key={product.id} className="product-card-reveal is-revealed h-full">
                  <Link className="product-card block h-full no-underline" href={`/product/${product.slug}`}>
                    <div className="product-image-wrapper relative overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          className="product-image w-full h-full object-cover"
                          alt={product.name}
                        />
                      ) : (
                        <div className="product-img-placeholder flex items-center justify-center h-full w-full">
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 256 256" opacity="0.3">
                            <path fill="currentColor" d="m222.72 67.91l-88-48.18a13.9 13.9 0 0 0-13.44 0l-88 48.18A14 14 0 0 0 26 80.18v95.64a14 14 0 0 0 7.28 12.27l88 48.18a13.92 13.92 0 0 0 13.44 0l88-48.18a14 14 0 0 0 7.28-12.27V80.18a14 14 0 0 0-7.28-12.27ZM127 30.25a2 2 0 0 1 1.92 0L212.51 76l-33.94 18.57l-84.52-46.26ZM122 223l-83-45.43a2 2 0 0 1-1-1.75V86.66l84 46ZM43.49 76l38.07-20.85l84.51 46.26L128 122.24ZM218 175.82a2 2 0 0 1-1 1.75L134 223v-90.36l36-19.71V152a6 6 0 0 0 12 0v-45.63l36-19.71Z" />
                          </svg>
                        </div>
                      )}

                      <div className="product-badges">
                        <div className="product-badge" style={{ backgroundColor: TYPE_BADGE_COLORS[product.type] || '#2563eb' }}>
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
                          <span className="current-price">${Number(product.price).toFixed(2)}</span>
                        </p>

                        {isUnlimited ? (
                          <p className="product-stock stock-in mb-0 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" className="mr-1"><path d="M248,128a56,56,0,0,1-95.6,39.6l-.33-.35L92.12,99.55a40,40,0,1,0,0,56.9l8.52-9.62a8,8,0,1,1,12,10.61l-8.69,9.81-.33.35a56,56,0,1,1,0-79.2l.33.35,59.95,67.7a40,40,0,1,0,0-56.9l-8.52,9.62a8,8,0,1,1-12-10.61l8.69-9.81.33-.35A56,56,0,0,1,248,128Z"></path></svg>
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
        )}
      </div>
    </>
  );
}
