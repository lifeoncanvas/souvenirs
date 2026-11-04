import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { money, PERSONALISATION_LABELS } from '../lib/format';
import { Img, Ornament } from './ui';

export function PersonalisationList({ data, className = '' }) {
  if (!data) return null;
  return (
    <dl className={`mt-2 space-y-0.5 text-xs text-espresso-muted ${className}`}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="flex gap-1.5">
          <dt className="shrink-0">{PERSONALISATION_LABELS[k] || k}:</dt>
          <dd className="truncate text-espresso-soft">
            {k === 'logoUrl' ? <a href={v} target="_blank" rel="noreferrer" className="underline">View logo</a> : v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function QtyStepper({ value, onChange, max = 999, disabled }) {
  return (
    <div className="inline-flex h-10 items-center border border-espresso/15">
      <button type="button" className="flex h-full w-9 items-center justify-center disabled:opacity-30" disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)} aria-label="Decrease quantity"><Minus size={13} /></button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="flex h-full w-9 items-center justify-center disabled:opacity-30" disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)} aria-label="Increase quantity"><Plus size={13} /></button>
    </div>
  );
}

export default function CartDrawer() {
  const { cart, setCart, cartOpen, setCartOpen, notify } = useApp();
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!cartOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setCartOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [cartOpen, setCartOpen]);

  const update = async (item, qty) => {
    setBusy(item.id);
    try {
      setCart(qty < 1
        ? await api(`/api/cart/items/${item.id}`, { method: 'DELETE' })
        : await api(`/api/cart/items/${item.id}`, { method: 'PATCH', body: { quantity: qty } }));
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(null); }
  };

  const items = cart?.items || [];
  const remaining = cart ? Number(cart.freeShippingThreshold) - (Number(cart.subtotal) - Number(cart.discount)) : 0;

  return (
    <div className={`fixed inset-0 z-50 ${cartOpen ? '' : 'pointer-events-none'}`} aria-hidden={!cartOpen}>
      <div className={`absolute inset-0 bg-ink/40 transition-opacity duration-500 ${cartOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setCartOpen(false)} />
      <aside role="dialog" aria-label="Shopping bag"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-ivory shadow-2xl transition-transform duration-500 ease-silk ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-espresso/10 px-6 py-5">
          <h2 className="font-display text-2xl">Your Bag <span className="text-base text-espresso-muted">({cart?.itemCount || 0})</span></h2>
          <button className="flex h-10 w-10 items-center justify-center" onClick={() => setCartOpen(false)} aria-label="Close bag"><X size={20} strokeWidth={1.4} /></button>
        </div>

        {items.length > 0 && remaining > 0 && (
          <p className="border-b border-espresso/10 bg-champagne/60 px-6 py-3 text-xs text-espresso-soft">
            You're {money(remaining)} away from complimentary standard delivery.
          </p>
        )}

        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Ornament />
              <p className="font-display text-2xl">Your bag is waiting.</p>
              <p className="text-sm text-espresso-muted">Discover pieces made to hold a memory.</p>
              <Link to="/shop" onClick={() => setCartOpen(false)} className="btn-dark mt-2">Explore the collection</Link>
            </div>
          ) : (
            <ul className="divide-y divide-espresso/10">
              {items.map((item) => (
                <li key={item.id} className={`flex gap-4 py-5 transition-opacity ${busy === item.id ? 'opacity-50' : ''}`}>
                  <Link to={`/product/${item.slug}`} onClick={() => setCartOpen(false)} className="shrink-0">
                    <Img src={item.imageUrl} alt={item.name} className="h-28 w-22 w-[88px]" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <Link to={`/product/${item.slug}`} onClick={() => setCartOpen(false)} className="font-display text-lg leading-tight">{item.name}</Link>
                      <span className="text-sm tabular-nums">{money(item.lineTotal)}</span>
                    </div>
                    <PersonalisationList data={item.personalisation} />
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QtyStepper value={item.quantity} max={item.stock} disabled={busy === item.id} onChange={(q) => update(item, q)} />
                      <button className="text-[11px] uppercase tracking-wide2 text-espresso-muted underline-offset-4 hover:underline" onClick={() => update(item, 0)}>Remove</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-espresso/10 px-6 py-5">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span className="tabular-nums">{money(cart.subtotal)}</span></div>
            {Number(cart.discount) > 0 && (
              <div className="mt-1 flex justify-between text-sm text-gold-deep"><span>Discount ({cart.couponCode})</span><span>−{money(cart.discount)}</span></div>
            )}
            <p className="mt-1 text-xs text-espresso-muted">Delivery and discount codes are calculated at checkout.</p>
            <div className="mt-4 grid gap-2">
              <Link to="/checkout" onClick={() => setCartOpen(false)} className="btn-dark">Checkout</Link>
              <Link to="/cart" onClick={() => setCartOpen(false)} className="btn-outline">View bag</Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
