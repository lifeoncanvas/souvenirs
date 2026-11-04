import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { Img, Spinner } from './ui';

export default function ProductCard({ product, eager }) {
  const { addToCart, toggleWishlist, wishlist, notify } = useApp();
  const [adding, setAdding] = useState(false);
  const [quick, setQuick] = useState(false);
  const saved = wishlist.has(product.id);

  const add = async () => {
    if (product.personalisable) return; // handled by link to product page
    setAdding(true);
    try { await addToCart(product.id, 1); } catch (e) { notify(e.message, 'error'); } finally { setAdding(false); }
  };

  return (
    <article className="group flex flex-col">
      <div className="relative">
        <Link to={`/product/${product.slug}`} className="block" aria-label={product.name}>
          <Img src={product.imageUrl} alt={product.imageAlt} eager={eager} className="aspect-[4/5]"
            imgClassName="transition-transform duration-[1400ms] ease-silk group-hover:scale-[1.04]" />
          {product.hoverImageUrl && (
            <img src={product.hoverImageUrl} alt="" loading="lazy" aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
          )}
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
          {!product.inStock && <span className="bg-ivory/90 px-2.5 py-1 text-[9.5px] uppercase tracking-wide2">Sold out</span>}
          {product.newArrival && product.inStock && <span className="bg-ivory/90 px-2.5 py-1 text-[9.5px] uppercase tracking-wide2">New</span>}
          {product.bestseller && product.inStock && <span className="bg-espresso/85 px-2.5 py-1 text-[9.5px] uppercase tracking-wide2 text-ivory">Signature</span>}
        </div>
        <button onClick={() => toggleWishlist(product.id)} aria-pressed={saved} aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ivory/85 text-espresso backdrop-blur transition hover:bg-ivory">
          <Heart size={15} strokeWidth={1.5} className={saved ? 'fill-gold text-gold' : ''} />
        </button>
        <div className="absolute inset-x-3 bottom-3 grid translate-y-2 grid-cols-[1fr_auto] gap-2 opacity-0 transition duration-500 ease-silk group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 max-lg:translate-y-0 max-lg:opacity-100">
          {product.personalisable ? (
            <Link to={`/product/${product.slug}`} className="btn-light !min-h-[40px] !px-3">Personalise</Link>
          ) : (
            <button onClick={add} disabled={adding || !product.inStock} className="btn-light !min-h-[40px] !px-3">
              {adding ? <Spinner /> : product.inStock ? 'Add to Bag' : 'Sold out'}
            </button>
          )}
          <button onClick={() => setQuick(true)} className="btn-light !min-h-[40px] !px-3" aria-label={`Quick view ${product.name}`}><Eye size={15} strokeWidth={1.5} /></button>
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <Link to={`/product/${product.slug}`} className="font-display text-[1.35rem] leading-tight transition-colors hover:text-gold-deep">{product.name}</Link>
        {product.shortDescription && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-espresso-muted">{product.shortDescription}</p>}
        <div className="mt-2 flex items-center gap-3 text-sm">
          <span className="tabular-nums">{money(product.price)}</span>
          {product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price) && (
            <span className="text-espresso-muted line-through">{money(product.compareAtPrice)}</span>
          )}
          {product.personalisable && <span className="text-[10px] uppercase tracking-wide2 text-gold-deep">· Personalisable</span>}
        </div>
      </div>
      {quick && <QuickView slug={product.slug} onClose={() => setQuick(false)} />}
    </article>
  );
}

function QuickView({ slug, onClose }) {
  const { addToCart, notify } = useApp();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api(`/api/products/${slug}`).then(setP).catch((e) => setError(e.message));
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [slug, onClose]);
  const add = async () => {
    setBusy(true);
    try { await addToCart(p.id, 1); onClose(); } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Quick view">
      <div className="absolute inset-0 animate-fadeIn bg-ink/50" onClick={onClose} />
      <div className="relative grid max-h-[92vh] w-full max-w-4xl animate-fadeUp overflow-y-auto bg-ivory sm:grid-cols-2">
        <button onClick={onClose} className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-ivory/80" aria-label="Close"><X size={18} /></button>
        {!p && !error && <div className="col-span-2 flex h-80 items-center justify-center"><Spinner /></div>}
        {error && <p className="col-span-2 p-10 text-center">{error}</p>}
        {p && (
          <>
            <Img src={p.images[0]?.url} alt={p.images[0]?.altText || p.name} className="aspect-[4/5] sm:aspect-auto sm:h-full" />
            <div className="flex flex-col gap-4 p-7 sm:p-10">
              <span className="eyebrow">{p.categories[0]?.name}</span>
              <h3 className="display-md">{p.name}</h3>
              <p className="text-lg tabular-nums">{money(p.price)}</p>
              <p className="lede">{p.shortDescription}</p>
              <p className={`text-xs uppercase tracking-wide2 ${p.inStock ? 'text-emerald-900' : 'text-red-900'}`}>{p.inStock ? 'In stock' : 'Currently sold out'}</p>
              <div className="mt-auto grid gap-2 pt-4">
                {p.personalisation?.enabled ? (
                  <Link to={`/product/${p.slug}`} onClick={onClose} className="btn-dark">Personalise this piece</Link>
                ) : (
                  <button onClick={add} disabled={busy || !p.inStock} className="btn-dark">{busy ? <Spinner /> : 'Add to Bag'}</button>
                )}
                <Link to={`/product/${p.slug}`} onClick={onClose} className="btn-outline">View full details</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
