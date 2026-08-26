import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { code, productId } = await req.json();
    if (!code) return NextResponse.json({ valid: false, message: 'Code required' }, { status: 400 });

    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code));
    if (!coupon || !coupon.isActive) return NextResponse.json({ valid: false, message: 'Invalid coupon' });
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return NextResponse.json({ valid: false, message: 'Coupon expired' });
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return NextResponse.json({ valid: false, message: 'Coupon fully used' });
    if (coupon.productId && coupon.productId !== productId) return NextResponse.json({ valid: false, message: 'Coupon not valid for this product' });

    return NextResponse.json({
      valid: true,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 });
  }
}
