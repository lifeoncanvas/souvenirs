import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokens } from '../lib/api';
import { configureStore } from '../lib/format';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [cart, setCartState] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState(() => new Set());
  const [content, setContent] = useState({});
  const [contentReady, setContentReady] = useState(false);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, tone = 'default') => {
    setToast({ message, tone, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  const setCart = useCallback((c) => {
    setCartState(c);
    // A guest who has not added anything yet has no bag (token null); forget any stale token too.
    if (c) tokens.setCart(c.token || null);
  }, []);

  const refreshCart = useCallback(async () => {
    try { setCart(await api('/api/cart')); } catch { /* keep previous cart */ }
  }, [setCart]);

  const loadWishlist = useCallback(async () => {
    try {
      const items = await api('/api/account/wishlist');
      setWishlist(new Set(items.map((p) => p.id)));
    } catch { setWishlist(new Set()); }
  }, []);

  useEffect(() => {
    api('/api/content').then((c) => { setContent(c || {}); configureStore(c?.store); })
      .catch(() => {}).finally(() => setContentReady(true));
    (async () => {
      if (tokens.auth()) {
        try {
          setUser(await api('/api/auth/me'));
          loadWishlist();
        } catch { tokens.setAuth(null); }
      }
      setAuthReady(true);
      refreshCart();
    })();
  }, [refreshCart, loadWishlist]);

  const signIn = useCallback(async (auth) => {
    tokens.setAuth(auth.token);
    setUser(auth.user);
    await refreshCart();
    loadWishlist();
  }, [refreshCart, loadWishlist]);

  const signOut = useCallback(() => {
    tokens.setAuth(null);
    tokens.setCart(null);
    setUser(null);
    setWishlist(new Set());
    refreshCart();
  }, [refreshCart]);

  const addToCart = useCallback(async (productId, quantity = 1, personalisation) => {
    const c = await api('/api/cart/items', { method: 'POST', body: { productId, quantity, personalisation } });
    setCart(c);
    setCartOpen(true);
    return c;
  }, [setCart]);

  const toggleWishlist = useCallback(async (productId) => {
    if (!user) {
      notify('Sign in to save pieces to your wishlist.');
      return false;
    }
    const saved = wishlist.has(productId);
    const next = new Set(wishlist);
    saved ? next.delete(productId) : next.add(productId);
    setWishlist(next);
    try {
      await api(`/api/account/wishlist/${productId}`, { method: saved ? 'DELETE' : 'POST' });
      notify(saved ? 'Removed from your wishlist.' : 'Saved to your wishlist.');
    } catch (e) {
      setWishlist(wishlist);
      notify(e.message, 'error');
    }
    return !saved;
  }, [user, wishlist, notify]);

  const value = useMemo(() => ({
    user, setUser, authReady, signIn, signOut,
    cart, setCart, refreshCart, addToCart, cartOpen, setCartOpen,
    wishlist, toggleWishlist,
    content, setContent, contentReady,
    toast, notify,
  }), [user, authReady, signIn, signOut, cart, setCart, refreshCart, addToCart, cartOpen, wishlist, toggleWishlist,
    content, contentReady, toast, notify]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
