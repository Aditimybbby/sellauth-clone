'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

export default function CustomersClient({ customers }: { customers: any[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = customers.filter((customer) =>
    customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
      </div>

      <div className="flex items-center gap-2 rounded-md border px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by email..."
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Total Spent</th>
              <th className="p-4 font-medium">Order Count</th>
              <th className="p-4 font-medium">Joined Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  No customers found
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                  <td className="p-4 font-medium">{customer.email}</td>
                  <td className="p-4">${(customer.totalSpent || 0).toFixed(2)}</td>
                  <td className="p-4">{customer.orderCount || 0}</td>
                  <td className="p-4">{new Date(customer.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
