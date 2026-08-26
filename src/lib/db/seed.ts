import { runMigrations } from './migrate';
import { db } from './index';
import { products, categories, licenseKeys, coupons } from './schema';
import { nanoid } from 'nanoid';

async function seed() {
  console.log('Running migrations...');
  await runMigrations();

  console.log('Seeding database...');

  // Categories
  const softwareCat = { id: nanoid(16), name: 'Software', slug: 'software', createdAt: new Date().toISOString() };
  const accountsCat = { id: nanoid(16), name: 'Accounts', slug: 'accounts', createdAt: new Date().toISOString() };
  const servicesCat = { id: nanoid(16), name: 'Services', slug: 'services', createdAt: new Date().toISOString() };

  await db.insert(categories).values([softwareCat, accountsCat, servicesCat]).onConflictDoNothing();

  // Products
  const prod1Id = nanoid(16);
  const prod2Id = nanoid(16);
  const prod3Id = nanoid(16);

  await db.insert(products).values([
    {
      id: prod1Id,
      name: 'Premium VPN License',
      slug: 'premium-vpn-license',
      description: 'Get lifetime access to our premium VPN service. Supports unlimited devices and 100+ server locations worldwide.',
      shortDescription: 'Lifetime VPN access key',
      price: 29.99,
      type: 'KEY',
      stock: 50,
      visibility: 'PUBLIC',
      categoryId: softwareCat.id,
    },
    {
      id: prod2Id,
      name: 'Design Template Pack',
      slug: 'design-template-pack',
      description: 'A collection of 50+ premium design templates for Figma and Adobe XD. Perfect for web and mobile projects.',
      shortDescription: '50+ premium design templates',
      price: 14.99,
      type: 'FILE',
      stock: 999,
      visibility: 'PUBLIC',
      categoryId: softwareCat.id,
    },
    {
      id: prod3Id,
      name: 'Custom Bot Development',
      slug: 'custom-bot-development',
      description: 'We will build a custom Discord bot tailored to your server needs. Includes setup, hosting for 1 month, and documentation.',
      shortDescription: 'Custom Discord bot service',
      price: 49.99,
      type: 'SERVICE',
      stock: 10,
      visibility: 'PUBLIC',
      categoryId: servicesCat.id,
    },
  ]).onConflictDoNothing();

  // License Keys for VPN product
  const keys = Array.from({ length: 50 }, () => ({
    id: nanoid(16),
    productId: prod1Id,
    keyValue: `VPN-${nanoid(6).toUpperCase()}-${nanoid(6).toUpperCase()}-${nanoid(6).toUpperCase()}`,
    isUsed: false,
    createdAt: new Date().toISOString(),
  }));

  await db.insert(licenseKeys).values(keys).onConflictDoNothing();

  // Coupons
  await db.insert(coupons).values([
    {
      id: nanoid(16),
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxUses: 100,
      usedCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: nanoid(16),
      code: 'SAVE5',
      discountType: 'FIXED',
      discountValue: 5,
      maxUses: 50,
      usedCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ]).onConflictDoNothing();

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch(console.error);
