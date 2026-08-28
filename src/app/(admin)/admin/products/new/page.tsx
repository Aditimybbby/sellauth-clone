'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, ImagePlus, FileUp, Check, Users, Type as TypeIcon, FileUp as FileIcon, LinkIcon } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'ACCOUNTS', label: 'Accounts', desc: 'Unique accounts (mail:pass) — one per buyer. Stock = number of accounts.', icon: Users },
  { value: 'TEXT', label: 'Text', desc: 'Same text delivered to every buyer. You choose the stock limit.', icon: TypeIcon },
  { value: 'FILE', label: 'File', desc: 'Digital file download. Unlimited stock.', icon: FileIcon },
  { value: 'LINKS', label: 'Links', desc: 'Links delivered to every buyer. You choose the stock limit.', icon: LinkIcon },
] as const;

type ProductType = (typeof TYPE_OPTIONS)[number]['value'];

// The database stores legacy type names (KEY/FILE/SERVICE, enforced by a CHECK
// constraint). The UI presents friendlier categories and maps on save:
//   Accounts -> KEY (unique account pool)
//   Text     -> FILE without a file (static content delivered to every buyer)
//   File     -> FILE with an uploaded file (download link)
//   Links    -> SERVICE (static links delivered to every buyer)
const UI_TO_DB: Record<ProductType, string> = { ACCOUNTS: 'KEY', TEXT: 'FILE', FILE: 'FILE', LINKS: 'SERVICE' };

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
    type: 'ACCOUNTS' as ProductType,
    categoryId: '',
    visibility: 'PUBLIC',
    minQuantity: 1,
    maxQuantity: 100,
    stock: 0,
    imageUrl: '',
    filePath: '',
    deliveredContent: '',
  });
  const [keys, setKeys] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  const unlimitedStock = Number(formData.stock) === -1 || formData.type === 'FILE';

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
        const uiType = p.type === 'FILE' ? (p.filePath ? 'FILE' : 'TEXT') : p.type === 'SERVICE' ? 'LINKS' : 'ACCOUNTS';
        setFormData({
          name: p.name || '',
          slug: p.slug || '',
          shortDescription: p.shortDescription || '',
          description: p.description || '',
          price: p.price ?? 0,
          type: uiType as ProductType,
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
      // Map the UI category to the DB type before saving
      const dbType = UI_TO_DB[formData.type] || 'KEY';
      const payload = { ...formData, type: dbType, stock: formData.type === 'FILE' ? -1 : formData.stock };

      const res = await fetch(editId ? `/api/products/${editId}` : '/api/products', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const product = await res.json();

        if (formData.type === 'ACCOUNTS' && keys.trim()) {
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

  const accountsCount = keys.split('\n').filter(k => k.trim()).length;
  const inputClass = 'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm';
  const areaClass = 'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm';

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
              className={inputClass}
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
              className={inputClass}
              value={formData.slug}
              onChange={handleChange}
            />
          </div>

          {/* Product type cards */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Product type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPE_OPTIONS.map(opt => {
                const selected = formData.type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: opt.value, stock: opt.value === 'FILE' ? -1 : prev.stock === -1 ? 0 : prev.stock }))}
                    className={`text-left rounded-xl border-2 p-4 transition-all ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'}`}
                  >
                    <div className={`font-semibold text-sm ${selected ? 'text-primary' : ''}`}>{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-snug">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                name="categoryId"
                className={inputClass}
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
                className={inputClass}
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
              className={inputClass}
              value={formData.shortDescription}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              name="description"
              rows={4}
              className={areaClass}
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {/* Stock per type */}
          {formData.type !== 'FILE' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Stock</label>
              <input
                name="stock"
                type="number"
                min="0"
                className={inputClass}
                value={formData.stock}
                onChange={handleChange}
              />
              {formData.type === 'ACCOUNTS' && (
                <p className="text-xs text-muted-foreground">
                  Limited stock — buyers receive one account each. The count grows automatically
                  when you add accounts below.
                </p>
              )}
              {formData.type === 'TEXT' && (
                <p className="text-xs text-muted-foreground">
                  You choose the limit — every buyer receives the same text.
                </p>
              )}
              {formData.type === 'LINKS' && (
                <p className="text-xs text-muted-foreground">
                  You choose the limit — every buyer receives the same links.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Visibility</label>
              <select
                name="visibility"
                className={inputClass}
                value={formData.visibility}
                onChange={handleChange}
              >
                <option value="PUBLIC">Public</option>
                <option value="UNLISTED">Unlisted</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Min Quantity</label>
              <input
                name="minQuantity"
                type="number"
                min="1"
                className={inputClass}
                value={formData.minQuantity}
                onChange={handleChange}
              />
            </div>
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

          {/* Type-specific content */}
          {formData.type === 'ACCOUNTS' && (
            <div className="space-y-2 p-4 border rounded-md bg-muted/20">
              <label className="text-sm font-medium flex justify-between">
                <span>{editId ? 'Add more accounts' : 'Accounts'}</span>
                <span className="text-muted-foreground">{accountsCount} added</span>
              </label>
              <p className="text-xs text-muted-foreground mb-2">One account per line (mail:pass). Each buyer gets one unique account.</p>
              <textarea
                rows={6}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono"
                value={keys}
                onChange={(e) => setKeys(e.target.value)}
                placeholder={'user@mail.com:password123\nuser2@mail.com:password456'}
              />
            </div>
          )}

          {formData.type === 'TEXT' && (
            <div className="space-y-2 p-4 border rounded-md bg-muted/20">
              <label className="text-sm font-medium">Text content</label>
              <p className="text-xs text-muted-foreground mb-2">Delivered to every buyer after payment.</p>
              <textarea
                rows={6}
                name="deliveredContent"
                className={areaClass + ' font-mono'}
                value={formData.deliveredContent}
                onChange={handleChange}
                placeholder={'Your activation text, instructions or anything else...'}
              />
            </div>
          )}

          {formData.type === 'LINKS' && (
            <div className="space-y-2 p-4 border rounded-md bg-muted/20">
              <label className="text-sm font-medium">Links</label>
              <p className="text-xs text-muted-foreground mb-2">Delivered to every buyer after payment.</p>
              <textarea
                rows={5}
                name="deliveredContent"
                className={areaClass + ' font-mono'}
                value={formData.deliveredContent}
                onChange={handleChange}
                placeholder={'https://link1.com\nhttps://link2.com'}
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
              <p className="text-xs text-muted-foreground mt-2">Buyers get a download link. Unlimited stock.</p>
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
