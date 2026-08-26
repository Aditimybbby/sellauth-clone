import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, orders, products, licenseKeys, customers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const invoiceId = resolvedParams.id;

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoiceId),
    });

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    
    if (invoice.status === 'COMPLETED') {
      return NextResponse.json({ success: true, message: 'Already completed' });
    }

    const orderList = await db.query.orders.findMany({
      where: eq(orders.invoiceId, invoiceId),
      with: {
        product: true
      }
    });

    await db.update(invoices)
      .set({ status: 'COMPLETED', txHash: 'test_tx_' + Date.now(), paidAt: new Date().toISOString() })
      .where(eq(invoices.id, invoiceId));

    const allDeliveredContent: string[] = [];

    for (const order of orderList) {
      const product = order.product;
      let deliveredContent = '';

      if (product.type === 'KEY') {
        const availableKeys = await db.query.licenseKeys.findMany({
          where: (keys, { and, eq }) => and(eq(keys.productId, product.id), eq(keys.isUsed, false)),
          limit: order.quantity
        });

        const keysToDeliver = [];
        if (availableKeys.length >= order.quantity) {
          for (const key of availableKeys) {
            keysToDeliver.push(key.keyValue);
            await db.update(licenseKeys).set({ isUsed: true, orderId: order.id }).where(eq(licenseKeys.id, key.id));
          }
        } else if (product.stock === -1) {
          for (let i = 0; i < order.quantity; i++) {
            const fakeKey = TEST- + nanoid(10).toUpperCase();
            keysToDeliver.push(fakeKey);
          }
        } else {
           keysToDeliver.push("ERROR: Out of stock during fulfillment");
        }
        
        deliveredContent = keysToDeliver.join('\n');
      } else if (product.type === 'FILE') {
        deliveredContent = "Download Link: " + process.env.NEXT_PUBLIC_APP_URL + "/api/download/" + product.id;
      } else if (product.type === 'SERVICE') {
        deliveredContent = "Service Details: Please contact support with your invoice ID to begin service.";
      }

      await db.update(orders)
        .set({ status: 'FULFILLED', deliveredContent })
        .where(eq(orders.id, order.id));
        
      allDeliveredContent.push(Product:  + product.name + \n + deliveredContent);
      
      if (product.stock > 0) {
        await db.update(products).set({ stock: Math.max(0, product.stock - order.quantity) }).where(eq(products.id, product.id));
      }
    }

    if (invoice.customerId) {
       const customer = await db.query.customers.findFirst({ where: eq(customers.id, invoice.customerId) });
       if (customer) {
          await db.update(customers).set({ 
             totalSpent: customer.totalSpent + invoice.totalAmount,
             orderCount: customer.orderCount + 1 
          }).where(eq(customers.id, customer.id));
       }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Test Payment failed:', error);
    return NextResponse.json({ error: 'Failed to simulate payment' }, { status: 500 });
  }
}


