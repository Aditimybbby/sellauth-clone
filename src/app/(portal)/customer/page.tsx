import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { customers, orders, products, licenseKeys } from '@/lib/db/schema';
import Link from 'next/link';
import { Package, Key, Ticket as TicketIcon } from 'lucide-react';

export default async function CustomerDashboard() {
  const cookieStore = await cookies();
  const session = cookieStore.get('customer_session');
  
  if (!session?.value) {
    redirect('/customer/login');
  }

  const email = session.value;

  // Find customer
  const customerRecord = await db.query.customers.findFirst({
    where: eq(customers.email, email),
  });

  if (!customerRecord) {
    // For prototype simplicity, if customer doesn't exist, we just show empty states.
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-8 mt-10">
        <div className="flex justify-between items-end border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {email}</h1>
            <p className="text-muted-foreground mt-2">Manage your purchases and support tickets.</p>
          </div>
          <Link href="/customer/tickets" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90">
            <TicketIcon className="w-4 h-4" />
            My Tickets
          </Link>
        </div>
        <div className="text-center py-20 text-muted-foreground">
          No orders found for this email.
        </div>
      </div>
    );
  }

  // Find orders with products and license keys
  const customerOrders = await db.query.orders.findMany({
    where: eq(orders.customerId, customerRecord.id),
    with: {
      product: true,
    },
    orderBy: (orders, { desc }) => [desc(orders.createdAt)],
  });

  // Fetch all license keys for these orders
  const orderIds = customerOrders.map(o => o.id);
  let keys: any[] = [];
  if (orderIds.length > 0) {
    // Drizzle currently doesn't support 'inArray' cleanly in query API without importing it, so we'll just fetch all or filter manually
    // Wait, let's just use `db.select().from(licenseKeys).where(inArray(licenseKeys.orderId, orderIds))`
  }
  
  // Let's do it simpler by fetching licenses manually if needed, but we can also use drizzle query
  const ordersWithKeys = await Promise.all(customerOrders.map(async (order) => {
    const orderKeys = await db.query.licenseKeys.findMany({
      where: eq(licenseKeys.orderId, order.id)
    });
    return { ...order, keys: orderKeys };
  }));

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 mt-10">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {email}</h1>
          <p className="text-muted-foreground mt-2">Manage your purchases and support tickets.</p>
        </div>
        <Link href="/customer/tickets" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90">
          <TicketIcon className="w-4 h-4" />
          Support Tickets
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Package className="w-6 h-6" />
          Order History
        </h2>
        
        {ordersWithKeys.length === 0 ? (
          <div className="text-center py-10 bg-muted/20 rounded-2xl border">
            <p className="text-muted-foreground">You have no past orders.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {ordersWithKeys.map((order) => (
              <div key={order.id} className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-muted/30 p-4 border-b flex flex-wrap gap-4 justify-between items-center">
                  <div>
                    <div className="text-sm text-muted-foreground">Order ID</div>
                    <div className="font-mono text-sm">{order.id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date</div>
                    <div className="text-sm">{new Date(order.createdAt!).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="text-sm font-bold">{order.status}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-sm font-bold">${order.totalPrice.toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-secondary rounded-xl flex items-center justify-center shrink-0">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{order.product?.name || 'Unknown Product'}</h3>
                      <p className="text-sm text-muted-foreground mb-4">Qty: {order.quantity}</p>
                      
                      {order.keys && order.keys.length > 0 && (
                        <div className="space-y-2 mt-4">
                          <h4 className="font-bold text-sm flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            License Keys
                          </h4>
                          <div className="grid gap-2">
                            {order.keys.map(k => (
                              <div key={k.id} className="bg-background border rounded-lg p-3 flex justify-between items-center">
                                <code className="font-mono text-sm bg-muted px-2 py-1 rounded">{k.keyValue}</code>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {order.deliveredContent && (
                        <div className="mt-4">
                          <h4 className="font-bold text-sm mb-2">Delivered Content</h4>
                          <div className="bg-muted/30 border rounded-lg p-4 text-sm whitespace-pre-wrap">
                            {order.deliveredContent}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
