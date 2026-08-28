'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2, Loader2 } from 'lucide-react';

const FORM_KEYS = [
  'store_name',
  'store_description',
  'store_logo',
  'accent_color',
  'announcement',
  'currency',
  'invoice_timeout_minutes',
  'btc_address',
  'ltc_address',
  'blockcypher_token',
] as const;

type SettingsForm = Record<(typeof FORM_KEYS)[number], string>;

const DEFAULTS: SettingsForm = {
  store_name: '',
  store_description: '',
  store_logo: '',
  accent_color: '#6366f1',
  announcement: '',
  currency: 'USD',
  invoice_timeout_minutes: '30',
  btc_address: '',
  ltc_address: '',
  blockcypher_token: '',
};

interface BlacklistEntry {
  id: string;
  type: 'IP' | 'EMAIL';
  value: string;
  reason: string | null;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'store' | 'payments' | 'blacklist'>('store');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SettingsForm>(DEFAULTS);

  // Blacklist state
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [blLoading, setBlLoading] = useState(false);
  const [blType, setBlType] = useState<'EMAIL' | 'IP'>('EMAIL');
  const [blValue, setBlValue] = useState('');
  const [blReason, setBlReason] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => (res.ok ? res.json() : {}))
      .then(data => {
        if (data && typeof data === 'object') {
          setFormData(prev => {
            const next = { ...prev };
            for (const key of FORM_KEYS) {
              if (typeof data[key] === 'string' && data[key] !== '') next[key] = data[key];
            }
            return next;
          });
        }
      })
      .catch(err => console.error('Error fetching settings', err));
  }, []);

  const fetchBlacklist = () => {
    setBlLoading(true);
    fetch('/api/blacklist')
      .then(res => (res.ok ? res.json() : []))
      .then(data => setBlacklist(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setBlLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'blacklist') fetchBlacklist();
  }, [activeTab]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert('Settings saved successfully');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleBlacklistAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blValue.trim()) return;
    try {
      const res = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: blType, value: blValue.trim(), reason: blReason.trim() || null }),
      });
      if (res.ok) {
        setBlValue('');
        setBlReason('');
        fetchBlacklist();
      } else {
        alert('Failed to add blacklist entry');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlacklistDelete = async (id: string) => {
    if (!confirm('Remove this entry from the blacklist?')) return;
    try {
      const res = await fetch(`/api/blacklist?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchBlacklist();
    } catch (err) {
      console.error(err);
    }
  };

  const inputClass = 'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <div className="flex border-b">
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'store' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('store')}
        >
          Store
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'payments' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('payments')}
        >
          Payments
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'blacklist' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={() => setActiveTab('blacklist')}
        >
          Blacklist
        </button>
      </div>

      <div className="rounded-lg border p-6 bg-card">
        {activeTab === 'store' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Store Name</label>
              <input name="store_name" type="text" className={inputClass} value={formData.store_name} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea name="store_description" className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" rows={3} value={formData.store_description} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo URL</label>
              <input name="store_logo" type="text" className={inputClass} value={formData.store_logo} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Accent Color (storefront)</label>
                <input name="accent_color" type="color" className="flex h-10 w-20 rounded-md border border-input bg-transparent px-1 py-1 text-sm" value={formData.accent_color} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Currency</label>
                <input name="currency" type="text" className={inputClass} value={formData.currency} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Announcement Bar</label>
              <textarea name="announcement" className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" rows={2} value={formData.announcement} onChange={handleChange} placeholder="Shown as a strip above the navbar. Leave empty to hide." />
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bitcoin (BTC) Address</label>
              <input name="btc_address" type="text" className={`${inputClass} font-mono`} value={formData.btc_address} onChange={handleChange} placeholder="bc1q..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Litecoin (LTC) Address</label>
              <input name="ltc_address" type="text" className={`${inputClass} font-mono`} value={formData.ltc_address} onChange={handleChange} placeholder="ltc1q..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">BlockCypher API Token</label>
              <input name="blockcypher_token" type="password" className={`${inputClass} font-mono`} value={formData.blockcypher_token} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice Timeout (minutes)</label>
              <input name="invoice_timeout_minutes" type="number" min="5" max="60" className={inputClass} value={formData.invoice_timeout_minutes} onChange={handleChange} />
            </div>
          </div>
        )}

        {activeTab === 'blacklist' && (
          <div className="space-y-4">
            <form onSubmit={handleBlacklistAdd} className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select className="flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={blType} onChange={(e) => setBlType(e.target.value as 'EMAIL' | 'IP')}>
                  <option value="EMAIL">Email</option>
                  <option value="IP">IP Address</option>
                </select>
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">{blType === 'EMAIL' ? 'Email' : 'IP Address'}</label>
                <input type="text" required className={inputClass} value={blValue} onChange={(e) => setBlValue(e.target.value)} placeholder={blType === 'EMAIL' ? 'badactor@example.com' : '203.0.113.7'} />
              </div>
              <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Reason (optional)</label>
                <input type="text" className={inputClass} value={blReason} onChange={(e) => setBlReason(e.target.value)} placeholder="Fraudulent orders" />
              </div>
              <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Block
              </button>
            </form>

            {blLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : blacklist.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Blacklist is empty. Blocked customers cannot create invoices.
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                      <th className="p-3 font-medium">Type</th>
                      <th className="p-3 font-medium">Value</th>
                      <th className="p-3 font-medium">Reason</th>
                      <th className="p-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blacklist.map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="p-3">
                          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">{entry.type}</span>
                        </td>
                        <td className="p-3 font-mono text-xs">{entry.value}</td>
                        <td className="p-3 text-muted-foreground">{entry.reason || '—'}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => handleBlacklistDelete(entry.id)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground" aria-label="Remove entry">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab !== 'blacklist' && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
