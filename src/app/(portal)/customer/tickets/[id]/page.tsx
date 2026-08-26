'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Loader2, Send, User, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTicketAndMessages = async () => {
    try {
      const [ticketRes, messagesRes] = await Promise.all([
        fetch(`/api/tickets/${resolvedParams.id}`),
        fetch(`/api/tickets/${resolvedParams.id}/messages`)
      ]);
      
      if (ticketRes.ok && messagesRes.ok) {
        setTicket(await ticketRes.json());
        setMessages(await messagesRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketAndMessages();
  }, [resolvedParams.id]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);

    try {
      const res = await fetch(`/api/tickets/${resolvedParams.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply, sender: 'CUSTOMER' })
      });
      if (res.ok) {
        setReply('');
        fetchTicketAndMessages(); // refresh
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return <div className="text-center py-20">Ticket not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 mt-10">
      <div className="mb-6">
        <Link href="/customer/tickets" className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-2 mb-4">
          &larr; Back to Tickets
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{ticket.subject}</h1>
            <p className="text-muted-foreground text-sm mt-1">Ticket ID: {ticket.id}</p>
          </div>
          <span className={`px-3 py-1 text-sm font-bold rounded-lg ${ticket.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
            {ticket.status}
          </span>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.sender === 'CUSTOMER' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'CUSTOMER' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
              {msg.sender === 'CUSTOMER' ? <User className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div className={`flex-1 bg-card border rounded-2xl p-5 shadow-sm ${msg.sender === 'CUSTOMER' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
              <div className="text-xs text-muted-foreground mb-2 flex justify-between">
                <span className="font-bold">{msg.sender === 'CUSTOMER' ? 'You' : 'Support Team'}</span>
                <span>{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <div className="whitespace-pre-wrap text-sm">{msg.message}</div>
            </div>
          </div>
        ))}
      </div>

      {ticket.status === 'OPEN' ? (
        <form onSubmit={handleReply} className="bg-card border rounded-2xl p-4 shadow-sm flex gap-4">
          <textarea 
            required
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={2}
            className="flex-1 bg-background border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none resize-none"
            placeholder="Type your reply here..."
          />
          <button 
            type="submit"
            disabled={sending || !reply.trim()}
            className="bg-primary text-primary-foreground px-6 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-all"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Send
          </button>
        </form>
      ) : (
        <div className="text-center py-6 bg-muted/20 border rounded-xl text-muted-foreground">
          This ticket is closed. You can no longer reply.
        </div>
      )}
    </div>
  );
}
