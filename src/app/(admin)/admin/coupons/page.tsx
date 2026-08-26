'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: 0,
    maxUses: 100,
  });

  const fetchCoupons = () => {
    fetch('/api/coupons')
      .then(res => res.json())
      .then(data => setCoupons(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setOpen(false);
        fetchCoupons();
        setFormData({ code: '', discountType: 'PERCENTAGE', discountValue: 0, maxUses: 100 });
      } else {
        alert('Failed to create coupon');
      }
    } catch (err) {
      console.error(err);
      alert('Error creating coupon');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await fetch(`/api/coupons?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchCoupons();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Coupons</h1>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Coupon Code</Label>
                <Input 
                  required 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="SUMMER2024"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={formData.discountType} onValueChange={v => setFormData({...formData, discountType: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Discount Value</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  required 
                  value={formData.discountValue} 
                  onChange={e => setFormData({...formData, discountValue: Number(e.target.value)})}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Uses</Label>
                <Input 
                  type="number" 
                  required 
                  value={formData.maxUses} 
                  onChange={e => setFormData({...formData, maxUses: Number(e.target.value)})}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
              <th className="p-4 font-medium">Code</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Value</th>
              <th className="p-4 font-medium">Uses</th>
              <th className="p-4 font-medium">Expires</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No coupons found
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b last:border-0">
                  <td className="p-4 font-mono font-medium">{coupon.code}</td>
                  <td className="p-4">{coupon.discountType}</td>
                  <td className="p-4">{coupon.discountValue}</td>
                  <td className="p-4">{coupon.usedCount || 0} / {coupon.maxUses || '∞'}</td>
                  <td className="p-4">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}</td>
                  <td className="p-4">Active</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(coupon.id)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
