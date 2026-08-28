import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { slugify } from '@/lib/utils';

export async function GET() {
  try {
    const allCategories = await db.select().from(categories);
    const withCounts = await Promise.all(
      allCategories.map(async (cat) => {
        const catProducts = await db.query.products.findMany({
          where: eq(products.categoryId, cat.id),
          columns: { id: true },
        });
        return { ...cat, productCount: catProducts.length };
      })
    );
    return NextResponse.json(withCounts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const slug = slugify(name) || `category-${Date.now()}`;

    const [newCategory] = await db.insert(categories).values({
      name,
      slug,
      createdAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
