import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { date, money } from '../../lib/format';
import { Field, Notice, Spinner } from '../../components/ui';
import { AdminTitle, Panel, StatusPill, Table } from './Admin';

/* ---------------- Site content (CMS) ---------------- */

const BLOCKS = [
  ['hero', 'Homepage hero'], ['about', 'About Us'], ['occasions', 'Events & occasions'], ['personalised', 'Personalised gifting'],
  ['corporate', 'Corporate gifting'], ['giftBoxes', 'Gift boxes'], ['bulk', 'Bulk & event orders'], ['instagram', 'Instagram'],
  ['contact', 'Contact details'], ['store', 'Store settings'],
  ['policyPrivacy', 'Privacy policy'], ['policyTerms', 'Terms & conditions'], ['policyShipping', 'Delivery policy'], ['policyReturns', 'Returns policy'],
];
const isLong = (k, v) => typeof v === 'string' && (v.length > 80 || /body|text|description|subheadline|note/i.test(k));

function ValueEditor({ name, value, onChange }) {
  if (typeof value === 'boolean') {
    return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded-none" />{name}</label>;
  }
  if (Array.isArray(value)) {
    if (value.every((x) => typeof x === 'string')) {
      return (
        <Field label={`${name} — one per line`}>
          <textarea rows={Math.min(Math.max(value.length + 1, 3), 10)} className="field-box text-sm" value={value.join('\n')} onChange={(e) => onChange(e.target.value.split('\n'))}
            onBlur={(e) => onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))} />
        </Field>
      );
    }
    return (
      <div>
        <span className="label">{name}</span>
        <div className="space-y-3">
          {value.map((item, i) => (
            <div key={i} className="relative border border-espresso/10 bg-linen/50 p-4">
              <button type="button" onClick={() => onChange(value.filter((_, n) => n !== i))} className="absolute right-3 top-3 text-red-900" aria-label="Remove item"><Trash2 size={14} /></button>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(item).map(([k, v]) => (
                  <div key={k} className={isLong(k, v) ? 'sm:col-span-2' : ''}>
                    <ValueEditor name={k} value={v} onChange={(nv) => onChange(value.map((x, n) => (n === i ? { ...x, [k]: nv } : x)))} />
                  </div>
                ))}
              </div>
              {Object.keys(item).includes('image') && item.image && <img src={item.image} alt="" className="mt-3 h-16 w-16 object-cover" />}
            </div>
          ))}
          {value[0] && (
            <button type="button" className="btn-outline !min-h-[36px] !px-4" onClick={() => onChange([...value, Object.fromEntries(Object.keys(value[0]).map((k) => [k, '']))])}>
              <Plus size={13} /> Add item
            </button>
          )}
        </div>
      </div>
    );
  }
  if (value && typeof value === 'object') {
    return <Field label={name}><textarea rows={4} className="field-box font-mono text-xs" value={JSON.stringify(value, null, 2)} onChange={(e) => { try { onChange(JSON.parse(e.target.value)); } catch { /* wait for valid JSON */ } }} /></Field>;
  }
  return (
    <Field label={name}>
      {isLong(name, value)
        ? <textarea rows={name.startsWith('body') ? 8 : 3} className="field-box text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        : <input className="field-box text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
      {/image/i.test(name) && value && <img src={value} alt="" className="mt-2 h-24 w-auto object-cover" />}
    </Field>
  );
}

export function ContentEditor() {
  const { content, setContent, notify } = useApp();
  const [key, setKey] = useState('hero');
  const [draft, setDraft] = useState(null);
  const [raw, setRaw] = useState(false);
  const [rawText, setRawText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const base = content[key] ?? (key.startsWith('policy') ? { body: '' } : {});
    setDraft(base); setRawText(JSON.stringify(base, null, 2)); setError('');
  }, [key, content]);

  const save = async () => {
    let value = draft;
    if (raw) {
      try { value = JSON.parse(rawText); } catch { setError('The JSON is not valid.'); return; }
    }
    setBusy(true); setError('');
    try {
      const saved = await api(`/api/admin/content/${key}`, { method: 'PUT', body: value });
      setContent({ ...content, [key]: saved });
      notify('Content published.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <AdminTitle title="Site content">
        <button className="btn-outline !min-h-[40px]" onClick={() => { setRaw(!raw); setRawText(JSON.stringify(draft, null, 2)); }}>{raw ? 'Form view' : 'JSON view'}</button>
        <button className="btn-dark !min-h-[40px]" onClick={save} disabled={busy}>{busy ? <Spinner /> : 'Publish'}</button>
      </AdminTitle>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-col border border-espresso/10 bg-ivory">
          {BLOCKS.map(([k, l]) => (
            <button key={k} onClick={() => setKey(k)} className={`border-b border-espresso/5 px-4 py-2.5 text-left text-sm ${key === k ? 'bg-champagne font-medium' : 'hover:bg-champagne/40'}`}>{l}</button>
          ))}
        </nav>
        <Panel title={BLOCKS.find(([k]) => k === key)?.[1]}>
          <div className="space-y-5 p-5">
            {error && <Notice tone="error">{error}</Notice>}
            {key === 'store' && <Notice>Currency uses ISO codes (e.g. GBP, EUR, USD, INR) and locale such as en-GB.</Notice>}
            {raw || !draft
              ? <textarea rows={24} className="field-box font-mono text-xs" value={rawText} onChange={(e) => setRawText(e.target.value)} />
              : Object.entries(draft).map(([k, v]) => <ValueEditor key={k} name={k} value={v} onChange={(nv) => setDraft({ ...draft, [k]: nv })} />)}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ---------------- Generic CRUD list ---------------- */

function CrudList({ title, endpoint, adminEndpoint = endpoint, blank, columns, fields, sortHint }) {
  const { notify } = useApp();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const load = () => api(adminEndpoint).then(setItems).catch((e) => notify(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      await api(editing.id ? `${adminEndpoint}/${editing.id}` : adminEndpoint, { method: editing.id ? 'PUT' : 'POST', body: editing });
      setEditing(null); load(); notify('Saved.');
    } catch (err) { notify(err.message, 'error'); setErrors(err.fields || {}); } finally { setBusy(false); }
  };
  const remove = async (item) => {
    if (!window.confirm('Delete this item?')) return;
    try { await api(`${adminEndpoint}/${item.id}`, { method: 'DELETE' }); load(); } catch (err) { notify(err.message, 'error'); }
  };

  return (
    <>
      <AdminTitle title={title}><button className="btn-dark !min-h-[40px]" onClick={() => setEditing({ ...blank })}><Plus size={14} /> Add</button></AdminTitle>
      {sortHint && <p className="mb-4 text-xs text-espresso-muted">{sortHint}</p>}
      {editing && (
        <Panel title={editing.id ? 'Edit' : 'New'} className="mb-6">
          <form onSubmit={save} className="grid gap-5 p-5 sm:grid-cols-2">
            {fields.map(([k, label, type = 'text', opts]) => (
              <div key={k} className={type === 'textarea' ? 'sm:col-span-2' : ''}>
                {type === 'checkbox' ? (
                  <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={!!editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.checked })} className="h-4 w-4 rounded-none" />{label}</label>
                ) : (
                  <Field label={label} error={errors[k]}>
                    {type === 'textarea' ? <textarea rows={4} className="field-box" value={editing[k] ?? ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
                      : type === 'select' ? <select className="field-box" value={editing[k] ?? ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}>{opts.map((o) => <option key={o}>{o}</option>)}</select>
                        : <input type={type} className="field-box" value={editing[k] ?? ''} onChange={(e) => setEditing({ ...editing, [k]: type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value })} />}
                  </Field>
                )}
              </div>
            ))}
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" className="btn-outline !min-h-[40px]" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-dark !min-h-[40px]" disabled={busy}>{busy ? <Spinner /> : 'Save'}</button>
            </div>
          </form>
        </Panel>
      )}
      {!items ? <Spinner /> : (
        <Table head={[...columns.map((c) => c[0]), '']} empty={items.length === 0 && 'Nothing here yet.'}>
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-champagne/30">
              {columns.map(([h, render]) => <td key={h} className="px-4 py-3 align-top">{render(item)}</td>)}
              <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                <button onClick={() => setEditing({ ...item })} className="underline">Edit</button>
                <button onClick={() => remove(item)} className="ml-3 text-red-900 underline">Delete</button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

export function Testimonials() {
  return (
    <CrudList title="Testimonials" adminEndpoint="/api/admin/testimonials"
      blank={{ authorName: '', occasion: '', quote: '', rating: 5, active: true, placeholder: false, sortOrder: 0 }}
      sortHint="Only publish genuine reviews with the customer's permission. Placeholder items are labelled on the site."
      columns={[['Author', (t) => <>{t.authorName}<p className="text-xs text-espresso-muted">{t.occasion}</p></>], ['Quote', (t) => <span className="line-clamp-2 max-w-md">{t.quote}</span>], ['Rating', (t) => '★'.repeat(t.rating)],
        ['Status', (t) => <>{t.active ? 'Live' : 'Hidden'}{t.placeholder && <span className="ml-2 text-xs text-gold-deep">placeholder</span>}</>]]}
      fields={[['authorName', 'Author name'], ['occasion', 'Occasion'], ['quote', 'Quote', 'textarea'], ['rating', 'Rating (1–5)', 'number'], ['sortOrder', 'Sort order', 'number'], ['active', 'Show on site', 'checkbox'], ['placeholder', 'Placeholder (label on site)', 'checkbox']]} />
  );
}

export function Faqs() {
  return (
    <CrudList title="FAQs" adminEndpoint="/api/admin/faqs"
      blank={{ category: 'Delivery', question: '', answer: '', sortOrder: 0, active: true }}
      columns={[['Category', (f) => f.category], ['Question', (f) => f.question], ['Order', (f) => f.sortOrder], ['Status', (f) => (f.active ? 'Live' : 'Hidden')]]}
      fields={[['category', 'Category'], ['sortOrder', 'Sort order', 'number'], ['question', 'Question'], ['active', 'Show on site', 'checkbox'], ['answer', 'Answer', 'textarea']]} />
  );
}

export function Coupons() {
  return (
    <CrudList title="Coupons" adminEndpoint="/api/admin/coupons"
      blank={{ code: '', type: 'PERCENT', amount: 10, minOrderTotal: null, expiresAt: null, usageLimit: null, usedCount: 0, active: true }}
      columns={[['Code', (c) => <span className="font-medium tracking-wide">{c.code}</span>], ['Discount', (c) => (c.type === 'PERCENT' ? `${c.amount}%` : money(c.amount))],
        ['Minimum', (c) => (c.minOrderTotal ? money(c.minOrderTotal) : '—')], ['Used', (c) => `${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : ''}`],
        ['Expires', (c) => (c.expiresAt ? date(c.expiresAt) : '—')], ['Status', (c) => (c.active ? 'Active' : 'Off')]]}
      fields={[['code', 'Code'], ['type', 'Type', 'select', ['PERCENT', 'FIXED']], ['amount', 'Amount', 'number'], ['minOrderTotal', 'Minimum order', 'number'], ['usageLimit', 'Usage limit', 'number'], ['active', 'Active', 'checkbox']]} />
  );
}

export function Categories() {
  const { notify } = useApp();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = () => api('/api/categories').then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const save = async (e) => {
    e.preventDefault();
    try {
      await api(editing.id ? `/api/admin/categories/${editing.id}` : '/api/admin/categories', { method: editing.id ? 'PUT' : 'POST', body: editing });
      setEditing(null); load(); notify('Category saved.');
    } catch (err) { notify(err.message, 'error'); }
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete “${c.name}”? Products stay, but lose this category.`)) return;
    try { await api(`/api/admin/categories/${c.id}`, { method: 'DELETE' }); load(); } catch (err) { notify(err.message, 'error'); }
  };
  return (
    <>
      <AdminTitle title="Categories"><button className="btn-dark !min-h-[40px]" onClick={() => setEditing({ name: '', slug: '', description: '', imageUrl: '', sortOrder: 0, featured: true })}><Plus size={14} /> Add</button></AdminTitle>
      {editing && (
        <Panel title={editing.id ? 'Edit category' : 'New category'} className="mb-6">
          <form onSubmit={save} className="grid gap-5 p-5 sm:grid-cols-2">
            <Field label="Name"><input className="field-box" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></Field>
            <Field label="URL slug"><input className="field-box" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} /></Field>
            <Field label="Description" className="sm:col-span-2"><input className="field-box" value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
            <Field label="Image URL" className="sm:col-span-2"><input className="field-box" value={editing.imageUrl || ''} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} /></Field>
            <Field label="Sort order"><input type="number" className="field-box" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} /></Field>
            <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} className="h-4 w-4 rounded-none" />Feature on homepage</label>
            <div className="flex gap-2 sm:col-span-2"><button type="button" className="btn-outline !min-h-[40px]" onClick={() => setEditing(null)}>Cancel</button><button className="btn-dark !min-h-[40px]">Save</button></div>
          </form>
        </Panel>
      )}
      {!items ? <Spinner /> : (
        <Table head={['', 'Name', 'Slug', 'Order', 'Homepage', '']}>
          {items.map((c) => (
            <tr key={c.id}>
              <td className="w-16 px-4 py-2">{c.imageUrl && <img src={c.imageUrl} alt="" className="h-12 w-12 object-cover" />}</td>
              <td className="px-4 py-2 font-medium">{c.name}</td><td className="px-4 py-2 text-espresso-muted">{c.slug}</td><td className="px-4 py-2">{c.sortOrder}</td><td className="px-4 py-2">{c.featured ? 'Yes' : '—'}</td>
              <td className="px-4 py-2 text-right text-xs"><button onClick={() => setEditing({ ...c })} className="underline">Edit</button><button onClick={() => remove(c)} className="ml-3 text-red-900 underline">Delete</button></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

export function Reviews() {
  const { notify } = useApp();
  const [items, setItems] = useState(null);
  const load = () => api('/api/admin/reviews').then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const moderate = async (r, approved) => { try { await api(`/api/admin/reviews/${r.id}`, { method: 'PATCH', body: { approved } }); load(); } catch (e) { notify(e.message, 'error'); } };
  const remove = async (r) => { if (window.confirm('Delete this review?')) { await api(`/api/admin/reviews/${r.id}`, { method: 'DELETE' }); load(); } };
  return (
    <>
      <AdminTitle title="Reviews" />
      {!items ? <Spinner /> : (
        <Table head={['Product', 'Review', 'Rating', 'Status', '']} empty={items.length === 0 && 'No reviews yet.'}>
          {items.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3">{r.productName}<p className="text-xs text-espresso-muted">{r.authorName} · {date(r.createdAt)}</p></td>
              <td className="max-w-md px-4 py-3">{r.title && <strong className="font-medium">{r.title}. </strong>}{r.body}</td>
              <td className="px-4 py-3">{'★'.repeat(r.rating)}</td>
              <td className="px-4 py-3"><StatusPill value={r.approved ? 'PAID' : 'PENDING'} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                <button onClick={() => moderate(r, !r.approved)} className="underline">{r.approved ? 'Unpublish' : 'Approve'}</button>
                <button onClick={() => remove(r)} className="ml-3 text-red-900 underline">Delete</button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}

export function Newsletter() {
  const [items, setItems] = useState(null);
  useEffect(() => { api('/api/admin/newsletter').then(setItems).catch(() => {}); }, []);
  const exportCsv = () => {
    const csv = ['email,subscribed_at,active', ...items.map((s) => `${s.email},${s.createdAt},${s.active}`)].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'newsletter-subscribers.csv';
    a.click();
  };
  return (
    <>
      <AdminTitle title="Newsletter">{items?.length > 0 && <button className="btn-outline !min-h-[40px]" onClick={exportCsv}>Export CSV</button>}</AdminTitle>
      {!items ? <Spinner /> : (
        <Table head={['Email', 'Subscribed', 'Status']} empty={items.length === 0 && 'No subscribers yet.'}>
          {items.map((s) => <tr key={s.id}><td className="px-4 py-3">{s.email}</td><td className="px-4 py-3 text-espresso-muted">{date(s.createdAt)}</td><td className="px-4 py-3">{s.active ? 'Subscribed' : 'Unsubscribed'}</td></tr>)}
        </Table>
      )}
    </>
  );
}
