import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext();

function loadCart() {
  try {
    const raw = localStorage.getItem('bg-cart');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.state?.items)) return parsed.state.items;
    if (parsed && Array.isArray(parsed.items)) return parsed.items;
    return [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  try { localStorage.setItem('bg-cart', JSON.stringify(items)); } catch {}
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => { saveCart(items); }, [items]);

  const addItem = useCallback((product, quantity = 1, variant = null) => {
    setItems((prev) => {
      const image = product.productImages?.[0]?.imageUrl || '';
      const unlimitedStock = Boolean(product.unlimitedStock);
      const stock = product.stockQuantity || 0;
      const qty = unlimitedStock ? quantity : Math.min(quantity, stock);
      const variantId = variant?.id || null;
      // Two line items for the same product but different colors are distinct.
      const matches = (i) => i.productId === product.id && (i.variantId || null) === variantId;
      const existing = prev.find(matches);
      if (existing) {
        return prev.map((i) =>
          matches(i)
            ? { ...i, quantity: Math.min(i.quantity + qty, unlimitedStock ? Infinity : stock) }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          nameEn: product.nameEn || '',
          nameAr: product.nameAr || '',
          image,
          price: product.price,
          quantity: qty,
          stock,
          unlimitedStock,
          variantId,
          variantLabelEn: variant?.labelEn || '',
          variantLabelAr: variant?.labelAr || '',
        },
      ];
    });
    // Every add opens the drawer — single source of truth, all callers
    // (ProductCard quick-add, ProductDetail) get this for free.
    setIsCartOpen(true);
  }, []);

  const removeItem = useCallback((productId, variantId = null) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && (i.variantId || null) === variantId)),
    );
  }, []);

  const updateQuantity = useCallback((productId, quantity, variantId = null) => {
    setItems((prev) => {
      const item = prev.find(
        (i) => i.productId === productId && (i.variantId || null) === variantId,
      );
      if (!item) return prev;
      if (quantity <= 0) {
        return prev.filter(
          (i) => !(i.productId === productId && (i.variantId || null) === variantId),
        );
      }
      const cap = item.unlimitedStock ? Infinity : (item.stock ?? Infinity);
      return prev.map((i) =>
        i.productId === productId && (i.variantId || null) === variantId
          ? { ...i, quantity: Math.min(quantity, cap) }
          : i,
      );
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  // Reorder: bulk-insert cart-shaped item objects (built by the caller from
  // past-order snapshots + live stock). Items with exhausted stock are simply
  // skipped; returns how many were actually added so the caller can toast
  // "some items unavailable".
  const reorderItems = useCallback((itemsToAdd) => {
    let added = 0;
    let next = [...items];
    for (const item of itemsToAdd) {
      if (item.skip) continue;
      const existing = next.find((i) => i.productId === item.productId);
      if (existing) {
        const cap = existing.unlimitedStock ? Infinity : (existing.stock ?? Infinity);
        const cap2 = item.unlimitedStock ? Infinity : (item.stock ?? 0);
        const finalCap = Math.min(cap, cap2);
        if (finalCap <= 0) continue;
        next = next.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, finalCap) }
            : i,
        );
        added += 1;
      } else {
        if ((item.unlimitedStock ? Infinity : (item.stock ?? 0)) <= 0) continue;
        next = [...next, { ...item }];
        added += 1;
      }
    }
    setItems(next);
    if (added > 0) setIsCartOpen(true);
    return added;
  }, [items]);

  // Explicit boolean-only setter for consumers that need to open/close the
  // drawer directly (e.g. CartDrawer's close button/backdrop). Prevents the
  // "raw setState passed straight to onClick" bug — React passes the click's
  // SyntheticEvent as the first arg to any bare event handler, so exposing
  // setIsCartOpen itself as onClick={setIsCartOpen} sets state to that event
  // object (truthy) instead of a boolean. Consumers should use this instead
  // of destructuring setIsCartOpen directly for click handlers.
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const openCartDrawer = useCallback(() => setIsCartOpen(true), []);

  const value = {
    items, isCartOpen, setIsCartOpen, closeCart, openCartDrawer,
    isMobileNavOpen, setIsMobileNavOpen,
    addItem, removeItem, updateQuantity, clearCart, reorderItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}