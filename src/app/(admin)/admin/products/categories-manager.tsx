'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Tag, Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchCategories = () => {
    setLoading(true);
    fetch('/api/categories')
      .then(res => (res.ok ? res.json() : []))
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        setName('');
        fetchCategories();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to create category');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Products in it will keep existing but become uncategorized.')) return;
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-lg border p-6 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          Categories
        </h2>
        <span className="text-xs text-muted-foreground">Shown as filter chips on the storefront</span>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="text"
          required
          className="flex h-10 flex-1 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name (e.g. Accounts, Software)"
        />
        <button
          type="submit"
          disabled={adding}
          className="h-10 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No categories yet. Add one above, then pick it when creating a product.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
            >
              {cat.name}
              <span className="text-xs text-muted-foreground">({cat.productCount ?? 0})</span>
              <button
                onClick={() => handleDelete(cat.id)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${cat.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
