import { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, qs } from '../../lib/api';
import { money } from '../../lib/format';
import { Field, Notice, Spinner } from '../../components/ui';
import { AdminTitle, Pager, Panel, Table } from './Admin';

export default function Products() {
  return (
    <Routes>
      <Route index element={<ProductList />} />
      <Route path="new" element={<ProductForm />} />
      <Route path=":id" element={<ProductForm />} />
    </Routes>
  );
}

function ProductList() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const t = setTimeout(() => api(`/api/admin/products${qs({ q, page, size: 20 })}`).then(setData).catch((e) => setError(e.message)), 200);
    return () => clearTimeout(t);
  }, [q, page]);
  return (
    <>
      <AdminTitle title="Products">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search products…" className="field-box !w-56 !py-2 text-sm" />
        <Link to="/admin/products/new" className="btn-dark !min-h-[40px]"><Plus size={14} /> Add product</Link>
      </AdminTitle>
      {error && <Notice tone="error">{error}</Notice>}
      {!data ? <Spinner /> : (
        <>
          <Table head={['', 'Product', 'Price', 'Stock', 'Flags', '']} empty={data.content.length === 0 && 'No products found.'}>
            {data.content.map((p) => (
              <tr key={p.id} className="hover:bg-champagne/30">
                <td className="w-16 px-4 py-2">{p.imageUrl && <img src={p.imageUrl} alt="" className="h-14 w-11 object-cover" />}</td>
                <td className="px-4 py-2"><Link to={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link><p className="text-xs text-espresso-muted">{p.categorySlugs.join(', ')}</p></td>
                <td className="px-4 py-2 tabular-nums">{money(p.price)}</td>
                <td className={`px-4 py-2 tabular-nums ${p.stock <= 5 ? 'text-red-800' : ''}`}>{p.stock}</td>
                <td className="px-4 py-2 text-xs text-espresso-muted">{[p.bestseller && 'Bestseller', p.newArrival && 'New', p.personalisable && 'Personalisable'].filter(Boolean).join(' · ')}</td>
                <td className="px-4 py-2 text-right"><Link to={`/admin/products/${p.id}`} className="text-xs underline">Edit</Link></td>
              </tr>
            ))}
          </Table>
          <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}

const BLANK = {
  name: '', slug: '', shortDescription: '', description: '', specifications: '', price: '', compareAtPrice: '', stock: 0,
  active: true, featured: false, bestseller: false, newArrival: true, categoryIds: [], images: [],
  personalisation: { enabled: false, allowName: false, allowInitials: false, allowDate: false, allowMessage: false, allowLogo: false, allowEventDetails: false, allowInstructions: true, messageMaxLength: 120, extraCost: 0 },
};

function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useApp();
  const [p, setP] = useState(id ? null : BLANK);
  const [cats, setCats] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/categories').then(setCats).catch(() => {});
    if (id) {
      api(`/api/admin/products/${id}`).then((d) => setP({
        ...BLANK, ...d,
        specifications: d.specifications.map((s) => (s.label ? `${s.label}: ${s.value}` : s.value)).join('\n'),
        categoryIds: d.categories.map((c) => c.id),
        compareAtPrice: d.compareAtPrice ?? '',
        personalisation: d.personalisation || BLANK.personalisation,
      })).catch((e) => setError(e.message));
    }
  }, [id]);

  if (error && !p) return <Notice tone="error">{error}</Notice>;
  if (!p) return <Spinner />;
  const set = (k, v) => { setP({ ...p, [k]: v }); setErrors({ ...errors, [k]: undefined }); };
  const setPz = (k, v) => setP({ ...p, personalisation: { ...p.personalisation, [k]: v } });

  const upload = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const form = new FormData();
    [...files].forEach((f) => form.append('files', f));
    try {
      const res = await api('/api/admin/uploads?folder=products', { method: 'POST', form });
      setP((x) => ({ ...x, images: [...x.images, ...res.map((r) => ({ url: r.url, altText: x.name }))] }));
    } catch (e) { notify(e.message, 'error'); } finally { setUploading(false); }
  };
  const moveImage = (i, dir) => {
    const imgs = [...p.images];
    const j = i + dir;
    if (j < 0 || j >= imgs.length) return;
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    set('images', imgs);
  };

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!p.name.trim()) errs.name = 'Required';
    if (p.price === '' || Number(p.price) < 0) errs.price = 'Enter a valid price';
    if (Number(p.stock) < 0) errs.stock = 'Cannot be negative';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true); setError('');
    try {
      const body = { ...p, price: Number(p.price), compareAtPrice: p.compareAtPrice === '' ? null : Number(p.compareAtPrice), stock: Number(p.stock),
        personalisation: { ...p.personalisation, extraCost: Number(p.personalisation.extraCost || 0), messageMaxLength: Number(p.personalisation.messageMaxLength || 120) } };
      const saved = await api(id ? `/api/admin/products/${id}` : '/api/admin/products', { method: id ? 'PUT' : 'POST', body });
      notify('Product saved.');
      if (!id) navigate(`/admin/products/${saved.id}`, { replace: true });
    } catch (err) { setError(err.message); if (err.fields) setErrors(err.fields); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${p.name}”? Past orders keep their record of it.`)) return;
    try { await api(`/api/admin/products/${id}`, { method: 'DELETE' }); notify('Product deleted.'); navigate('/admin/products'); } catch (err) { notify(err.message, 'error'); }
  };

  const check = (label, checked, onChange) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded-none text-espresso" />{label}</label>
  );

  return (
    <form onSubmit={save} noValidate>
      <AdminTitle title={id ? 'Edit product' : 'New product'}>
        <Link to="/admin/products" className="btn-outline !min-h-[40px]">Back</Link>
        {id && <button type="button" onClick={remove} className="btn-outline !min-h-[40px] !border-red-900/30 !text-red-900"><Trash2 size={14} /> Delete</button>}
        {id && <a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" className="btn-outline !min-h-[40px]">View</a>}
        <button className="btn-dark !min-h-[40px]" disabled={busy}>{busy ? <Spinner /> : 'Save product'}</button>
      </AdminTitle>
      {error && <div className="mb-6"><Notice tone="error">{error}</Notice></div>}
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title="Details">
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field label="Name *" error={errors.name} className="sm:col-span-2"><input className="field-box" value={p.name} onChange={(e) => set('name', e.target.value)} /></Field>
              <Field label="URL slug (auto if blank)" className="sm:col-span-2"><input className="field-box" value={p.slug} onChange={(e) => set('slug', e.target.value)} /></Field>
              <Field label="Short description" className="sm:col-span-2"><input className="field-box" maxLength={300} value={p.shortDescription || ''} onChange={(e) => set('shortDescription', e.target.value)} /></Field>
              <Field label="Description" className="sm:col-span-2"><textarea rows={5} className="field-box" maxLength={5000} value={p.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
              <Field label="Specifications — one “Label: value” per line" className="sm:col-span-2"><textarea rows={5} className="field-box font-mono text-xs" value={p.specifications || ''} onChange={(e) => set('specifications', e.target.value)} /></Field>
            </div>
          </Panel>
          <Panel title="Images">
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {p.images.map((img, i) => (
                  <div key={img.url + i} className="group relative">
                    <img src={img.url} alt="" className="aspect-[4/5] w-full object-cover" />
                    {i === 0 && <span className="absolute left-1 top-1 bg-ivory px-1.5 text-[9px] uppercase">Main</span>}
                    <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition group-hover:opacity-100">
                      <button type="button" onClick={() => moveImage(i, -1)} className="bg-ivory p-1" aria-label="Move left"><ArrowUp size={12} className="-rotate-90" /></button>
                      <button type="button" onClick={() => set('images', p.images.filter((_, n) => n !== i))} className="bg-ivory p-1 text-red-900" aria-label="Remove image"><Trash2 size={12} /></button>
                      <button type="button" onClick={() => moveImage(i, 1)} className="bg-ivory p-1" aria-label="Move right"><ArrowDown size={12} className="-rotate-90" /></button>
                    </div>
                  </div>
                ))}
                <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-espresso/25 text-xs text-espresso-muted hover:border-espresso">
                  {uploading ? <Spinner /> : <Upload size={18} strokeWidth={1.3} />} Upload
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(e.target.files)} />
                </label>
              </div>
              <Field label="…or add an image URL" className="mt-4">
                <input className="field-box text-sm" placeholder="https://… then press Enter" onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); const url = e.currentTarget.value.trim(); if (url) { set('images', [...p.images, { url, altText: p.name }]); e.currentTarget.value = ''; } }
                }} />
              </Field>
            </div>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Pricing & stock">
            <div className="grid grid-cols-2 gap-5 p-5">
              <Field label="Price *" error={errors.price}><input type="number" step="0.01" min="0" className="field-box" value={p.price} onChange={(e) => set('price', e.target.value)} /></Field>
              <Field label="Compare-at price"><input type="number" step="0.01" min="0" className="field-box" value={p.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} /></Field>
              <Field label="Stock" error={errors.stock}><input type="number" min="0" className="field-box" value={p.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
            </div>
          </Panel>
          <Panel title="Visibility">
            <div className="grid grid-cols-2 gap-3 p-5">
              {check('Active (visible)', p.active, (v) => set('active', v))}
              {check('Featured', p.featured, (v) => set('featured', v))}
              {check('Bestseller', p.bestseller, (v) => set('bestseller', v))}
              {check('New arrival', p.newArrival, (v) => set('newArrival', v))}
            </div>
          </Panel>
          <Panel title="Categories">
            <div className="grid gap-2 p-5">
              {cats.map((c) => check(c.name, p.categoryIds.includes(c.id), (v) => set('categoryIds', v ? [...p.categoryIds, c.id] : p.categoryIds.filter((x) => x !== c.id))))}
            </div>
          </Panel>
          <Panel title="Personalisation">
            <div className="space-y-3 p-5">
              {check('Offer personalisation', p.personalisation.enabled, (v) => setPz('enabled', v))}
              {p.personalisation.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-2 border-t border-espresso/10 pt-3">
                    {[['allowName', 'Name'], ['allowInitials', 'Initials'], ['allowDate', 'Date'], ['allowMessage', 'Message'], ['allowLogo', 'Logo upload'], ['allowEventDetails', 'Event details'], ['allowInstructions', 'Special instructions']]
                      .map(([k, l]) => <div key={k}>{check(l, p.personalisation[k], (v) => setPz(k, v))}</div>)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <Field label="Message max length"><input type="number" min="10" max="1000" className="field-box" value={p.personalisation.messageMaxLength} onChange={(e) => setPz('messageMaxLength', e.target.value)} /></Field>
                    <Field label="Extra cost"><input type="number" step="0.01" min="0" className="field-box" value={p.personalisation.extraCost} onChange={(e) => setPz('extraCost', e.target.value)} /></Field>
                  </div>
                </>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
}
