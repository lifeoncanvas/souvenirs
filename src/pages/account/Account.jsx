import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { date, money, titleCase } from '../../lib/format';
import ProductCard from '../../components/ProductCard';
import { OrderSummary } from '../OrderConfirmation';
import { OrderProgress } from '../TrackOrder';
import { EmptyState, ErrorState, Field, Img, Notice, PageLoader, Seo, Spinner } from '../../components/ui';

const TABS = [['', 'Overview'], ['orders', 'Orders'], ['wishlist', 'Wishlist'], ['addresses', 'Addresses'], ['profile', 'Profile & security']];

export default function Account() {
  const { user, authReady, signOut } = useApp();
  if (!authReady) return <PageLoader />;
  if (!user) return <Navigate to="/login?next=/account" replace />;
  return (
    <>
      <Seo title="My Account" noindex />
      <div className="container-site py-12 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-espresso/10 pb-8">
          <div>
            <span className="eyebrow">My Account</span>
            <h1 className="display-lg mt-3">Hello, {user.firstName}.</h1>
          </div>
          <div className="flex gap-3">
            {user.admin && <Link to="/admin" className="btn-outline">Admin dashboard</Link>}
            <button onClick={signOut} className="btn-outline">Sign out</button>
          </div>
        </div>
        {!user.emailVerified && <VerifyBanner />}
        <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr]">
          <nav className="scrollbar-none flex gap-6 overflow-x-auto lg:flex-col lg:gap-3" aria-label="Account">
            {TABS.map(([to, label]) => (
              <NavLink key={to} to={`/account${to ? `/${to}` : ''}`} end
                className={({ isActive }) => `shrink-0 whitespace-nowrap font-display text-lg ${isActive ? 'text-gold-deep italic' : 'hover:text-gold-deep'}`}>{label}</NavLink>
            ))}
          </nav>
          <div className="min-w-0">
            <Routes>
              <Route index element={<Overview />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:orderNumber" element={<OrderDetail />} />
              <Route path="wishlist" element={<Wishlist />} />
              <Route path="addresses" element={<Addresses />} />
              <Route path="profile" element={<Profile />} />
            </Routes>
          </div>
        </div>
      </div>
    </>
  );
}

function VerifyBanner() {
  const [msg, setMsg] = useState('');
  const resend = async () => {
    try { setMsg((await api('/api/auth/resend-verification', { method: 'POST' })).message); } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="mt-6"><Notice>Please verify your email address. {msg || <button onClick={resend} className="underline underline-offset-4">Resend verification email</button>}</Notice></div>
  );
}

function useLoad(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [n, setN] = useState(0);
  useEffect(() => { setError(''); api(path).then(setData).catch((e) => setError(e.message)); }, [path, n]);
  return { data, setData, error, reload: () => setN((x) => x + 1) };
}

function Overview() {
  const { user } = useApp();
  const { data: orders } = useLoad('/api/account/orders');
  const latest = orders?.[0];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="card p-6">
        <span className="label">Latest order</span>
        {!orders ? <Spinner /> : latest ? (
          <>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-2xl">{latest.orderNumber}</p>
                <p className="mt-1 text-sm text-espresso-muted">{date(latest.createdAt)} · {money(latest.total)} · {titleCase(latest.status)}</p>
              </div>
              {latest.items?.[0]?.imageUrl && (
                <div className="h-16 w-14 shrink-0 overflow-hidden border border-espresso/10 bg-ivory">
                  <Img src={latest.items[0].imageUrl} alt={latest.items[0].productName} className="h-full w-full" imgClassName="object-cover" />
                </div>
              )}
            </div>
            {latest.items?.length > 1 && (
              <div className="mt-3 flex gap-2">
                {latest.items.slice(1, 4).map((item, i) => (
                  <div key={i} className="h-12 w-10 shrink-0 overflow-hidden border border-espresso/10 bg-ivory">
                    <Img src={item.imageUrl} alt={item.productName} className="h-full w-full" imgClassName="object-cover" />
                  </div>
                ))}
                {latest.items.length > 4 && (
                  <div className="flex h-12 w-10 items-center justify-center border border-espresso/10 bg-champagne/40 text-[10px] text-espresso-muted">
                    +{latest.items.length - 4}
                  </div>
                )}
              </div>
            )}
            <Link to={`/account/orders/${latest.orderNumber}`} className="link-underline mt-5">View order</Link>
          </>
        ) : <p className="text-sm">No orders yet. <Link to="/shop" className="underline">Start exploring</Link>.</p>}
      </div>
      <div className="card p-6">
        <span className="label">Your details</span>
        <p className="font-display text-2xl">{user.firstName} {user.lastName}</p>
        <p className="mt-1 text-sm text-espresso-muted">{user.email}</p>
        <Link to="/account/profile" className="link-underline mt-5">Edit profile</Link>
      </div>
    </div>
  );
}

function Orders() {
  const { data, error, reload } = useLoad('/api/account/orders');
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;
  if (!data.length) return <EmptyState title="No orders yet." text="When you place an order it will appear here." action={<Link to="/shop" className="btn-dark">Shop the collection</Link>} />;
  return (
    <ul className="divide-y divide-espresso/10 border-y border-espresso/10">
      {data.map((o) => (
        <li key={o.id}>
          <Link to={`/account/orders/${o.orderNumber}`} className="grid gap-3 py-5 text-sm transition hover:bg-champagne/30 sm:grid-cols-[auto_1fr_1fr_1fr_auto] sm:items-center sm:px-3">
            {o.items?.[0]?.imageUrl ? (
              <div className="h-12 w-10 shrink-0 overflow-hidden border border-espresso/15 bg-ivory">
                <Img src={o.items[0].imageUrl} alt={o.items[0].productName} className="h-full w-full" imgClassName="object-cover" />
              </div>
            ) : <div className="h-12 w-10 shrink-0 border border-espresso/10 bg-champagne/20" />}
            <span className="font-display text-lg">{o.orderNumber}</span>
            <span className="text-espresso-muted">{date(o.createdAt)}</span>
            <span>{titleCase(o.status)}</span>
            <span className="tabular-nums">{money(o.total)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function OrderDetail() {
  const { orderNumber } = useParams();
  const { data, error } = useLoad(`/api/account/orders/${orderNumber}`);
  if (error) return <ErrorState message={error} />;
  if (!data) return <PageLoader />;
  return (
    <div className="space-y-8">
      <Link to="/account/orders" className="text-xs uppercase tracking-wide2 underline underline-offset-4">← All orders</Link>
      <OrderProgress status={data.status} />
      <OrderSummary order={data} />
    </div>
  );
}

function Wishlist() {
  const { wishlist } = useApp();
  const { data, error } = useLoad('/api/account/wishlist');
  if (error) return <ErrorState message={error} />;
  if (!data) return <PageLoader />;
  const items = data.filter((p) => wishlist.has(p.id));
  if (!items.length) return <EmptyState title="Your wishlist is empty." text="Tap the heart on any piece to save it here." action={<Link to="/shop" className="btn-dark">Explore</Link>} />;
  return <div className="grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 xl:grid-cols-3">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>;
}

const EMPTY = { label: '', fullName: '', phone: '', line1: '', line2: '', city: '', region: '', postalCode: '', country: '', isDefault: false };

function Addresses() {
  const { notify } = useApp();
  const { data, error, reload } = useLoad('/api/account/addresses');
  const [editing, setEditing] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    const req = ['fullName', 'line1', 'city', 'postalCode', 'country'];
    const errs = Object.fromEntries(req.filter((k) => !editing[k]?.trim()).map((k) => [k, 'Required']));
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api(editing.id ? `/api/account/addresses/${editing.id}` : '/api/account/addresses', { method: editing.id ? 'PUT' : 'POST', body: editing });
      setEditing(null); reload(); notify('Address saved.');
    } catch (err) { notify(err.message, 'error'); if (err.fields) setErrors(err.fields); } finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!window.confirm('Remove this address?')) return;
    try { await api(`/api/account/addresses/${id}`, { method: 'DELETE' }); reload(); } catch (err) { notify(err.message, 'error'); }
  };
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <PageLoader />;
  if (editing) {
    return (
      <form onSubmit={save} noValidate className="grid max-w-2xl gap-6 sm:grid-cols-2">
        {[['label', 'Label (e.g. Home)'], ['fullName', 'Full name'], ['phone', 'Phone'], ['line1', 'Address line 1'], ['line2', 'Address line 2'], ['city', 'Town / City'], ['region', 'County / State'], ['postalCode', 'Postcode'], ['country', 'Country']].map(([k, l]) => (
          <Field key={k} label={l} error={errors[k]}><input className="field" value={editing[k] || ''} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} /></Field>
        ))}
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <input type="checkbox" checked={editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} className="h-4 w-4 rounded-none text-espresso" /> Default address
        </label>
        <div className="flex gap-3 sm:col-span-2">
          <button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn-dark" disabled={busy}>{busy ? <Spinner /> : 'Save address'}</button>
        </div>
      </form>
    );
  }
  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2">
        {data.map((a) => (
          <div key={a.id} className="card p-6 text-sm">
            <div className="flex justify-between"><span className="label">{a.label || 'Address'}</span>{a.isDefault && <span className="text-[10px] uppercase tracking-wide2 text-gold-deep">Default</span>}</div>
            <p className="leading-relaxed">{a.fullName}<br />{a.line1}{a.line2 && <>, {a.line2}</>}<br />{a.city} {a.postalCode}<br />{a.country}</p>
            <div className="mt-4 flex gap-4 text-xs uppercase tracking-wide2">
              <button onClick={() => setEditing({ ...EMPTY, ...a })} className="underline underline-offset-4">Edit</button>
              <button onClick={() => remove(a.id)} className="text-espresso-muted underline underline-offset-4">Remove</button>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-outline mt-8" onClick={() => setEditing({ ...EMPTY })}>Add an address</button>
    </div>
  );
}

function Profile() {
  const { user, setUser, notify, signIn } = useApp();
  const [p, setP] = useState({ firstName: user.firstName, lastName: user.lastName || '', phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState('');
  const [pwError, setPwError] = useState('');
  const saveProfile = async (e) => {
    e.preventDefault();
    if (!p.firstName.trim()) { notify('Please enter your first name.', 'error'); return; }
    setBusy('profile');
    try { setUser(await api('/api/account/profile', { method: 'PUT', body: p })); notify('Profile updated.'); } catch (err) { notify(err.message, 'error'); } finally { setBusy(''); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.newPassword.length < 8) { setPwError('Use at least 8 characters.'); return; }
    if (pw.newPassword !== pw.confirm) { setPwError('Passwords do not match.'); return; }
    setBusy('pw');
    try {
      const r = await api('/api/account/password', { method: 'POST', body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } });
      // Every earlier session (including this one's old token) is now signed out; continue with the new token.
      if (r.token) await signIn({ token: r.token, user });
      setPw({ currentPassword: '', newPassword: '', confirm: '' }); notify(r.message || 'Password updated.');
    } catch (err) { setPwError(err.message); } finally { setBusy(''); }
  };
  return (
    <div className="grid gap-14 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="space-y-6">
        <h2 className="font-display text-2xl">Profile</h2>
        <Field label="First name"><input className="field" value={p.firstName} onChange={(e) => setP({ ...p, firstName: e.target.value })} /></Field>
        <Field label="Last name"><input className="field" value={p.lastName} onChange={(e) => setP({ ...p, lastName: e.target.value })} /></Field>
        <Field label="Phone"><input className="field" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
        <Field label="Email"><input className="field opacity-60" value={user.email} disabled /></Field>
        <button className="btn-dark" disabled={busy === 'profile'}>{busy === 'profile' ? <Spinner /> : 'Save profile'}</button>
      </form>
      <form onSubmit={savePw} className="space-y-6">
        <h2 className="font-display text-2xl">Change password</h2>
        <Field label="Current password"><input type="password" autoComplete="current-password" className="field" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
        <Field label="New password"><input type="password" autoComplete="new-password" className="field" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
        <Field label="Confirm new password"><input type="password" autoComplete="new-password" className="field" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
        {pwError && <Notice tone="error">{pwError}</Notice>}
        <button className="btn-outline" disabled={busy === 'pw'}>{busy === 'pw' ? <Spinner /> : 'Update password'}</button>
      </form>
    </div>
  );
}
