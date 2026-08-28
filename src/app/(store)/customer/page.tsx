import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { customers, orders } from '@/lib/db/schema';
import Link from 'next/link';
import { Package, LogOut, Ticket as TicketIcon } from 'lucide-react';

export default async function CustomerDashboard() {
  const cookieStore = await cookies();
  const session = cookieStore.get('customer_session');

  if (!session?.value) {
    redirect('/customer/login');
  }

  const email = session.value;

  const customerRecord = await db.query.customers.findFirst({
    where: eq(customers.email, email),
  });

  const customerOrders = customerRecord ? await db.query.orders.findMany({
    where: eq(orders.customerId, customerRecord.id),
    with: {
      product: true,
      invoice: true
    }
  }) : [];

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome back</h1>
            <p className="text-white/50">{email}</p>
          </div>
          <Link href="/customer/logout" className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-semibold flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Purchase History</h2>
          </div>

          {customerOrders.length === 0 ? (
            <p className="text-white/40">You haven&apos;t made any purchases yet.</p>
          ) : (
            <div className="space-y-4">
              {customerOrders.map(order => (
                <div key={order.id} className="bg-[#141414] border border-white/10 p-4 rounded-2xl flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-white">{order.product?.name || 'Unknown Product'}</h3>
                    <p className="text-sm text-white/50">{new Date(order.createdAt!).toLocaleDateString()}</p>
                  </div>
                  <Link
                    href={`/invoice/${order.invoiceId}`}
                    className="text-primary hover:underline text-sm font-bold"
                  >
                    View Invoice
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <TicketIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Support Tickets</h2>
          </div>

          <div className="flex flex-col items-center justify-center py-10 bg-[#141414] border border-white/10 rounded-2xl text-center">
            <p className="text-white/40 mb-4">Need help with a purchase?</p>
            <Link
              href="/customer/tickets"
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl transition-colors"
            >
              Go to Support Center
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
