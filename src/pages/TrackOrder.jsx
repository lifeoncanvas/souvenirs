import { useState } from 'react';
import { api } from '../lib/api';
import { OrderSummary } from './OrderConfirmation';
import { Field, Notice, Seo, Spinner } from '../components/ui';

const FLOW = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED'];
const LABELS = { PENDING: 'Received', CONFIRMED: 'Confirmed', IN_PRODUCTION: 'In the studio', SHIPPED: 'On its way', DELIVERED: 'Delivered' };

export function OrderProgress({ status }) {
  if (status === 'CANCELLED') return <Notice tone="error">This order was cancelled.</Notice>;
  const at = FLOW.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1.5">
      {FLOW.map((s, i) => (
        <li key={s} className="text-center">
          <span className={`block h-0.5 ${i <= at ? 'bg-gold-deep' : 'bg-espresso/15'}`} />
          <span className={`mt-2 block text-[9.5px] uppercase tracking-wide sm:text-[10.5px] ${i <= at ? 'text-espresso' : 'text-espresso-muted'}`}>{LABELS[s]}</span>
        </li>
      ))}
    </ol>
  );
}

export default function TrackOrder() {
  const [form, setForm] = useState({ orderNumber: '', email: '' });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!form.orderNumber.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) { setError('Please enter your order number and a valid email.'); return; }
    setBusy(true); setError('');
    try { setOrder(await api('/api/orders/track', { method: 'POST', body: form })); } catch (err) {
      setOrder(null);
      setError(err.status === 404 ? "We couldn't find an order with those details." : err.message);
    } finally { setBusy(false); }
  };
  return (
    <>
      <Seo title="Track an Order" description="Check the progress of your LICHT Signature order." />
      <div className="container-site max-w-3xl py-16 lg:py-24">
        <p className="eyebrow text-center">Order tracking</p>
        <h1 className="display-lg mt-4 text-center">Where is my order?</h1>
        <form onSubmit={submit} noValidate className="mx-auto mt-10 grid max-w-xl gap-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Order number"><input className="field uppercase" placeholder="LS-…" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} /></Field>
          <Field label="Email"><input type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <button className="btn-dark" disabled={busy}>{busy ? <Spinner /> : 'Track'}</button>
        </form>
        {error && <div className="mx-auto mt-6 max-w-xl"><Notice tone="error">{error}</Notice></div>}
        {order && (
          <div className="mt-12 space-y-8 animate-fadeUp">
            <OrderProgress status={order.status} />
            <OrderSummary order={order} />
          </div>
        )}
      </div>
    </>
  );
}
