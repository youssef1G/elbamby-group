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

  const addItem = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      const image = product.productImages?.[0]?.imageUrl || '';
      const stock = product.stockQuantity || 0;
      const qty = Math.min(quantity, stock);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: Math.min(i.quantity + qty, stock) }
            : i,
        );
      }
      return [...prev, { productId: product.id, nameEn: product.nameEn || '', nameAr: product.nameAr || '', image, price: product.price, quantity: qty, stock }];
    });
    // Every add opens the drawer — single source of truth, all callers
    // (ProductCard quick-add, ProductDetail) get this for free.
    setIsCartOpen(true);
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setItems((prev) => {
      const item = prev.find((i) => i.productId === productId);
      if (!item) return prev;
      if (quantity <= 0) return prev.filter((i) => i.productId !== productId);
      const cap = item.stock ?? Infinity;
      return prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.min(quantity, cap) } : i,
      );
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

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
    addItem, removeItem, updateQuantity, clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}