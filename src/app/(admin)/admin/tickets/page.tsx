'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, MessageSquare, ShieldCheck } from 'lucide-react';

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      // Pass admin=true to bypass customer session check for this prototype
      const res = await fetch('/api/tickets?admin=true');
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            Support Tickets
          </h1>
          <p className="text-muted-foreground mt-2">Manage customer inquiries and support requests.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 border rounded-2xl">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No support tickets found.</p>
        </div>
      ) : (
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Ticket ID</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Subject</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">{ticket.id.slice(0, 8)}...</td>
                  <td className="px-6 py-4">{ticket.customer?.email || 'Unknown'}</td>
                  <td className="px-6 py-4 font-medium">{ticket.subject}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md ${ticket.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(ticket.updatedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/tickets/${ticket.id}`} className="text-primary hover:underline font-medium">
                      View &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
