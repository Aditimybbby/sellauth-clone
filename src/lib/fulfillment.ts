import { db } from '@/lib/db';
import { invoices, orders, products, licenseKeys, customers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { sendFulfillmentEmail } from '@/lib/email';

/**
 * Marks an invoice COMPLETED and delivers everything the customer bought:
 * assigns license keys, builds download links, delivers static product
 * content, decrements stock and updates customer stats. Shared by the
 * mock-payment endpoint, the BlockCypher webhook and the payment polling
 * so every path fulfils identically.
 */
export async function fulfillInvoice(invoiceId: string, txHash?: string, confirmations = 0) {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, invoiceId),
  });
  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status === 'COMPLETED') {
    return { alreadyCompleted: true, deliveredItems: 0 };
  }

  await db.update(invoices)
    .set({
      status: 'COMPLETED',
      txHash: txHash || 'tx_' + Date.now(),
      confirmations,
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(invoices.id, invoiceId));

  const orderList = await db.query.orders.findMany({
    where: eq(orders.invoiceId, invoiceId),
    with: { product: true },
  });

  let deliveredItems = 0;
  const delivered: { product: { name: string } | null; content: string }[] = [];

  for (const order of orderList) {
    const product = order.product;
    if (!product) continue;
    let deliveredContent = '';
    const staticContent = (product.deliveredContent || '').trim();

    if (product.type === 'KEY') {
      const availableKeys = await db.query.licenseKeys.findMany({
        where: (keys, { and, eq }) => and(eq(keys.productId, product.id), eq(keys.isUsed, false)),
        limit: order.quantity,
      });

      const keysToDeliver: string[] = [];
      if (availableKeys.length >= order.quantity) {
        for (const key of availableKeys) {
          keysToDeliver.push(key.keyValue);
          await db.update(licenseKeys).set({ isUsed: true, orderId: order.id }).where(eq(licenseKeys.id, key.id));
        }
        deliveredContent = keysToDeliver.join('\n');
      } else if (staticContent) {
        // No unique keys left — deliver the product's static content instead
        deliveredContent = staticContent;
      } else if (product.stock === -1) {
        for (let i = 0; i < order.quantity; i++) {
          keysToDeliver.push('TEST-' + nanoid(10).toUpperCase());
        }
        deliveredContent = keysToDeliver.join('\n');
      } else {
        deliveredContent = 'ERROR: Out of stock during fulfillment';
      }
    } else if (product.type === 'FILE') {
      if (product.filePath) {
        deliveredContent = 'Download Link: ' + (process.env.NEXT_PUBLIC_APP_URL || '') + product.filePath;
      } else if (staticContent) {
        deliveredContent = staticContent;
      } else {
        deliveredContent = 'File delivery: please contact support with your invoice ID to receive your file.';
      }
    } else if (product.type === 'SERVICE') {
      deliveredContent = staticContent || 'Service Details: Please contact support with your invoice ID to begin service.';
    }

    await db.update(orders)
      .set({ status: 'FULFILLED', deliveredContent, updatedAt: new Date().toISOString() })
      .where(eq(orders.id, order.id));

    if (product.stock > 0) {
      await db.update(products)
        .set({ stock: Math.max(0, product.stock - order.quantity) })
        .where(eq(products.id, product.id));
    }

    delivered.push({ product: { name: product.name }, content: deliveredContent });
    deliveredItems++;
  }

  if (invoice.customerId) {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, invoice.customerId),
    });
    if (customer) {
      await db.update(customers)
        .set({
          totalSpent: customer.totalSpent + invoice.totalAmount,
          orderCount: customer.orderCount + 1,
        })
        .where(eq(customers.id, customer.id));
    }
  }

  // Email the delivered keys / links to the customer (no-op when SMTP unset)
  sendFulfillmentEmail(
    {
      id: invoice.id,
      customerEmail: invoice.customerEmail,
      totalAmount: invoice.totalAmount,
      cryptoAmount: invoice.cryptoAmount,
      cryptoCurrency: invoice.cryptoCurrency,
      paymentAddress: invoice.paymentAddress,
      expiresAt: invoice.expiresAt,
    },
    delivered
  ).catch(() => {});

  return { alreadyCompleted: false, deliveredItems };
}
