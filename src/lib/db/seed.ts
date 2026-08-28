import { runMigrations } from './migrate';
import { db } from './index';
import { products, categories, licenseKeys, coupons } from './schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Idempotent seed: safe to run any number of times.
 * Looks up existing rows by slug/code instead of blind-inserting,
 * so re-running never violates foreign keys or duplicates data.
 */
async function seed() {
  console.log('Running migrations...');
  await runMigrations();

  console.log('Seeding database...');

  async function ensureCategory(name: string, slug: string) {
    const existing = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
    if (existing) return existing;
    const [row] = await db
      .insert(categories)
      .values({ id: nanoid(16), name, slug, createdAt: new Date().toISOString() })
      .returning();
    console.log(`  + category: ${name}`);
    return row;
  }

  async function ensureProduct(p: {
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    price: number;
    type: 'KEY' | 'FILE' | 'SERVICE';
    stock: number;
    categoryId: string;
  }) {
    const existing = await db.query.products.findFirst({ where: eq(products.slug, p.slug) });
    if (existing) return existing;
    const [row] = await db
      .insert(products)
      .values({
        ...p,
        visibility: 'PUBLIC',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();
    console.log(`  + product: ${p.name}`);
    return row;
  }

  async function ensureCoupon(c: {
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    maxUses: number;
  }) {
    const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, c.code) });
    if (existing) return existing;
    const [row] = await db
      .insert(coupons)
      .values({ ...c, usedCount: 0, isActive: true, createdAt: new Date().toISOString() })
      .returning();
    console.log(`  + coupon: ${c.code}`);
    return row;
  }

  const softwareCat = await ensureCategory('Software', 'software');
  const servicesCat = await ensureCategory('Services', 'services');

  const vpn = await ensureProduct({
    name: 'Premium VPN License',
    slug: 'premium-vpn-license',
    description:
      'Get lifetime access to our premium VPN service. Supports unlimited devices and 100+ server locations worldwide.',
    shortDescription: 'Lifetime VPN access key',
    price: 29.99,
    type: 'ACCOUNTS',
    stock: 50,
    categoryId: softwareCat.id,
  });

  await ensureProduct({
    name: 'Design Template Pack',
    slug: 'design-template-pack',
    description:
      'A collection of 50+ premium design templates for Figma and Adobe XD. Perfect for web and mobile projects.',
    shortDescription: '50+ premium design templates',
    price: 14.99,
    type: 'FILE',
    stock: 999,
    categoryId: softwareCat.id,
  });

  await ensureProduct({
    name: 'Custom Bot Development',
    slug: 'custom-bot-development',
    description:
      'We will build a custom Discord bot tailored to your server needs. Includes setup, hosting for 1 month, and documentation.',
    shortDescription: 'Custom Discord bot service',
    price: 49.99,
    type: 'TEXT',
    stock: 10,
    categoryId: servicesCat.id,
  });

  // Keep at least 50 keys available for the VPN product.
  const existingKeys = await db.query.licenseKeys.findMany({
    where: eq(licenseKeys.productId, vpn.id),
  });
  if (existingKeys.length < 50) {
    const toAdd = 50 - existingKeys.length;
    const keys = Array.from({ length: toAdd }, () => ({
      id: nanoid(16),
      productId: vpn.id,
      keyValue: `VPN-${nanoid(6).toUpperCase()}-${nanoid(6).toUpperCase()}-${nanoid(6).toUpperCase()}`,
      isUsed: false,
      createdAt: new Date().toISOString(),
    }));
    await db.insert(licenseKeys).values(keys);
    console.log(`  + ${toAdd} license keys`);
  }

  await ensureCoupon({ code: 'WELCOME10', discountType: 'PERCENTAGE', discountValue: 10, maxUses: 100 });
  await ensureCoupon({ code: 'SAVE5', discountType: 'FIXED', discountValue: 5, maxUses: 50 });

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
