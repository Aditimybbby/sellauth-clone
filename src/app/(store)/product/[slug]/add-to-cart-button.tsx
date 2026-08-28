'use client';

import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { useRouter } from 'next/navigation';

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
  };
  inStock: boolean;
  maxQuantity: number;
  minQuantity: number;
}

export function AddToCartButton({ product, inStock, maxQuantity, minQuantity }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(minQuantity);
  const [added, setAdded] = useState(false);
  const cart = useCartStore();
  const router = useRouter();

  const addToCart = () => {
    cart.addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    cart.addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity
    });
    router.push('/checkout');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <label className="text-white/60 font-semibold">Quantity</label>
        <div className="flex items-center bg-[#141414] border border-white/10 rounded-xl overflow-hidden">
          <button
            type="button"
            aria-label="Decrease quantity"
            className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setQuantity(Math.max(minQuantity, quantity - 1))}
            disabled={!inStock}
          >
            -
          </button>
          <input
            type="number"
            value={quantity}
            aria-label="Quantity"
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) {
                setQuantity(Math.min(maxQuantity, Math.max(minQuantity, val)));
              }
            }}
            className="w-16 bg-transparent text-center font-bold text-white focus:outline-none"
            disabled={!inStock}
          />
          <button
            type="button"
            aria-label="Increase quantity"
            className="px-4 py-2 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={!inStock}
          >
            +
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={addToCart}
          disabled={!inStock}
          className="w-full py-4 rounded-xl font-bold bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {added ? (
            <>
              <Check className="w-5 h-5 text-emerald-400" />
              Added
            </>
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" />
              Add to Cart
            </>
          )}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!inStock}
          className="w-full py-4 rounded-xl font-bold bg-primary text-white shadow-[0_0_20px_hsl(var(--primary)/0.35)] hover:bg-primary/90 hover:shadow-[0_0_25px_hsl(var(--primary)/0.5)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex justify-center items-center gap-2"
        >
          {inStock ? 'Buy Now' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
}
