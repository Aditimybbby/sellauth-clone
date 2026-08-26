'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    shortDescription: '',
    description: '',
    price: 0,
    type: 'KEY',
    categoryId: '',
    visibility: 'PUBLIC',
    minQuantity: 1,
    maxQuantity: 100,
    imageUrl: '',
  });
  const [keys, setKeys] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error('Failed to load categories', err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: name === 'price' || name === 'minQuantity' || name === 'maxQuantity' ? Number(value) : value };
      if (name === 'name' && !prev.slug) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const product = await res.json();
        
        if (formData.type === 'KEY' && keys.trim()) {
          const keyList = keys.split('\n').filter(k => k.trim());
          if (keyList.length > 0) {
            await fetch(`/api/products/${product.id}/keys`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ keys: keyList }),
            });
          }
        }
        
        router.push('/admin/products');
        router.refresh();
      } else {
        alert('Failed to create product');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="rounded-md p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-6 rounded-lg border p-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
              required
              name="name"
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Slug</label>
            <input
              required
              name="slug"
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={formData.slug}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Image URL</label>
            <input
              name="imageUrl"
              type="url"
              placeholder="https://example.com/image.png"
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={formData.imageUrl}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Price ($)</label>
            <input
              required
              name="price"
              type="number"
              step="0.01"
              min="0"
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={formData.price}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Short Description</label>
            <input
              name="shortDescription"
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={formData.shortDescription}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              name="description"
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                name="type"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="KEY">Serial Keys</option>
                <option value="FILE">Digital File</option>
                <option value="SERVICE">Manual Service</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Visibility</label>
              <select
                name="visibility"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.visibility}
                onChange={handleChange}
              >
                <option value="PUBLIC">Public</option>
                <option value="UNLISTED">Unlisted</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </div>
          </div>

          {formData.type === 'KEY' && (
            <div className="space-y-2 p-4 border rounded-md bg-muted/20">
              <label className="text-sm font-medium flex justify-between">
                <span>License Keys</span>
                <span className="text-muted-foreground">{keys.split('\n').filter(k => k.trim()).length} keys</span>
              </label>
              <p className="text-xs text-muted-foreground mb-2">Enter one key per line.</p>
              <textarea
                rows={6}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                value={keys}
                onChange={(e) => setKeys(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY-YYYY"
              />
            </div>
          )}

          {formData.type === 'FILE' && (
            <div className="space-y-2 p-4 border rounded-md bg-muted/20 text-center">
              <label className="text-sm font-medium">Upload File</label>
              <div className="mt-2 text-sm text-muted-foreground">
                <input type="file" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" />
              </div>
            </div>
          )}

          {formData.type === 'SERVICE' && (
            <div className="space-y-2 p-4 border rounded-md bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Service products require manual fulfillment after purchase. You will need to contact the customer or mark the order as fulfilled manually.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
