'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, ImagePlus, FileUp, Check } from 'lucide-react';

function ProductForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [loadingProduct, setLoadingProduct] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'image' | 'file' | null>(null);
  const [imageUploaded, setImageUploaded] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [error, setError] = useState('');
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
    stock: 0,
    imageUrl: '',
    filePath: '',
    deliveredContent: '',
  });
  const unlimitedStock = Number(formData.stock) === -1;
  const [keys, setKeys] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to load categories', err));
  }, []);

  // Load the product when editing an existing one (?edit=<id>)
  useEffect(() => {
    if (!editId) return;
    setLoadingProduct(true);
    fetch(`/api/products/${editId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Product not found');
        return res.json();
      })
      .then((p) => {
        setFormData({
          name: p.name || '',
          slug: p.slug || '',
          shortDescription: p.shortDescription || '',
          description: p.description || '',
          price: p.price ?? 0,
          type: p.type || 'KEY',
          categoryId: p.categoryId || '',
          visibility: p.visibility || 'PUBLIC',
          minQuantity: p.minQuantity ?? 1,
          maxQuantity: p.maxQuantity ?? 100,
          stock: p.stock ?? 0,
          imageUrl: p.imageUrl || '',
          filePath: p.filePath || '',
          deliveredContent: p.deliveredContent || '',
        });
        setLoadingProduct(false);
      })
      .catch(() => {
        setError('Could not load that product.');
        setLoadingProduct(false);
      });
  }, [editId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: name === 'price' || name === 'minQuantity' || name === 'maxQuantity' || name === 'stock'
          ? Number(value)
          : value,
      };
      if (name === 'name' && !editId && !prev.slug) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }
      return updated;
    });
  };

  const uploadToServer = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.filePath as string;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading('image');
    setError('');
    try {
      const path = await uploadToServer(file);
      setFormData((prev) => ({ ...prev, imageUrl: path }));
      setImageUploaded(true);
    } catch {
      setError('Image upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading('file');
    setError('');
    try {
      const path = await uploadToServer(file);
      setFormData((prev) => ({ ...prev, filePath: path }));
      setFileUploaded(true);
    } catch {
      setError('File upload failed. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(editId ? `/api/products/${editId}` : '/api/products', {
        method: editId ? 'PUT' : 'POST',
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
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save product');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="rounded-md p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {editId ? 'Edit Product' : 'Create Product'}
        </h1>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                name="categoryId"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.categoryId}
                onChange={handleChange}
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
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

          <div className="space-y-2 p-4 border rounded-md bg-muted/20">
            <label className="text-sm font-medium">Delivered Content — same for every buyer (optional)</label>
            <p className="text-xs text-muted-foreground">
              Paste mail:pass lines, links or any text here — every buyer receives exactly this after
              payment. Leave empty if you use the key pool (KEY) or an uploaded file (FILE) instead.
            </p>
            <textarea
              name="deliveredContent"
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
              value={formData.deliveredContent}
              onChange={handleChange}
              placeholder={'user@mail.com:password123\nuser2@mail.com:password456\nhttps://your-link.com/download'}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Min Qty</label>
              <input
                name="minQuantity"
                type="number"
                min="1"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.minQuantity}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Max Qty</label>
              <input
                name="maxQuantity"
                type="number"
                min="1"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.maxQuantity}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Stock</label>
            <div className="flex items-center gap-3">
              <input
                name="stock"
                type="number"
                min="-1"
                disabled={unlimitedStock}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm disabled:opacity-50"
                value={unlimitedStock ? '' : formData.stock}
                onChange={handleChange}
                placeholder={unlimitedStock ? 'Unlimited' : ''}
              />
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={unlimitedStock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.checked ? -1 : 0 }))}
                />
                Unlimited
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Tick Unlimited for text/link content and KEY products without a key pool. KEY products
              also gain stock automatically when keys are imported below.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Image URL</label>
            <div className="flex gap-2">
              <input
                name="imageUrl"
                type="text"
                placeholder="https://example.com/image.png"
                className="flex h-10 flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                value={formData.imageUrl}
                onChange={handleChange}
              />
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm hover:bg-muted">
                {uploading === 'image' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : imageUploaded ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          {formData.type === 'KEY' && (
            <div className="space-y-2 p-4 border rounded-md bg-muted/20">
              <label className="text-sm font-medium flex justify-between">
                <span>{editId ? 'Add More License Keys' : 'License Keys'}</span>
                <span className="text-muted-foreground">{keys.split('\n').filter(k => k.trim()).length} keys</span>
              </label>
              <p className="text-xs text-muted-foreground mb-2">Enter one key per line.</p>
              <textarea
                rows={6}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                value={keys}
                onChange={(e) => setKeys(e.target.value)}
                placeholder={'XXXX-XXXX-XXXX-XXXX\nYYYY-YYYY-YYYY-YYYY'}
              />
            </div>
          )}

          {formData.type === 'FILE' && (
            <div className="space-y-2 p-4 border rounded-md bg-muted/20">
              <label className="text-sm font-medium">Upload File</label>
              <div className="mt-2">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input px-4 py-6 text-sm text-muted-foreground hover:bg-muted/40">
                  {uploading === 'file' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : fileUploaded ? (
                    <><Check className="h-4 w-4 text-green-500" /> Uploaded: {formData.filePath}</>
                  ) : (
                    <><FileUp className="h-4 w-4" /> Choose a file to upload</>
                  )}
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
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
              disabled={saving || uploading !== null}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : editId ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={null}>
      <ProductForm />
    </Suspense>
  );
}
