'use client';

import { useState } from 'react';
import { loginCustomer } from './actions';
import { Loader2, Mail } from 'lucide-react';

export default function CustomerLogin() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-background border rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">Customer Portal</h1>
          <p className="text-muted-foreground mt-2">Enter your email to access your purchases and tickets.</p>
        </div>

        <form action={(formData) => { setLoading(true); loginCustomer(formData); }} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full bg-background border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending Link...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
