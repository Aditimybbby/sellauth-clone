import { db } from '@/lib/db';
import { runMigrations } from '@/lib/db/migrate';
import { products, orders, invoices, customers } from '@/lib/db/schema';
import { desc, sql, eq, lt, and, gte } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ShoppingCart, Users, Package, AlertTriangle } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';

// Ensure DB is initialized
try { await runMigrations(); } catch {}

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  // Stats
  const totalRevenue = await db
    .select({ total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
    .from(invoices)
    .where(eq(invoices.status, 'COMPLETED'));

  const totalOrders = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders);

  const totalCustomers = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(customers);

  const totalProducts = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(products);

  // Recent orders
  const recentOrders = await db.query.orders.findMany({
    with: { invoice: true, product: true },
    orderBy: [desc(orders.createdAt)],
    limit: 10,
  });

  // Low stock (unlimited-stock products are marked -1 and never run out)
  const lowStock = await db.query.products.findMany({
    where: and(gte(products.stock, 0), lt(products.stock, 10)),
    orderBy: [products.stock],
  });

  const stats = [
    {
      title: 'Total Revenue',
      value: formatPrice(totalRevenue[0]?.total || 0),
      icon: DollarSign,
      color: 'text-emerald-500',
    },
    {
      title: 'Total Orders',
      value: totalOrders[0]?.count?.toString() || '0',
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      title: 'Customers',
      value: totalCustomers[0]?.count?.toString() || '0',
      icon: Users,
      color: 'text-violet-500',
    },
    {
      title: 'Products',
      value: totalProducts[0]?.count?.toString() || '0',
      icon: Package,
      color: 'text-amber-500',
    },
  ];

  const statusVariant = (status: string) => {
    switch (status) {
      case 'FULFILLED': return 'success' as const;
      case 'PENDING': return 'warning' as const;
      case 'REFUNDED': case 'CANCELLED': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your store overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-3 px-2 font-medium">Invoice</th>
                      <th className="text-left py-3 px-2 font-medium">Product</th>
                      <th className="text-left py-3 px-2 font-medium">Amount</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-left py-3 px-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order: any) => (
                      <tr key={order.id} className="border-b border-border/50">
                        <td className="py-3 px-2 font-mono text-xs">
                          {order.invoiceId?.substring(0, 8)}...
                        </td>
                        <td className="py-3 px-2">{order.product?.name || 'N/A'}</td>
                        <td className="py-3 px-2">{formatPrice(order.totalPrice)}</td>
                        <td className="py-3 px-2">
                          <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {order.createdAt ? formatDate(order.createdAt) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">All products are well stocked</p>
            ) : (
              <div className="space-y-3">
                {lowStock.map((product: any) => (
                  <Link
                    key={product.id}
                    href={`/admin/products/new?edit=${product.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
                  >
                    <span className="text-sm font-medium">{product.name}</span>
                    <Badge variant={product.stock === 0 ? 'destructive' : 'warning'}>
                      {product.stock} left
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
