'use client';

import { useState } from 'react';
import { Search, Eye, Filter } from 'lucide-react';

export default function OrdersClient({ orders }: { orders: any[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.email && order.customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.product?.name && order.product.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by ID, email, or product..."
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="rounded-md border bg-transparent px-3 py-2 text-sm h-[42px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="REFUNDED">Refunded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-4 font-medium">Order ID</th>
              <th className="p-4 font-medium">Customer Email</th>
              <th className="p-4 font-medium">Product</th>
              <th className="p-4 font-medium">Qty</th>
              <th className="p-4 font-medium">Amount</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No orders found
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="p-4 font-mono text-xs">{order.id.substring(0, 8)}...</td>
                  <td className="p-4">{order.customer?.email || 'N/A'}</td>
                  <td className="p-4">{order.product?.name || 'Unknown'}</td>
                  <td className="p-4">{order.quantity || 1}</td>
                  <td className="p-4">${(order.totalPrice ?? 0).toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold
                      ${order.status === 'FULFILLED' ? 'border-green-500 text-green-500' :
                        order.status === 'PENDING' ? 'border-yellow-500 text-yellow-500' :
                        'border-red-500 text-red-500'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
