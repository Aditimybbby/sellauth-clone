import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq, like, and } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const visibility = searchParams.get('visibility');
    const search = searchParams.get('search');

    const conditions = [];
    if (visibility) {
      conditions.push(eq(products.visibility, visibility as any));
    }
    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }

    const allProducts = await db.select().from(products).where(conditions.length > 0 ? and(...conditions) : undefined);
    return NextResponse.json(allProducts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    // Clean up empty strings for nullable relations
    const insertData = { ...body, slug };
    if (!insertData.categoryId) delete insertData.categoryId;
    if (!insertData.imageUrl) delete insertData.imageUrl;

    const [newProduct] = await db.insert(products).values({
      ...insertData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
