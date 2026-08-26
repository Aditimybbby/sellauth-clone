'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('store');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    storeDescription: '',
    logoUrl: '',
    accentColor: '#3b82f6',
    btcAddress: '',
    ltcAddress: '',
    blockcypherToken: '',
    invoiceTimeout: 15,
  });

  useEffect(() => {
    // Fetch settings on mount
    fetch('/api/settings')
      .then(res => {
        if(res.ok) return res.json();
        return {};
      })
      .then(data => {
        if(data && Object.keys(data).length > 0) {
            setFormData(prev => ({ ...prev, ...data }));
        }
      })
      .catch(err => console.error('Error fetching settings', err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      alert('Settings saved successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

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
              <input
                name="storeName"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.storeName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                name="storeDescription"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                rows={3}
                value={formData.storeDescription}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Logo URL</label>
              <input
                name="logoUrl"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.logoUrl}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Accent Color</label>
              <input
                name="accentColor"
                type="color"
                className="flex h-10 w-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.accentColor}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bitcoin (BTC) Address</label>
              <input
                name="btcAddress"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                value={formData.btcAddress}
                onChange={handleChange}
                placeholder="bc1q..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Litecoin (LTC) Address</label>
              <input
                name="ltcAddress"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                value={formData.ltcAddress}
                onChange={handleChange}
                placeholder="ltc1q..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">BlockCypher API Token</label>
              <input
                name="blockcypherToken"
                type="password"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                value={formData.blockcypherToken}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice Timeout (minutes)</label>
              <input
                name="invoiceTimeout"
                type="number"
                min="5"
                max="60"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.invoiceTimeout}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        {activeTab === 'blacklist' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Blacklist functionality coming soon.</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
