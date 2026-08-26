'use client';

import { useState } from 'react';
import { loginCustomer } from './actions';
import { Loader2, Mail } from 'lucide-react';

export default function CustomerLogin() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000000] p-4">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/5 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-50"></div>
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Customer Portal</h1>
          <p className="text-white/50 text-sm">Log in to view your purchases, download files, and manage your tickets.</p>
        </div>

        <div className="space-y-4">
          <button 
            type="button"
            className="w-full py-4 rounded-xl font-bold text-white flex justify-center items-center gap-3 transition-all bg-[#5865F2] hover:bg-[#4752C4] shadow-[0_0_20px_rgba(88,101,242,0.3)] hover:-translate-y-0.5"
            onClick={() => alert('Discord OAuth will require Client ID/Secret in .env to function fully.')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M216.85,54.41a120,120,0,0,0-30.22-9.33A8.4,8.4,0,0,0,183.1,48c-1.28,2.34-2.73,5.43-3.8,7.87a111.45,111.45,0,0,0-102.6,0c-1.07-2.44-2.52-5.53-3.8-7.87a8.4,8.4,0,0,0-3.53-2.91,120,120,0,0,0-30.22,9.33,8.71,8.71,0,0,0-4,3.75C9.4,98.54-3.32,148.16,3,197.35a8,8,0,0,0,3.32,6,121.21,121.21,0,0,0,36.63,18.78,8.23,8.23,0,0,0,8.81-2.93c1.78-2.47,3.46-5,5-7.65a8.45,8.45,0,0,0-4.63-12.7,81.16,81.16,0,0,1-11.75-5.63,8.41,8.41,0,0,1-.5-14,75.05,75.05,0,0,0,6.07-4.82,8.4,8.4,0,0,1,8.76-1.12,85.22,85.22,0,0,0,80.12,0,8.4,8.4,0,0,1,8.76,1.12,75.05,75.05,0,0,0,6.07,4.82,8.41,8.41,0,0,1-.5,14,81.16,81.16,0,0,1-11.75,5.63,8.45,8.45,0,0,0-4.63,12.7c1.55,2.6,3.23,5.18,5,7.65a8.23,8.23,0,0,0,8.81,2.93,121.21,121.21,0,0,0,36.63-18.78,8,8,0,0,0,3.32-6C261.34,141.4,244.38,92.51,220.84,58.16A8.71,8.71,0,0,0,216.85,54.41ZM85.5,152.12c-12,0-22-10.74-22-24s9.8-24,22-24,22.25,10.74,22,24S97.77,152.12,85.5,152.12Zm85,0c-12,0-22-10.74-22-24s9.8-24,22-24,22.25,10.74,22,24S182.72,152.12,170.5,152.12Z"></path></svg>
            Log in with Discord
          </button>

          <div className="flex items-center gap-3 my-6 text-white/30 text-xs font-bold uppercase tracking-widest">
            <div className="flex-1 h-px bg-white/10"></div>
            <span>Or continue with Email</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <form action={(formData) => { setLoading(true); loginCustomer(formData); }} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full bg-[#141414] border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-bold bg-white/5 text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 border border-white/10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending Link...
                </>
              ) : (
                'Log in with Email'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
