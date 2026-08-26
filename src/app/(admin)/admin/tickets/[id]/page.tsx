'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Loader2, Send, User, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

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
        body: JSON.stringify({ message: reply, sender: 'ADMIN' })
      });
      if (res.ok) {
        setReply('');
        fetchTicketAndMessages();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Are you sure you want to close this ticket?')) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/tickets/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' })
      });
      if (res.ok) {
        fetchTicketAndMessages();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClosing(false);
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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <Link href="/admin/tickets" className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-2 mb-4">
            &larr; Back to Tickets
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {ticket.subject}
            <span className={`px-3 py-1 text-xs font-bold rounded-lg uppercase ${ticket.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
              {ticket.status}
            </span>
          </h1>
          <div className="text-muted-foreground text-sm mt-2 flex gap-4">
            <span>Customer: <strong>{ticket.customer?.email}</strong></span>
            <span>Ticket ID: <code className="bg-muted px-1 rounded">{ticket.id}</code></span>
          </div>
        </div>
        
        {ticket.status === 'OPEN' && (
          <button 
            onClick={handleClose}
            disabled={closing}
            className="bg-muted text-foreground px-4 py-2 rounded-lg font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center gap-2"
          >
            {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Close Ticket
          </button>
        )}
      </div>

      <div className="bg-muted/10 border rounded-2xl p-6 min-h-[500px] flex flex-col">
        <div className="flex-1 space-y-6 overflow-y-auto mb-6 pr-2">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.sender === 'ADMIN' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'ADMIN' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {msg.sender === 'ADMIN' ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div className={`max-w-[80%] bg-card border rounded-2xl p-5 shadow-sm ${msg.sender === 'ADMIN' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
                <div className="text-xs text-muted-foreground mb-2 flex justify-between gap-4">
                  <span className="font-bold">{msg.sender === 'ADMIN' ? 'You (Admin)' : ticket.customer?.email}</span>
                  <span>{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                <div className="whitespace-pre-wrap text-sm">{msg.message}</div>
              </div>
            </div>
          ))}
        </div>

        {ticket.status === 'OPEN' ? (
          <form onSubmit={handleReply} className="bg-card border rounded-2xl p-4 shadow-sm flex gap-4 mt-auto">
            <textarea 
              required
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={3}
              className="flex-1 bg-background border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/50 outline-none resize-none"
              placeholder="Type your reply to the customer..."
            />
            <button 
              type="submit"
              disabled={sending || !reply.trim()}
              className="bg-primary text-primary-foreground px-8 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Reply
            </button>
          </form>
        ) : (
          <div className="text-center py-6 bg-muted/20 border rounded-xl text-muted-foreground mt-auto">
            This ticket has been closed.
          </div>
        )}
      </div>
    </div>
  );
}
