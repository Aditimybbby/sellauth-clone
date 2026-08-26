'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Plus, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const router = useRouter();

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    setSubmitting(true);
    
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message })
      });
      if (res.ok) {
        const newTicket = await res.json();
        router.push(`/customer/tickets/${newTicket.id}`);
      }
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <div className="flex gap-4">
          <Link href="/customer" className="text-muted-foreground hover:text-foreground py-2">
            Back to Portal
          </Link>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-card border rounded-2xl p-6 mb-8 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Create New Ticket</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <input 
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-background border rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="What do you need help with?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <textarea 
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                className="w-full bg-background border rounded-lg px-4 py-2 mt-1 focus:ring-2 focus:ring-primary/50 outline-none"
                placeholder="Describe your issue in detail..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Ticket
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 border rounded-2xl">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">You don't have any support tickets yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => (
            <Link 
              key={ticket.id} 
              href={`/customer/tickets/${ticket.id}`}
              className="block bg-card border rounded-xl p-5 hover:border-primary/50 transition-colors shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{ticket.subject}</h3>
                <span className={`px-2 py-1 text-xs font-bold rounded-md ${ticket.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                  {ticket.status}
                </span>
              </div>
              <div className="text-sm text-muted-foreground flex gap-4">
                <span>ID: {ticket.id}</span>
                <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
