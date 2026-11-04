import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Heart, Truck, Gift, Upload, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { money, date as fmtDate } from '../lib/format';
import ProductCard from '../components/ProductCard';
import { QtyStepper } from '../components/CartDrawer';
import { ErrorState, Field, Img, Notice, PageLoader, Seo, Spinner, Stars } from '../components/ui';

export default function Product() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState(null);
  const [related, setRelated] = useState([]);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setP(null); setError(null);
    api(`/api/products/${slug}`).then(setP).catch((e) => setError(e));
    api(`/api/products/${slug}/related?limit=4`).then(setRelated).catch(() => setRelated([]));
  }, [slug, reload]);

  if (error) {
    return error.status === 404
      ? <ErrorState message="This piece is no longer available. Explore the rest of the collection." />
      : <ErrorState message={error.message} onRetry={() => setReload((n) => n + 1)} />;
  }
  if (!p) return <PageLoader />;

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.shortDescription,
    image: p.images.map((i) => i.url),
    offers: { '@type': 'Offer', price: p.price, availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' },
    ...(p.reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.averageRating, reviewCount: p.reviewCount } } : {}),
  };

  return (
    <>
      <Seo title={p.name} description={p.shortDescription} image={p.images[0]?.url} type="product" jsonLd={jsonLd} />
      <div className="container-site pt-8">
        <nav className="text-[10.5px] uppercase tracking-wide2 text-espresso-muted" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-espresso">Home</Link><span className="mx-2">/</span>
          <Link to="/shop" className="hover:text-espresso">Shop</Link>
          {p.categories[0] && <><span className="mx-2">/</span><Link to={`/shop/${p.categories[0].slug}`} className="hover:text-espresso">{p.categories[0].name}</Link></>}
        </nav>
      </div>
      <section className="container-site grid gap-10 py-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-12">
        <Gallery images={p.images} name={p.name} />
        <div className="lg:sticky lg:top-36 lg:self-start">
          <Purchase p={p} />
        </div>
      </section>

      <Details p={p} />
      <Reviews slug={slug} p={p} />

      {related.length > 0 && (
        <section className="border-t border-espresso/10 py-20">
          <div className="container-site">
            <h2 className="display-md text-center">You may also love</h2>
            <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
              {related.map((r) => <ProductCard key={r.id} product={r} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Gallery({ images, name }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [{ url: null, altText: name }];
  return (
    <div className="grid gap-3 sm:grid-cols-[72px_1fr]">
      <div className="order-2 flex gap-2 sm:order-1 sm:flex-col">
        {list.length > 1 && list.map((img, i) => (
          <button key={img.url + i} onClick={() => setActive(i)} aria-label={`View image ${i + 1}`}
            className={`w-16 border transition sm:w-full ${i === active ? 'border-espresso' : 'border-transparent opacity-60 hover:opacity-100'}`}>
            <Img src={img.url} alt="" className="aspect-[4/5]" />
          </button>
        ))}
      </div>
      <div className="order-1 sm:order-2">
        <Img key={active} src={list[active].url} alt={list[active].altText || name} eager className="aspect-[4/5] animate-fadeIn" />
      </div>
    </div>
  );
}

const FIELDS = [
  ['allowName', 'name', 'Name', 'e.g. Amelia & James', 60],
  ['allowInitials', 'initials', 'Initials', 'e.g. A.J.', 6],
  ['allowDate', 'date', 'Date', 'e.g. 14 June 2027', 40],
];

function Purchase({ p }) {
  const { addToCart, toggleWishlist, wishlist, notify } = useApp();
  const [qty, setQty] = useState(1);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState('');
  const pz = p.personalisation?.enabled ? p.personalisation : null;
  const saved = wishlist.has(p.id);
  const set = (k, v) => { setValues((x) => ({ ...x, [k]: v })); setErrors((x) => ({ ...x, [k]: undefined })); };
  const hasPersonalisation = Object.values(values).some((v) => v && String(v).trim());
  const unit = Number(p.price) + (hasPersonalisation && pz ? Number(pz.extraCost || 0) : 0);

  const uploadLogo = async (file) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setErrors((x) => ({ ...x, logoUrl: 'Logos must be 8 MB or smaller.' })); return; }
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const r = await api('/api/uploads/logo', { method: 'POST', form });
      set('logoUrl', r.url);
    } catch (e) { setErrors((x) => ({ ...x, logoUrl: e.message })); } finally { setUploading(false); }
  };

  const validate = () => {
    const e = {};
    if (pz?.allowMessage && values.message && values.message.length > pz.messageMaxLength) e.message = `Please keep your message to ${pz.messageMaxLength} characters.`;
    FIELDS.forEach(([, key, label, , max]) => { if (values[key] && values[key].length > max) e[key] = `${label} must be ${max} characters or fewer.`; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const add = async () => {
    setFormError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const clean = Object.fromEntries(Object.entries(values).filter(([, v]) => v && String(v).trim()));
      await addToCart(p.id, qty, Object.keys(clean).length ? clean : undefined);
      setValues({}); setQty(1);
    } catch (e) { setFormError(e.message); notify(e.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <div>
      {p.bestseller && <span className="eyebrow">Signature piece</span>}
      <h1 className="display-lg mt-3">{p.name}</h1>
      {p.reviewCount > 0 && (
        <a href="#reviews" className="mt-3 flex items-center gap-2 text-sm text-espresso-muted"><Stars value={p.averageRating} /> {p.reviewCount} review{p.reviewCount > 1 ? 's' : ''}</a>
      )}
      <div className="mt-5 flex items-baseline gap-3">
        <span className="text-2xl tabular-nums">{money(unit)}</span>
        {p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price) && <span className="text-espresso-muted line-through">{money(p.compareAtPrice)}</span>}
      </div>
      {pz && Number(pz.extraCost) > 0 && <p className="mt-1 text-xs text-espresso-muted">Personalisation adds {money(pz.extraCost)} per piece.</p>}
      <p className="lede mt-6">{p.shortDescription}</p>
      <p className={`mt-5 text-[11px] uppercase tracking-wide2 ${p.inStock ? 'text-emerald-900' : 'text-red-900'}`}>
        {p.inStock ? (p.stock <= 10 ? `Only ${p.stock} left` : 'In stock — ready to personalise') : 'Currently sold out'}
      </p>

      {pz && (
        <fieldset className="mt-8 border border-espresso/10 bg-linen/40 p-5 sm:p-6">
          <legend className="px-2 font-display text-xl italic">Make it yours</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            {FIELDS.filter(([flag]) => pz[flag]).map(([, key, label, ph, max]) => (
              <Field key={key} label={label} error={errors[key]}>
                <input className="field" placeholder={ph} maxLength={max} value={values[key] || ''} onChange={(e) => set(key, e.target.value)} />
              </Field>
            ))}
            {pz.allowMessage && (
              <Field label={`Message (${(values.message || '').length}/${pz.messageMaxLength})`} error={errors.message} className="sm:col-span-2">
                <textarea className="field resize-none" rows={2} maxLength={pz.messageMaxLength} placeholder="A few words to remember the day"
                  value={values.message || ''} onChange={(e) => set('message', e.target.value)} />
              </Field>
            )}
            {pz.allowEventDetails && (
              <Field label="Event details" error={errors.eventDetails} className="sm:col-span-2">
                <input className="field" maxLength={300} placeholder="Event name, venue, theme…" value={values.eventDetails || ''} onChange={(e) => set('eventDetails', e.target.value)} />
              </Field>
            )}
            {pz.allowLogo && (
              <div className="sm:col-span-2">
                <span className="label">Logo</span>
                <label className="mt-1 flex cursor-pointer items-center gap-3 border border-dashed border-espresso/25 px-4 py-4 text-sm hover:border-espresso/50">
                  {uploading ? <Spinner /> : <Upload size={16} strokeWidth={1.4} />}
                  <span>{values.logoUrl ? 'Logo uploaded — choose another to replace' : 'Upload a JPEG, PNG or WebP (max 8 MB)'}</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => uploadLogo(e.target.files?.[0])} />
                </label>
                {values.logoUrl && <img src={values.logoUrl} alt="Your uploaded logo" className="no-tone mt-3 h-16 w-auto border border-espresso/10 bg-linen p-2" />}
                {errors.logoUrl && <span className="mt-1 block text-xs text-red-800">{errors.logoUrl}</span>}
              </div>
            )}
            {pz.allowInstructions && (
              <Field label="Special instructions" className="sm:col-span-2">
                <textarea className="field resize-none" rows={2} maxLength={500} placeholder="Font preference, colour, anything we should know"
                  value={values.instructions || ''} onChange={(e) => set('instructions', e.target.value)} />
              </Field>
            )}
          </div>
          <p className="mt-4 text-xs text-espresso-muted">Personalisation is optional. Please check spelling carefully — personalised pieces are made just for you.</p>
        </fieldset>
      )}

      {formError && <div className="mt-6"><Notice tone="error">{formError}</Notice></div>}

      <div className="mt-8 flex gap-3">
        <QtyStepper value={qty} max={Math.max(p.stock, 1)} onChange={setQty} disabled={!p.inStock} />
        <button onClick={add} disabled={busy || !p.inStock} className="btn-dark flex-1">{busy ? <Spinner /> : p.inStock ? 'Add to Bag' : 'Sold out'}</button>
        <button onClick={() => toggleWishlist(p.id)} aria-pressed={saved} aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center border border-espresso/20 hover:border-espresso">
          <Heart size={17} strokeWidth={1.4} className={saved ? 'fill-gold text-gold' : ''} />
        </button>
      </div>
      {!p.inStock && <Link to="/contact" className="mt-3 inline-block text-sm underline underline-offset-4">Ask us about availability</Link>}

      <ul className="mt-10 space-y-3 border-t border-espresso/10 pt-6 text-sm text-espresso-soft">
        <li className="flex gap-3"><Gift size={16} strokeWidth={1.3} className="mt-0.5 text-gold-deep" /> Presented in our signature keepsake packaging</li>
        <li className="flex gap-3"><Truck size={16} strokeWidth={1.3} className="mt-0.5 text-gold-deep" /> Tracked delivery, or collect from the studio</li>
        <li className="flex gap-3"><ShieldCheck size={16} strokeWidth={1.3} className="mt-0.5 text-gold-deep" /> Ordering for an event? <Link to="/bulk-orders#quote" className="underline underline-offset-4">Request bulk pricing</Link></li>
      </ul>
    </div>
  );
}

function Details({ p }) {
  return (
    <section className="border-t border-espresso/10 bg-champagne/30">
      <div className="container-site grid gap-12 py-16 lg:grid-cols-2 lg:py-20">
        <div>
          <h2 className="eyebrow">The Story</h2>
          <p className="mt-5 font-display text-2xl leading-snug sm:text-[1.7rem]">{p.description}</p>
        </div>
        {p.specifications.length > 0 && (
          <div>
            <h2 className="eyebrow">Specifications</h2>
            <dl className="mt-5 divide-y divide-espresso/10 border-y border-espresso/10">
              {p.specifications.map((s, i) => (
                <div key={i} className="grid grid-cols-[140px_1fr] gap-4 py-3.5 text-sm">
                  <dt className="text-espresso-muted">{s.label}</dt><dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}

function Reviews({ slug, p }) {
  const { user } = useApp();
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ rating: 5, title: '', body: '' });
  const [state, setState] = useState({ busy: false, message: '', error: '' });
  useEffect(() => { api(`/api/products/${slug}/reviews`).then(setReviews).catch(() => {}); }, [slug]);
  const submit = async (e) => {
    e.preventDefault();
    if (!form.body.trim()) { setState({ busy: false, error: 'Please write a few words about the piece.' }); return; }
    setState({ busy: true });
    try {
      await api(`/api/products/${slug}/reviews`, { method: 'POST', body: form });
      setState({ busy: false, message: 'Thank you — your review will appear once approved.' });
      setForm({ rating: 5, title: '', body: '' });
    } catch (err) { setState({ busy: false, error: err.message }); }
  };
  return (
    <section id="reviews" className="container-site grid scroll-mt-32 gap-12 py-16 lg:grid-cols-[1fr_1.4fr] lg:py-20">
      <div>
        <h2 className="display-md">Reviews</h2>
        {p.reviewCount > 0
          ? <p className="mt-3 flex items-center gap-2 text-sm"><Stars value={p.averageRating} /> {Number(p.averageRating).toFixed(1)} from {p.reviewCount}</p>
          : <p className="mt-3 text-sm text-espresso-muted">No reviews yet.</p>}
        {user ? (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} role="radio" aria-checked={form.rating === n} aria-label={`${n} stars`} onClick={() => setForm({ ...form, rating: n })}
                  className={`text-2xl ${n <= form.rating ? 'text-gold' : 'text-espresso/20'}`}>★</button>
              ))}
            </div>
            <input className="field" placeholder="Title (optional)" maxLength={140} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="field resize-none" rows={3} maxLength={2000} placeholder="Share your experience" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            {state.error && <Notice tone="error">{state.error}</Notice>}
            {state.message && <Notice tone="success">{state.message}</Notice>}
            <button className="btn-outline" disabled={state.busy}>{state.busy ? <Spinner /> : 'Submit review'}</button>
            <p className="text-xs text-espresso-muted">Reviews are open to customers with a verified email who have purchased this piece.</p>
          </form>
        ) : (
          <p className="mt-8 text-sm"><Link to="/login" className="underline underline-offset-4">Sign in</Link> to write a review.</p>
        )}
      </div>
      <ul className="divide-y divide-espresso/10">
        {reviews.map((r) => (
          <li key={r.id} className="py-6 first:pt-0">
            <Stars value={r.rating} />
            {r.title && <h3 className="mt-2 font-display text-xl">{r.title}</h3>}
            <p className="mt-2 text-sm leading-relaxed text-espresso-soft">{r.body}</p>
            <p className="mt-3 text-[11px] uppercase tracking-wide2 text-espresso-muted">{r.authorName} · {fmtDate(r.createdAt)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
