import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { api, qs } from '../lib/api';
import { money } from '../lib/format';
import ProductCard from '../components/ProductCard';
import { EmptyState, ErrorState, Seo, Spinner } from '../components/ui';

const COLLECTIONS = [
  ['all', 'All Products'],
  ['wedding-souvenirs', 'Wedding Souvenirs'],
  ['birthday-gifts', 'Birthday Gifts'],
  ['personalised-gifts', 'Personalised Gifts'],
  ['corporate-gifts', 'Corporate Gifts'],
  ['gift-boxes', 'Gift Boxes'],
  ['new-arrivals', 'New Arrivals'],
  ['bestsellers', 'Bestsellers'],
];
const SORTS = [
  ['featured', 'Featured'], ['popular', 'Most popular'], ['newest', 'Newest arrivals'],
  ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'],
];

export default function Shop() {
  const { category = 'all' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [range, setRange] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reload, setReload] = useState(0);

  const q = params.get('q') || '';
  const sort = params.get('sort') || 'featured';
  const minPrice = params.get('min') || '';
  const maxPrice = params.get('max') || '';
  const inStock = params.get('stock') === '1';
  const personalisable = params.get('personal') === '1';
  const page = Number(params.get('page') || 0);

  useEffect(() => {
    api('/api/categories').then(setCategories).catch(() => {});
    api('/api/products/price-range').then(setRange).catch(() => {});
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setError('');
    setData((d) => (d ? { ...d, loading: true } : null));
    api(`/api/products${qs({ q, category, sort, minPrice, maxPrice, inStock: inStock || undefined, personalisable: personalisable || undefined, page, size: 12 })}`, { signal: ctrl.signal })
      .then(setData)
      .catch((e) => { if (e.name !== 'AbortError') setError(e.message); });
    return () => ctrl.abort();
  }, [q, category, sort, minPrice, maxPrice, inStock, personalisable, page, reload]);

  const current = useMemo(() => {
    const c = categories.find((x) => x.slug === category);
    const label = COLLECTIONS.find(([s]) => s === category)?.[1];
    return { name: c?.name || label || 'The Collection', description: c?.description };
  }, [categories, category]);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === '' || v == null || v === false ? next.delete(k) : next.set(k, v)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const activeFilters = [minPrice && `From ${money(minPrice)}`, maxPrice && `Up to ${money(maxPrice)}`, inStock && 'In stock', personalisable && 'Personalisable'].filter(Boolean);

  const filters = (
    <div className="space-y-10">
      <div>
        <h3 className="label mb-4">Collections</h3>
        <ul className="space-y-2.5">
          {COLLECTIONS.map(([slug, label]) => (
            <li key={slug}>
              <button onClick={() => { navigate(slug === 'all' ? `/shop${q ? `?q=${encodeURIComponent(q)}` : ''}` : `/shop/${slug}${q ? `?q=${encodeURIComponent(q)}` : ''}`); setFiltersOpen(false); }}
                className={`text-left font-display text-lg transition-colors hover:text-gold-deep ${category === slug ? 'text-gold-deep italic' : ''}`}>{label}</button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="label mb-4">Price {range && <span className="normal-case tracking-normal text-espresso-muted">({money(range.min)} – {money(range.max)})</span>}</h3>
        <div className="flex items-center gap-3">
          <input type="number" min="0" inputMode="decimal" placeholder="Min" defaultValue={minPrice} key={`min-${minPrice}`}
            onBlur={(e) => set({ min: e.target.value })} className="field-box !py-2" aria-label="Minimum price" />
          <span className="text-espresso-muted">—</span>
          <input type="number" min="0" inputMode="decimal" placeholder="Max" defaultValue={maxPrice} key={`max-${maxPrice}`}
            onBlur={(e) => set({ max: e.target.value })} className="field-box !py-2" aria-label="Maximum price" />
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="label mb-4">Availability</h3>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={inStock} onChange={(e) => set({ stock: e.target.checked ? '1' : '' })} className="h-4 w-4 rounded-none border-espresso/30 text-espresso focus:ring-gold" />
          In stock only
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={personalisable} onChange={(e) => set({ personal: e.target.checked ? '1' : '' })} className="h-4 w-4 rounded-none border-espresso/30 text-espresso focus:ring-gold" />
          Personalisable
        </label>
      </div>
    </div>
  );

  return (
    <>
      <Seo title={q ? `Search: ${q}` : current.name} description={current.description || 'Explore luxury souvenirs, personalised gifts and curated gift boxes.'} />
      <section className="border-b border-espresso/10 bg-champagne/40">
        <div className="container-site py-14 text-center sm:py-20">
          <nav className="text-[10.5px] uppercase tracking-wide2 text-espresso-muted" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-espresso">Home</Link> <span className="mx-2">/</span> <Link to="/shop" className="hover:text-espresso">Shop</Link>
            {category !== 'all' && <><span className="mx-2">/</span><span className="text-espresso">{current.name}</span></>}
          </nav>
          <h1 className="display-lg mt-5">{q ? <>Results for <em>“{q}”</em></> : current.name}</h1>
          {current.description && !q && <p className="lede mx-auto mt-4 max-w-lg">{current.description}</p>}
        </div>
      </section>

      <div className="container-site grid gap-12 py-12 lg:grid-cols-[220px_1fr] lg:py-16">
        <aside className="hidden lg:block">{filters}</aside>

        <div>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-espresso/10 pb-5">
            <div className="flex items-center gap-3">
              <button className="btn-outline !min-h-[40px] !px-4 lg:hidden" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={14} /> Filter</button>
              <p className="text-sm text-espresso-muted">{data ? `${data.totalElements} ${data.totalElements === 1 ? 'piece' : 'pieces'}` : ' '}</p>
            </div>
            <div className="flex items-center gap-3">
              <form onSubmit={(e) => { e.preventDefault(); set({ q: new FormData(e.currentTarget).get('q') }); }} className="hidden sm:block">
                <input name="q" defaultValue={q} key={q} placeholder="Search…" className="field-box !w-48 !py-2 text-sm" aria-label="Search products" />
              </form>
              <label className="sr-only" htmlFor="sort">Sort by</label>
              <select id="sort" value={sort} onChange={(e) => set({ sort: e.target.value })} className="field-box !w-auto !py-2 pr-9 text-sm">
                {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          {(activeFilters.length > 0 || q) && (
            <div className="mb-8 flex flex-wrap gap-2">
              {q && <button onClick={() => set({ q: '' })} className="flex items-center gap-2 border border-espresso/15 px-3 py-1.5 text-xs">“{q}” <X size={12} /></button>}
              {activeFilters.map((f) => <span key={f} className="border border-espresso/15 px-3 py-1.5 text-xs">{f}</span>)}
              <button onClick={() => setParams({}, { replace: true })} className="px-2 text-xs underline underline-offset-4">Clear all</button>
            </div>
          )}

          {error && <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />}
          {!data && !error && <div className="flex justify-center py-24"><Spinner /></div>}
          {data && data.content.length === 0 && (
            <EmptyState title="Nothing here just yet." text="Try another collection, or loosen your filters." action={<button onClick={() => navigate('/shop')} className="btn-outline">View all products</button>} />
          )}
          {data && data.content.length > 0 && (
            <div className={`grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 xl:grid-cols-3 ${data.loading ? 'opacity-60' : ''} transition-opacity`}>
              {data.content.map((p, i) => <ProductCard key={p.id} product={p} eager={i < 3} />)}
            </div>
          )}
          {data && data.totalPages > 1 && (
            <nav className="mt-16 flex items-center justify-center gap-2" aria-label="Pagination">
              {Array.from({ length: data.totalPages }, (_, n) => (
                <button key={n} onClick={() => { set({ page: n || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-current={n === page ? 'page' : undefined}
                  className={`h-10 w-10 text-sm ${n === page ? 'bg-espresso text-ivory' : 'border border-espresso/15 hover:border-espresso'}`}>{n + 1}</button>
              ))}
            </nav>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-sm animate-fadeIn overflow-y-auto bg-ivory p-6">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-display text-2xl">Filter</h2>
              <button onClick={() => setFiltersOpen(false)} className="flex h-10 w-10 items-center justify-center" aria-label="Close filters"><X size={20} /></button>
            </div>
            {filters}
            <button className="btn-dark mt-10 w-full" onClick={() => setFiltersOpen(false)}>Show results</button>
          </div>
        </div>
      )}
    </>
  );
}
