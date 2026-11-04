import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { PersonalisationList, QtyStepper } from '../components/CartDrawer';
import { EmptyState, Img, PageLoader, Seo, Spinner } from '../components/ui';

export function CouponBox() {
  const { cart, setCart } = useApp();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const apply = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setError('');
    try { setCart(await api('/api/cart/coupon', { method: 'POST', body: { code } })); setCode(''); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const remove = async () => { setCart(await api('/api/cart/coupon', { method: 'DELETE' })); };
  if (cart?.couponCode) {
    return (
      <div className="flex items-center justify-between border border-dashed border-gold/60 bg-champagne/40 px-4 py-3 text-sm">
        <span>Code <strong className="font-medium tracking-wide">{cart.couponCode}</strong> {cart.couponError ? <em className="text-red-800">— {cart.couponError}</em> : 'applied'}</span>
        <button onClick={remove} className="text-xs underline underline-offset-4">Remove</button>
      </div>
    );
  }
  return (
    <form onSubmit={apply}>
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Discount code" aria-label="Discount code" className="field-box !py-2.5 text-sm uppercase" />
        <button className="btn-outline !min-h-[44px] shrink-0 !px-5" disabled={busy}>{busy ? <Spinner /> : 'Apply'}</button>
      </div>
      {error && <p className="mt-2 text-xs text-red-800">{error}</p>}
    </form>
  );
}

export function Totals({ cart, shippingLabel }) {
  return (
    <dl className="space-y-2.5 text-sm">
      <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{money(cart.subtotal)}</dd></div>
      {Number(cart.discount) > 0 && <div className="flex justify-between text-gold-deep"><dt>Discount</dt><dd className="tabular-nums">−{money(cart.discount)}</dd></div>}
      <div className="flex justify-between"><dt>Delivery {shippingLabel && <span className="text-espresso-muted">({shippingLabel})</span>}</dt><dd className="tabular-nums">{Number(cart.shippingFee) === 0 ? 'Complimentary' : money(cart.shippingFee)}</dd></div>
      <div className="flex justify-between border-t border-espresso/10 pt-4 font-display text-2xl"><dt>Total</dt><dd className="tabular-nums">{money(cart.total)}</dd></div>
    </dl>
  );
}

export default function Cart() {
  const { cart, setCart, notify } = useApp();
  const [busy, setBusy] = useState(null);
  if (!cart) return <PageLoader />;

  const update = async (item, qty) => {
    setBusy(item.id);
    try {
      setCart(qty < 1 ? await api(`/api/cart/items/${item.id}`, { method: 'DELETE' }) : await api(`/api/cart/items/${item.id}`, { method: 'PATCH', body: { quantity: qty } }));
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(null); }
  };

  return (
    <>
      <Seo title="Your Bag" noindex />
      <div className="container-site py-14 lg:py-20">
        <h1 className="display-lg">Your Bag</h1>
        {cart.items.length === 0 ? (
          <EmptyState title="Your bag is waiting." text="Discover pieces made to hold a memory." action={<Link to="/shop" className="btn-dark">Explore the collection</Link>} />
        ) : (
          <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
            <ul className="divide-y divide-espresso/10 border-y border-espresso/10">
              {cart.items.map((item) => (
                <li key={item.id} className={`grid grid-cols-[96px_1fr] gap-5 py-6 sm:grid-cols-[120px_1fr_auto] ${busy === item.id ? 'opacity-50' : ''}`}>
                  <Link to={`/product/${item.slug}`}><Img src={item.imageUrl} alt={item.name} className="aspect-[4/5]" /></Link>
                  <div className="min-w-0">
                    <Link to={`/product/${item.slug}`} className="font-display text-xl">{item.name}</Link>
                    <p className="mt-1 text-sm text-espresso-muted tabular-nums">{money(item.unitPrice)} each</p>
                    <PersonalisationList data={item.personalisation} />
                    <div className="mt-4 flex items-center gap-4">
                      <QtyStepper value={item.quantity} max={item.stock} disabled={busy === item.id} onChange={(q) => update(item, q)} />
                      <button onClick={() => update(item, 0)} className="flex items-center gap-1 text-xs uppercase tracking-wide2 text-espresso-muted hover:text-espresso"><X size={13} /> Remove</button>
                    </div>
                  </div>
                  <p className="col-start-2 text-right tabular-nums sm:col-start-3">{money(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <aside className="h-fit space-y-6 bg-champagne/50 p-6 sm:p-8 lg:sticky lg:top-36">
              <h2 className="font-display text-2xl">Summary</h2>
              <CouponBox />
              <Totals cart={cart} shippingLabel="standard" />
              <p className="text-xs text-espresso-muted">Delivery options are chosen at checkout.</p>
              <Link to="/checkout" className="btn-dark w-full">Proceed to checkout</Link>
              <Link to="/shop" className="block text-center text-xs uppercase tracking-wide2 underline underline-offset-4">Continue shopping</Link>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
