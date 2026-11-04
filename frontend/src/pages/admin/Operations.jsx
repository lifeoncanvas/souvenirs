import { useEffect, useState } from 'react';
import { Link, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { api, qs } from '../../lib/api';
import { date, money, titleCase } from '../../lib/format';
import { PersonalisationList } from '../../components/CartDrawer';
import { Field, Notice, Spinner } from '../../components/ui';
import { AdminTitle, Pager, Panel, StatusPill, Table } from './Admin';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUSES = ['UNPAID', 'PENDING', 'PAID', 'REFUNDED', 'FAILED'];
const ENQUIRY_STATUSES = ['NEW', 'IN_PROGRESS', 'QUOTED', 'CONFIRMED', 'CLOSED'];

function Select({ value, onChange, options, all = 'All' }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="field-box !w-auto !py-2 pr-9 text-sm">
      {all && <option value="">{all}</option>}
      {options.map((o) => <option key={o} value={o}>{titleCase(o)}</option>)}
    </select>
  );
}

/* ---------------- Orders ---------------- */

export function Orders() {
  return (
    <Routes>
      <Route index element={<OrderList />} />
      <Route path=":id" element={<OrderDetail />} />
    </Routes>
  );
}

function OrderList() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const status = params.get('status') || '';
  const paymentStatus = params.get('paymentStatus') || '';
  const page = Number(params.get('page') || 0);
  const set = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setParams(n, { replace: true }); };
  useEffect(() => {
    const t = setTimeout(() => api(`/api/admin/orders${qs({ q, status, paymentStatus, page })}`).then(setData).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q, status, paymentStatus, page]);
  return (
    <>
      <AdminTitle title="Orders">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order no., name, email…" className="field-box !w-56 !py-2 text-sm" />
        <Select value={status} onChange={(v) => set('status', v)} options={ORDER_STATUSES} all="All statuses" />
        <Select value={paymentStatus} onChange={(v) => set('paymentStatus', v)} options={PAYMENT_STATUSES} all="All payments" />
      </AdminTitle>
      {!data ? <Spinner /> : (
        <>
          <Table head={['Order', 'Date', 'Customer', 'Status', 'Payment', 'Total']} empty={data.content.length === 0 && 'No orders match.'}>
            {data.content.map((o) => (
              <tr key={o.id} className="hover:bg-champagne/30">
                <td className="px-4 py-3"><Link to={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.orderNumber}</Link></td>
                <td className="px-4 py-3 text-espresso-muted">{date(o.createdAt)}</td>
                <td className="px-4 py-3">{o.customerName}<p className="text-xs text-espresso-muted">{o.email}</p></td>
                <td className="px-4 py-3"><StatusPill value={o.status} /></td>
                <td className="px-4 py-3"><StatusPill value={o.paymentStatus} /></td>
                <td className="px-4 py-3 tabular-nums">{money(o.total)}</td>
              </tr>
            ))}
          </Table>
          <Pager page={data.page} totalPages={data.totalPages} onPage={(p) => set('page', p || '')} />
        </>
      )}
    </>
  );
}

function OrderDetail() {
  const { id } = useParams();
  const { notify } = useApp();
  const [o, setO] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    api(`/api/admin/orders/${id}`).then((d) => { setO(d); setForm({ status: d.status, paymentStatus: d.paymentStatus, carrier: d.carrier || '', trackingNumber: d.trackingNumber || '', adminNotes: d.adminNotes || '' }); })
      .catch((e) => setError(e.message));
  }, [id]);
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!o) return <Spinner />;
  const save = async () => {
    if (form.status === 'CANCELLED' && o.status !== 'CANCELLED' && !window.confirm('Cancel this order? Stock will be returned to inventory.')) return;
    setBusy(true);
    try {
      const d = await api(`/api/admin/orders/${id}`, { method: 'PATCH', body: form });
      setO(d); notify('Order updated. The customer is emailed when the status changes.');
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };
  const paypalCapture = o.payments.find((p) => p.provider === 'paypal' && p.captureReference);
  const refund = async () => {
    if (!window.confirm(`Refund ${money(o.total)} to the customer's PayPal account? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const d = await api(`/api/admin/orders/${id}/refund`, { method: 'POST' });
      setO(d); setForm({ ...form, paymentStatus: d.paymentStatus, adminNotes: d.adminNotes || '' });
      notify('Refund issued. The customer has been emailed.');
    } catch (e) { notify(e.message, 'error'); } finally { setBusy(false); }
  };
  const a = o.shippingAddress;
  return (
    <>
      <AdminTitle title={o.orderNumber}>
        <Link to="/admin/orders" className="btn-outline !min-h-[40px]">Back</Link>
      </AdminTitle>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title={`Items · placed ${date(o.createdAt)}`}>
            <ul className="divide-y divide-espresso/5">
              {o.items.map((i, n) => (
                <li key={n} className="flex gap-4 p-5">
                  {i.imageUrl && <img src={i.imageUrl} alt="" className="h-20 w-16 object-cover" />}
                  <div className="flex-1">
                    <div className="flex justify-between gap-3 text-sm"><span className="font-medium">{i.productName}</span><span className="tabular-nums">{i.quantity} × {money(i.unitPrice)} = {money(i.lineTotal)}</span></div>
                    {i.personalisation
                      ? <div className="mt-2 border-l-2 border-gold bg-champagne/40 px-3 py-2"><span className="text-[10px] uppercase tracking-wide2 text-gold-deep">Personalisation</span><PersonalisationList data={i.personalisation} className="!mt-1" /></div>
                      : <p className="mt-1 text-xs text-espresso-muted">No personalisation</p>}
                  </div>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-espresso/10 p-5 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(o.subtotal)}</dd></div>
              {Number(o.discount) > 0 && <div className="flex justify-between"><dt>Discount ({o.couponCode})</dt><dd>−{money(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Delivery ({titleCase(o.shippingMethod)})</dt><dd>{money(o.shippingFee)}</dd></div>
              <div className="flex justify-between font-medium"><dt>Total</dt><dd>{money(o.total)}</dd></div>
            </dl>
          </Panel>
          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Customer">
              <div className="p-5 text-sm leading-relaxed">
                {o.customerName}<br /><a href={`mailto:${o.email}`} className="underline">{o.email}</a><br />{o.phone}
                <p className="mt-2 text-xs text-espresso-muted">{o.userId ? <Link to={`/admin/customers/${o.userId}`} className="underline">Registered customer</Link> : 'Guest checkout'}</p>
                {o.customerNotes && <p className="mt-3 border-t border-espresso/10 pt-3"><span className="label">Customer notes</span>{o.customerNotes}</p>}
              </div>
            </Panel>
            <Panel title="Delivery address">
              <p className="p-5 text-sm leading-relaxed">{a.fullName}<br />{a.phone}<br />{a.line1}{a.line2 && <>, {a.line2}</>}<br />{a.city} {a.region}<br />{a.postalCode}<br />{a.country}</p>
            </Panel>
          </div>
          <Panel title="Payments">
            {o.payments.length === 0 ? <p className="p-5 text-sm text-espresso-muted">No payment records.</p> : (
              <ul className="divide-y divide-espresso/5 text-sm">
                {o.payments.map((p, n) => (
                  <li key={n} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                    <span>{titleCase(p.method)} · {p.provider}{p.captureReference && <span className="block text-xs text-espresso-muted">PayPal capture {p.captureReference}</span>}</span>
                    <span>{money(p.amount)} <StatusPill value={p.status} /></span>
                  </li>
                ))}
              </ul>
            )}
            {paypalCapture && o.paymentStatus === 'PAID' && (
              <div className="border-t border-espresso/10 p-5">
                <button onClick={refund} className="btn-outline !min-h-[40px]" disabled={busy}>Refund via PayPal</button>
                <p className="mt-2 text-xs text-espresso-muted">Refunds the full amount. Changing the payment status above does not move money.</p>
              </div>
            )}
          </Panel>
        </div>
        <Panel title="Manage order" className="h-fit">
          <div className="space-y-5 p-5">
            <Field label="Order status"><Select value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={ORDER_STATUSES} all={null} /></Field>
            <Field label="Payment status"><Select value={form.paymentStatus} onChange={(v) => setForm({ ...form, paymentStatus: v })} options={PAYMENT_STATUSES} all={null} /></Field>
            <Field label="Carrier"><input className="field-box" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} /></Field>
            <Field label="Tracking number"><input className="field-box" value={form.trackingNumber} onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })} /></Field>
            <Field label="Internal notes"><textarea rows={4} className="field-box" value={form.adminNotes} onChange={(e) => setForm({ ...form, adminNotes: e.target.value })} /></Field>
            <button onClick={save} className="btn-dark w-full" disabled={busy}>{busy ? <Spinner /> : 'Save changes'}</button>
            {o.status === 'PENDING' && o.paymentStatus !== 'PAID' && (
              <p className="text-xs text-espresso-muted">Pending, unpaid orders are cancelled and restocked automatically when their payment window ends. Set the status to Confirmed to keep this one.</p>
            )}
            <p className="text-xs text-espresso-muted">{o.paymentMethod && <>Payment method: {titleCase(o.paymentMethod)} · </>}Last updated {date(o.updatedAt)}</p>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ---------------- Enquiries ---------------- */

export function Enquiries() {
  const { notify } = useApp();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => api(`/api/admin/enquiries${qs({ type, status, q, page })}`).then(setData).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [type, status, q, page, n]);

  const update = async (e, patch) => {
    try {
      const d = await api(`/api/admin/enquiries/${e.id}`, { method: 'PATCH', body: patch });
      setData((x) => ({ ...x, content: x.content.map((y) => (y.id === d.id ? d : y)) }));
      if (open?.id === d.id) setOpen(d);
      notify('Enquiry updated.');
    } catch (err) { notify(err.message, 'error'); }
  };
  const remove = async (e) => {
    if (!window.confirm('Delete this enquiry permanently?')) return;
    await api(`/api/admin/enquiries/${e.id}`, { method: 'DELETE' });
    setOpen(null); setN((x) => x + 1);
  };

  return (
    <>
      <AdminTitle title="Enquiries">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Name, email, company…" className="field-box !w-52 !py-2 text-sm" />
        <Select value={type} onChange={(v) => { setType(v); setPage(0); }} options={['CORPORATE', 'BULK', 'CUSTOM', 'CONTACT']} all="All types" />
        <Select value={status} onChange={(v) => { setStatus(v); setPage(0); }} options={ENQUIRY_STATUSES} all="All statuses" />
      </AdminTitle>
      {!data ? <Spinner /> : (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <div>
            <Table head={['Received', 'From', 'Type', 'Qty', 'Status']} empty={data.content.length === 0 && 'No enquiries yet.'}>
              {data.content.map((e) => (
                <tr key={e.id} onClick={() => setOpen(e)} className={`cursor-pointer hover:bg-champagne/30 ${open?.id === e.id ? 'bg-champagne/50' : ''}`}>
                  <td className="px-4 py-3 text-espresso-muted">{date(e.createdAt)}</td>
                  <td className="px-4 py-3">{e.fullName}<p className="text-xs text-espresso-muted">{e.companyName || e.email}</p></td>
                  <td className="px-4 py-3">{titleCase(e.type)}</td>
                  <td className="px-4 py-3 tabular-nums">{e.quantity ?? '—'}</td>
                  <td className="px-4 py-3"><StatusPill value={e.status} /></td>
                </tr>
              ))}
            </Table>
            <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />
          </div>
          {open ? <EnquiryPanel key={open.id} e={open} onUpdate={update} onDelete={remove} /> : <Panel><p className="p-10 text-center text-sm text-espresso-muted">Select an enquiry to view details.</p></Panel>}
        </div>
      )}
    </>
  );
}

function EnquiryPanel({ e, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(e.internalNotes || '');
  const rows = [
    ['Email', <a href={`mailto:${e.email}`} className="underline">{e.email}</a>], ['Phone', e.phone], ['Company', e.companyName], ['Topic', e.enquiryTopic],
    ['Event type', e.eventType], ['Event date', e.eventDate && date(e.eventDate)], ['Quantity', e.quantity], ['Budget', e.budgetRange],
    ['Products', e.productRequirements], ['Personalisation', e.personalisationRequirements], ['Message', e.message],
  ].filter(([, v]) => v);
  return (
    <Panel title={`ENQ-${e.id} · ${titleCase(e.type)}`} className="h-fit">
      <div className="p-5">
        <p className="font-display text-2xl">{e.fullName}</p>
        <dl className="mt-4 space-y-2 text-sm">
          {rows.map(([k, v]) => <div key={k} className="grid grid-cols-[110px_1fr] gap-3"><dt className="text-espresso-muted">{k}</dt><dd className="whitespace-pre-line">{v}</dd></div>)}
        </dl>
        <div className="mt-6 space-y-4 border-t border-espresso/10 pt-5">
          <Field label="Status"><Select value={e.status} onChange={(v) => onUpdate(e, { status: v })} options={ENQUIRY_STATUSES} all={null} /></Field>
          <Field label="Internal notes"><textarea rows={4} className="field-box" value={notes} onChange={(x) => setNotes(x.target.value)} /></Field>
          <div className="flex gap-2">
            <button className="btn-dark !min-h-[40px]" onClick={() => onUpdate(e, { internalNotes: notes })}>Save notes</button>
            <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Your LICHT Signature enquiry (ENQ-${e.id})`)}`} className="btn-outline !min-h-[40px]">Reply by email</a>
            <button className="btn-outline !min-h-[40px] !text-red-900" onClick={() => onDelete(e)}>Delete</button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ---------------- Customers ---------------- */

export function Customers() {
  return (
    <Routes>
      <Route index element={<CustomerList />} />
      <Route path=":id" element={<CustomerDetail />} />
    </Routes>
  );
}

function CustomerList() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => api(`/api/admin/customers${qs({ q, page })}`).then(setData).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q, page]);
  return (
    <>
      <AdminTitle title="Customers">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search customers…" className="field-box !w-56 !py-2 text-sm" />
      </AdminTitle>
      {!data ? <Spinner /> : (
        <>
          <Table head={['Name', 'Email', 'Orders', 'Joined', 'Status']} empty={data.content.length === 0 && 'No customers yet.'}>
            {data.content.map((c) => (
              <tr key={c.id} className="hover:bg-champagne/30">
                <td className="px-4 py-3"><Link to={`/admin/customers/${c.id}`} className="font-medium hover:underline">{c.firstName} {c.lastName}</Link></td>
                <td className="px-4 py-3">{c.email} {c.emailVerified && <span className="text-xs text-emerald-800">✓</span>}</td>
                <td className="px-4 py-3 tabular-nums">{c.orderCount}</td>
                <td className="px-4 py-3 text-espresso-muted">{date(c.createdAt)}</td>
                <td className="px-4 py-3">{c.enabled ? 'Active' : <span className="text-red-800">Disabled</span>}</td>
              </tr>
            ))}
          </Table>
          <Pager page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </>
  );
}

function CustomerDetail() {
  const { id } = useParams();
  const { notify } = useApp();
  const [d, setD] = useState(null);
  useEffect(() => { api(`/api/admin/customers/${id}`).then(setD).catch((e) => notify(e.message, 'error')); }, [id, notify]);
  if (!d) return <Spinner />;
  const c = d.customer;
  const toggle = async () => {
    try {
      const u = await api(`/api/admin/customers/${id}`, { method: 'PATCH', body: { enabled: !c.enabled } });
      setD({ ...d, customer: u }); notify(u.enabled ? 'Account enabled.' : 'Account disabled.');
    } catch (e) { notify(e.message, 'error'); }
  };
  return (
    <>
      <AdminTitle title={`${c.firstName} ${c.lastName || ''}`}>
        <Link to="/admin/customers" className="btn-outline !min-h-[40px]">Back</Link>
        <button onClick={toggle} className="btn-outline !min-h-[40px]">{c.enabled ? 'Disable account' : 'Enable account'}</button>
      </AdminTitle>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
        <div className="space-y-6">
          <Panel title="Details">
            <dl className="space-y-2 p-5 text-sm">
              <div><dt className="label">Email</dt><dd>{c.email} {c.emailVerified ? '(verified)' : '(unverified)'}</dd></div>
              <div><dt className="label">Phone</dt><dd>{c.phone || '—'}</dd></div>
              <div><dt className="label">Joined</dt><dd>{date(c.createdAt)}</dd></div>
            </dl>
          </Panel>
          <Panel title="Addresses">
            {d.addresses.length === 0 ? <p className="p-5 text-sm text-espresso-muted">None saved.</p> : d.addresses.map((a) => (
              <p key={a.id} className="border-b border-espresso/5 p-5 text-sm last:border-0">{a.fullName}<br />{a.line1}, {a.city} {a.postalCode}, {a.country}</p>
            ))}
          </Panel>
        </div>
        <Panel title={`Order history (${d.orders.length})`}>
          {d.orders.length === 0 ? <p className="p-5 text-sm text-espresso-muted">No orders yet.</p> : (
            <ul className="divide-y divide-espresso/5">
              {d.orders.map((o) => (
                <li key={o.id}><Link to={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-champagne/30">
                  <span className="font-medium">{o.orderNumber}</span><span className="text-espresso-muted">{date(o.createdAt)}</span><StatusPill value={o.status} /><span className="tabular-nums">{money(o.total)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
