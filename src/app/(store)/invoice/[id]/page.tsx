'use client';

import { Fragment, useEffect, useState, use } from 'react';
import { Copy, CheckCircle2, Clock, XCircle, Loader2, Star, BellRing, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type InvoiceStatus = 'PENDING' | 'DETECTED' | 'CONFIRMING' | 'COMPLETED' | 'EXPIRED' | 'PARTIALLY_PAID';

interface InvoiceData {
  id: string;
  customerEmail?: string;
  totalAmount: number;
  cryptoAmount: string;
  cryptoCurrency: string;
  paymentAddress: string;
  status: InvoiceStatus;
  confirmations: number;
  expiresAt: string;
  txHash?: string;
  receivedCrypto?: number;
  expectedCrypto?: string;
  orders?: Array<{
    id: string;
    productId: string;
    quantity: number;
    deliveredContent?: string | null;
    product?: { name: string; type: string } | null;
  }>;
}

const STATUS_STEPS = [
  { key: 'await', label: 'Awaiting Payment' },
  { key: 'detected', label: 'Payment Detected' },
  { key: 'done', label: 'Completed' },
];

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
  const [reviewState, setReviewState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [reviewError, setReviewError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch("/api/invoices/" + id);
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

  useEffect(() => {
    if (!invoice || invoice.status === 'COMPLETED' || invoice.status === 'EXPIRED') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/invoices/" + id + "/status");
        if (res.ok) {
          const data = await res.json();
          setInvoice(prev => prev ? { ...prev, ...data } : prev);
        }
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, [id, invoice?.status]);

  useEffect(() => {
    if (!invoice?.expiresAt) return;
    const expiresAt = new Date(invoice.expiresAt).getTime();

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && invoice.status === 'PENDING') {
        setInvoice(prev => prev ? { ...prev, status: 'EXPIRED' } : prev);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [invoice?.expiresAt, invoice?.status]);

  // Generate a scannable payment QR for real crypto invoices.
  useEffect(() => {
    const addr = invoice?.paymentAddress;
    const amount = invoice?.cryptoAmount;
    const currency = invoice?.cryptoCurrency?.toLowerCase();
    if (!invoice || invoice.status === 'COMPLETED' || !addr || !amount || !currency || currency === 'test') {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('qrcode');
        const QRCode = (mod as { default?: typeof import('qrcode') }).default ?? mod;
        const prefixes: Record<string, string> = { btc: 'bitcoin', ltc: 'litecoin' };
        const uri = `${prefixes[currency] || currency}:${addr}?amount=${amount}`;
        const url = await QRCode.toDataURL(uri, {
          width: 220,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [invoice?.paymentAddress, invoice?.cryptoAmount, invoice?.cryptoCurrency, invoice?.status]);

  const copyToClipboard = async (text: string, type: 'address' | 'amount' | 'keys') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
  };

  const submitReview = async () => {
    const firstOrder = invoice?.orders?.[0];
    if (!firstOrder || !invoice?.customerEmail) return;
    setReviewState('submitting');
    setReviewError('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: firstOrder.id,
          productId: firstOrder.productId,
          rating: reviewRating,
          comment: reviewComment,
          customerEmail: invoice.customerEmail,
        }),
      });
      if (res.ok) {
        setReviewState('done');
        setShowReview(false);
      } else {
        const data = await res.json().catch(() => ({}));
        setReviewError(data.error || 'Failed to submit review');
        setReviewState('error');
      }
    } catch {
      setReviewError('Failed to submit review');
      setReviewState('error');
    }
  };

  const handleMockPayment = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/invoices/" + invoice?.id + "/simulate-payment", {
        method: 'POST'
      });
      if (res.ok) {
        setInvoice(prev => prev ? { ...prev, status: 'COMPLETED' } : prev);
        const refetch = await fetch("/api/invoices/" + id);
        if (refetch.ok) {
          setInvoice(await refetch.json());
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
        <Card className="w-full max-w-md bg-[#0a0a0a] border border-white/5">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-white">Invoice Not Found</h2>
            <p className="text-white/50 mb-6">This invoice may have expired or does not exist.</p>
            <Button onClick={() => window.location.href = '/'} className="bg-primary hover:bg-primary/80">Return to Store</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCompleted = invoice.status === 'COMPLETED';
  const isExpired = invoice.status === 'EXPIRED';
  const isDetected = invoice.status === 'DETECTED' || invoice.status === 'CONFIRMING' || invoice.status === 'PARTIALLY_PAID';
  const coin = (invoice.cryptoCurrency || '').toUpperCase();
  const activeStep = isCompleted ? 2 : isDetected ? 1 : 0;

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6">
      <Card className="bg-[#0a0a0a] border-white/5 shadow-2xl overflow-hidden rounded-3xl">
        <div className="h-1 bg-gradient-to-r from-primary/50 to-primary w-full"></div>
        <CardHeader className="text-center pb-6 pt-10">
          <CardTitle className="text-3xl font-extrabold text-white">
            {isCompleted ? 'Payment Successful' :
             isExpired ? 'Invoice Expired' :
             isDetected ? 'Payment Detected' :
             'Awaiting Payment'}
          </CardTitle>
          <p className="text-white/50 text-sm mt-2">
            Invoice ID: <span className="font-mono text-white/70 break-all">{invoice.id}</span>
          </p>
        </CardHeader>

        <CardContent className="space-y-8 px-4 sm:px-10 pb-10">
          {/* Payment progress stepper */}
          {!isExpired && (
            <div>
              <div className="flex items-center justify-between max-w-md mx-auto">
                {STATUS_STEPS.map((step, i) => {
                  const done = i < activeStep || isCompleted;
                  const active = i === activeStep && !isCompleted;
                  const Icon = done && i === 2 ? Check : i === 1 ? BellRing : Clock;
                  return (
                    <Fragment key={step.key}>
                      <div className="flex flex-col items-center gap-2 text-center w-24">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                            done
                              ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                              : active
                                ? 'border-primary bg-primary/10 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.45)]'
                                : 'border-white/15 text-white/30'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-[11px] font-bold leading-tight ${done || active ? 'text-white' : 'text-white/30'}`}>
                          {step.label}
                        </span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 mb-6 rounded ${i < activeStep ? 'bg-primary' : 'bg-white/10'}`} />
                      )}
                    </Fragment>
                  );
                })}
              </div>

              {isDetected && (
                <div className="mt-5 text-center text-sm bg-amber-500/10 border border-amber-500/20 text-amber-400 py-3 px-4 rounded-xl font-semibold">
                  {invoice.receivedCrypto
                    ? <>We can see a payment of {invoice.receivedCrypto} {coin} on-chain{invoice.expectedCrypto ? <> (expected {invoice.expectedCrypto} {coin})</> : ''}. Completing your order shortly…</>
                    : <>We can see your payment on-chain. Completing your order shortly…</>}
                </div>
              )}
            </div>
          )}

          {isCompleted ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="w-16 h-16 mb-4 text-emerald-400" />
              <h3 className="text-xl font-bold mb-2">Thank You For Your Purchase!</h3>
              <p className="text-emerald-400/80 font-medium">Your payment has been confirmed and your order is complete.</p>
            </div>
          ) : isExpired ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
              <XCircle className="w-16 h-16 mb-4 text-red-400" />
              <h3 className="text-xl font-bold mb-2">Invoice Expired</h3>
              <p className="text-red-400/80">This invoice has expired. Please create a new order.</p>
            </div>
          ) : (
            <div className="bg-[#141414] border border-white/10 p-5 sm:p-8 rounded-3xl">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="text-sm font-bold text-white/50 uppercase tracking-widest mb-3">Amount Due</div>
                <div className="text-4xl sm:text-5xl font-black text-white flex items-center gap-3 break-all">
                  {invoice.cryptoCurrency.toUpperCase() === 'TEST' ? '$' + invoice.totalAmount.toFixed(2) : invoice.cryptoAmount + ' ' + invoice.cryptoCurrency.toUpperCase()}
                  {invoice.cryptoCurrency.toUpperCase() !== 'TEST' && (
                    <button onClick={() => copyToClipboard(invoice.cryptoAmount, 'amount')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                      <Copy className="w-5 h-5 text-white/40 hover:text-white" />
                    </button>
                  )}
                </div>
                {copied === 'amount' && <span className="text-xs text-primary mt-2 font-bold">Copied!</span>}
              </div>

              {invoice.cryptoCurrency.toUpperCase() === 'TEST' ? (
                <div className="text-center space-y-4">
                  <p className="text-white/60 mb-6">This is a mock payment for testing purposes.</p>
                  <Button onClick={handleMockPayment} className="w-full py-6 rounded-xl font-bold text-lg bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_hsl(var(--primary)/0.35)]">
                    Simulate Payment
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {qrDataUrl && (
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-white p-3 rounded-2xl">
                        <img src={qrDataUrl} alt="Payment QR code" width={180} height={180} />
                      </div>
                      <p className="text-xs text-white/40 font-semibold uppercase tracking-widest">Scan to pay</p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest block mb-3 text-center">Send Payment To</label>
                    <div className="flex items-center gap-2 bg-[#0a0a0a] p-4 rounded-xl border border-white/5">
                      <code className="flex-1 text-sm text-center text-white break-all font-mono">
                        {invoice.paymentAddress}
                      </code>
                      <button onClick={() => copyToClipboard(invoice.paymentAddress, 'address')} className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors shrink-0">
                        <Copy className="w-5 h-5 text-white/70" />
                      </button>
                    </div>
                    {copied === 'address' && <div className="text-center text-xs text-primary mt-2 font-bold">Copied!</div>}
                  </div>

                  {!isDetected && (
                    <div className="flex items-center justify-center gap-3 text-white/60 bg-white/5 py-4 rounded-xl font-medium border border-white/5">
                      <Clock className="w-5 h-5 text-primary" />
                      Time remaining: <span className="text-white font-bold">{formatTime(timeLeft)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isCompleted && invoice.orders?.map((order, idx) => (
            <div key={idx} className="bg-[#141414] border border-emerald-500/30 p-5 sm:p-8 rounded-3xl mt-8 shadow-xl">
              <h3 className="text-xl font-bold mb-6 text-white flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                Delivered: {order.product?.name}
              </h3>

              <div className="bg-[#0a0a0a] p-6 rounded-2xl border border-white/5 relative group">
                <pre className="whitespace-pre-wrap font-mono text-sm text-emerald-400/90 break-all leading-relaxed">
                  {order.deliveredContent || 'No content delivered.'}
                </pre>

                {order.deliveredContent && (
                  <button
                    onClick={() => copyToClipboard(order.deliveredContent!, 'keys')}
                    className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    aria-label="Copy delivered content"
                  >
                    <Copy className="w-5 h-5 text-white" />
                  </button>
                )}
                {copied === 'keys' && <span className="absolute top-16 right-4 text-xs text-emerald-400 font-bold">Copied!</span>}
              </div>
            </div>
          ))}

          {isCompleted && reviewState === 'done' && (
            <div className="text-center mt-8 text-emerald-400 font-bold bg-emerald-400/10 border border-emerald-400/20 py-4 rounded-2xl">
              Thanks for your review!
            </div>
          )}

          {isCompleted && reviewState !== 'done' && !showReview && (
            <div className="text-center mt-8">
              <Button onClick={() => setShowReview(true)} variant="outline" className="bg-transparent border-white/10 text-white hover:bg-white/5 rounded-xl font-bold py-6">
                <Star className="w-5 h-5 mr-2" />
                Leave a Review
              </Button>
            </div>
          )}

          {showReview && (
            <div className="bg-[#141414] border border-white/10 p-6 rounded-2xl mt-8">
              <h3 className="font-bold text-white mb-4">Rate Your Purchase</h3>
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setReviewRating(star)} aria-label={`Rate ${star} stars`}>
                    <Star className={'w-8 h-8 ' + (star <= reviewRating ? 'fill-yellow-500 text-yellow-500' : 'text-white/20')} />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Optional feedback..."
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 mb-4 h-24"
              />
              {reviewError && <p className="text-red-400 text-sm mb-3">{reviewError}</p>}
              <Button onClick={submitReview} disabled={reviewState === 'submitting'} className="w-full bg-primary hover:bg-primary/90 text-white font-bold">
                {reviewState === 'submitting' ? 'Submitting...' : 'Submit Review'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
