import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { licenseKeys, products } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const keys = await db.select().from(licenseKeys).where(eq(licenseKeys.productId, id));
    return NextResponse.json(keys);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    let keysArray: string[] = [];
    
    if (Array.isArray(body.keys)) {
      keysArray = body.keys;
    } else if (typeof body.keys === 'string') {
      keysArray = body.keys.split('\n').map((k: string) => k.trim()).filter(Boolean);
    }

    if (keysArray.length === 0) {
      return NextResponse.json({ error: 'No keys provided' }, { status: 400 });
    }

    const insertData = keysArray.map((k: string) => ({
      productId: id,
      keyValue: k,
      isUsed: false,
      createdAt: new Date().toISOString(),
    }));

    await db.insert(licenseKeys).values(insertData);
    
    // Update product stock count
    await db.update(products).set({ 
      stock: sql`stock + ${keysArray.length}` 
    }).where(eq(products.id, id));

    return NextResponse.json({ success: true, count: keysArray.length }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to import keys' }, { status: 500 });
  }
}
