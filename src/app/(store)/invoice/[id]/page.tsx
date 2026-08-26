'use client';

import { useEffect, useState, use } from 'react';
import { Copy, CheckCircle2, Clock, XCircle, Loader2, Download, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type InvoiceStatus = 'PENDING' | 'DETECTED' | 'CONFIRMING' | 'COMPLETED' | 'EXPIRED' | 'PARTIALLY_PAID';

interface InvoiceData {
  id: string;
  totalAmount: number;
  cryptoAmount: string;
  cryptoCurrency: string;
  paymentAddress: string;
  status: InvoiceStatus;
  confirmations: number;
  expiresAt: string;
  deliveredContent?: string;
  txHash?: string;
  orders?: Array<{
    product: { name: string; type: string };
    quantity: number;
  }>;
}

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'address' | 'amount' | 'keys' | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showReview, setShowReview] = useState(false);

  // Fetch invoice data
  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`/api/invoices/${id}`);
        if (!res.ok) throw new Error('Invoice not found');
        const data = await res.json();
        setInvoice(data);
        setLoading(false);
      } catch {
        setError('Invoice not found');
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [id]);

  // Poll for status updates
  useEffect(() => {
    if (!invoice || invoice.status === 'COMPLETED' || invoice.status === 'EXPIRED') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/invoices/${id}/status`);
        if (res.ok) {
          const data = await res.json();
          setInvoice(prev => prev ? { ...prev, ...data } : prev);
        }
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, [id, invoice?.status]);

  // Countdown timer
  useEffect(() => {
    if (!invoice?.expiresAt) return;
    const expiresAt = new Date(invoice.expiresAt).getTime();

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [invoice?.expiresAt]);

  const copyToClipboard = async (text: string, type: 'address' | 'amount' | 'keys') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const submitReview = async () => {
    if (!invoice?.orders?.[0]) return;
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: invoice.orders[0].product?.name,
          rating: reviewRating,
          comment: reviewComment,
          customerEmail: '',
        }),
      });
      setShowReview(false);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground">This invoice doesn&apos;t exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = {
    PENDING: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Awaiting Payment', pulse: true },
    DETECTED: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Payment Detected', pulse: false },
    CONFIRMING: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: `Confirming (${invoice.confirmations}/2)`, pulse: false },
    COMPLETED: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Payment Complete!', pulse: false },
    EXPIRED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Invoice Expired', pulse: false },
    PARTIALLY_PAID: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Partially Paid', pulse: true },
  };

  const currentStatus = statusConfig[invoice.status] || statusConfig.PENDING;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Status Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${currentStatus.bg}`}>
              <StatusIcon className={`h-8 w-8 ${currentStatus.color} ${currentStatus.pulse ? 'animate-pulse' : ''} ${invoice.status === 'DETECTED' || invoice.status === 'CONFIRMING' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${currentStatus.color}`}>{currentStatus.label}</h1>
              <p className="text-sm text-muted-foreground mt-1">Invoice #{invoice.id.substring(0, 8)}...</p>
            </div>

            {/* Countdown */}
            {(invoice.status === 'PENDING' || invoice.status === 'DETECTED') && timeLeft > 0 && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                <span className="text-sm">remaining</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Section - shown when not completed/expired */}
      {(invoice.status === 'PENDING' || invoice.status === 'DETECTED' || invoice.status === 'CONFIRMING') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-sm font-medium text-muted-foreground">
              Send exactly this amount
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-bold font-mono">{invoice.cryptoAmount}</span>
                <Badge variant="secondary" className="uppercase">{invoice.cryptoCurrency}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">${invoice.totalAmount.toFixed(2)} USD</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => copyToClipboard(invoice.cryptoAmount || '', 'amount')}
              >
                {copied === 'amount' ? <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied === 'amount' ? 'Copied!' : 'Copy amount'}
              </Button>
            </div>

            {/* QR Code Placeholder */}
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center p-2">
                <div className="w-full h-full bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                  QR Code
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground text-center block">
                Payment Address
              </label>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border">
                <code className="flex-1 text-xs break-all font-mono">{invoice.paymentAddress}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => copyToClipboard(invoice.paymentAddress || '', 'address')}
                >
                  {copied === 'address' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Section - shown when completed */}
      {invoice.status === 'COMPLETED' && invoice.deliveredContent && (
        <Card className="border-emerald-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Your Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invoice.orders?.[0]?.product?.type === 'FILE' ? (
              <Button className="w-full" asChild>
                <a href={invoice.deliveredContent} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </a>
              </Button>
            ) : invoice.orders?.[0]?.product?.type === 'SERVICE' ? (
              <div className="p-4 rounded-lg bg-accent/50 text-center">
                <p className="text-sm text-muted-foreground">Your order is being processed. You&apos;ll receive an email when it&apos;s ready.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {invoice.deliveredContent.split('\n').map((key: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border font-mono text-sm">
                      <span className="flex-1 break-all">{key}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => copyToClipboard(key, 'keys')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => copyToClipboard(invoice.deliveredContent || '', 'keys')}
                >
                  {copied === 'keys' ? <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" /> : <Copy className="h-4 w-4 mr-2" />}
                  Copy All Keys
                </Button>
              </>
            )}

            {/* Review Button */}
            {!showReview && (
              <Button variant="secondary" className="w-full" onClick={() => setShowReview(true)}>
                <Star className="h-4 w-4 mr-2" />
                Leave a Review
              </Button>
            )}

            {showReview && (
              <div className="space-y-3 p-4 rounded-lg border">
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setReviewRating(star)}>
                      <Star className={`h-6 w-6 ${star <= reviewRating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full p-2 rounded-md border bg-transparent text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Leave a comment (optional)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
                <Button className="w-full" onClick={submitReview}>Submit Review</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expired state */}
      {invoice.status === 'EXPIRED' && (
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">This invoice has expired. Please create a new order.</p>
            <Button asChild>
              <a href="/">Back to Store</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {invoice.orders?.map((order: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span>{order.product?.name || 'Product'} × {order.quantity}</span>
                <span className="font-medium">${invoice.totalAmount.toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>Total</span>
              <span>{invoice.cryptoAmount} {invoice.cryptoCurrency?.toUpperCase()}</span>
            </div>
            {invoice.txHash && (
              <div className="border-t pt-2">
                <span className="text-muted-foreground">TX: </span>
                <code className="text-xs break-all">{invoice.txHash}</code>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
