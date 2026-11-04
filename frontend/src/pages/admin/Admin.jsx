import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Inbox, Users, FileText, Quote, HelpCircle, Tag, Star, Mail, Folder, LogOut, Menu, X, ExternalLink } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { date, money, titleCase } from '../../lib/format';
import { PageLoader, Seo, Spinner } from '../../components/ui';
import Products from './Products';
import { Orders, Enquiries, Customers } from './Operations';
import { ContentEditor, Testimonials, Faqs, Coupons, Reviews, Newsletter, Categories } from './ContentAdmin';

const NAV = [
  ['', 'Dashboard', LayoutDashboard], ['orders', 'Orders', ShoppingCart], ['enquiries', 'Enquiries', Inbox],
  ['products', 'Products', Package], ['categories', 'Categories', Folder], ['customers', 'Customers', Users],
  ['content', 'Site content', FileText], ['testimonials', 'Testimonials', Quote], ['faqs', 'FAQs', HelpCircle],
  ['coupons', 'Coupons', Tag], ['reviews', 'Reviews', Star], ['newsletter', 'Newsletter', Mail],
];

export default function Admin() {
  const { user, authReady, signOut } = useApp();
  const [open, setOpen] = useState(false);
  if (!authReady) return <PageLoader />;
  if (!user) return <Navigate to="/login?next=/admin" replace />;
  if (!user.admin) return <Navigate to="/account" replace />;

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Admin">
      {NAV.map(([to, label, Icon]) => (
        <NavLink key={to} to={`/admin${to ? `/${to}` : ''}`} end={!to} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-sm transition ${isActive ? 'bg-ivory/10 text-ivory' : 'text-champagne/70 hover:text-ivory'}`}>
          <Icon size={16} strokeWidth={1.4} /> {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-champagne/60 lg:grid lg:grid-cols-[240px_1fr]">
      <Seo title="Admin" noindex />
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-cocoa p-5 transition-transform lg:static lg:w-auto lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3 leading-none">
            <img src="/logo-192h.png" alt="" className="h-10 w-auto" />
            <span>
              <span className="block font-display text-2xl tracking-[0.25em] text-ivory">LICHT</span>
              <span className="mt-1 block text-[9px] uppercase tracking-luxe text-gold-soft">Studio admin</span>
            </span>
          </Link>
          <button className="text-ivory lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        {nav}
        <div className="mt-auto space-y-1 border-t border-ivory/10 pt-4 text-sm">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 text-champagne/70 hover:text-ivory"><ExternalLink size={16} strokeWidth={1.4} /> View store</Link>
          <button onClick={signOut} className="flex w-full items-center gap-3 px-3 py-2 text-champagne/70 hover:text-ivory"><LogOut size={16} strokeWidth={1.4} /> Sign out</button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-espresso/10 bg-ivory px-5 py-4 lg:px-10">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <p className="text-sm text-espresso-muted">Signed in as {user.email}</p>
        </header>
        <main className="p-5 lg:p-10">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders/*" element={<Orders />} />
            <Route path="enquiries" element={<Enquiries />} />
            <Route path="products/*" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="customers/*" element={<Customers />} />
            <Route path="content" element={<ContentEditor />} />
            <Route path="testimonials" element={<Testimonials />} />
            <Route path="faqs" element={<Faqs />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="newsletter" element={<Newsletter />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export function AdminTitle({ title, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-4xl">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function StatusPill({ value }) {
  const tone = {
    PENDING: 'bg-amber-100 text-amber-900', NEW: 'bg-amber-100 text-amber-900', UNPAID: 'bg-amber-100 text-amber-900',
    CONFIRMED: 'bg-sky-100 text-sky-900', IN_PROGRESS: 'bg-sky-100 text-sky-900', IN_PRODUCTION: 'bg-sky-100 text-sky-900', QUOTED: 'bg-violet-100 text-violet-900',
    SHIPPED: 'bg-indigo-100 text-indigo-900', DELIVERED: 'bg-emerald-100 text-emerald-900', PAID: 'bg-emerald-100 text-emerald-900',
    CANCELLED: 'bg-stone-200 text-stone-700', CLOSED: 'bg-stone-200 text-stone-700', REFUNDED: 'bg-stone-200 text-stone-700', FAILED: 'bg-red-100 text-red-900',
  }[value] || 'bg-stone-100 text-stone-700';
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone}`}>{titleCase(value)}</span>;
}

export function Panel({ title, children, className = '' }) {
  return (
    <section className={`border border-espresso/10 bg-ivory ${className}`}>
      {title && <h2 className="border-b border-espresso/10 px-5 py-4 text-[11px] font-medium uppercase tracking-wide2">{title}</h2>}
      {children}
    </section>
  );
}

export function Table({ head, children, empty }) {
  return (
    <div className="overflow-x-auto border border-espresso/10 bg-ivory">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-espresso/10 text-[10.5px] uppercase tracking-wide2 text-espresso-muted">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-espresso/5">{children}</tbody>
      </table>
      {empty && <p className="p-10 text-center text-sm text-espresso-muted">{empty}</p>}
    </div>
  );
}

export function Pager({ page, totalPages, onPage }) {
  if (!totalPages || totalPages < 2) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-2 text-sm">
      <button className="btn-outline !min-h-[34px] !px-3" disabled={page === 0} onClick={() => onPage(page - 1)}>Prev</button>
      <span className="px-2">{page + 1} / {totalPages}</span>
      <button className="btn-outline !min-h-[34px] !px-3" disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/api/admin/dashboard').then(setD).catch((e) => setError(e.message)); }, []);
  if (error) return <p className="text-red-800">{error}</p>;
  if (!d) return <div className="flex justify-center py-20"><Spinner /></div>;
  const stats = [
    ['Total orders', d.totalOrders, '/admin/orders'], ['Revenue (paid)', money(d.totalRevenue), '/admin/orders?paymentStatus=PAID'],
    ['Pending orders', d.pendingOrders, '/admin/orders?status=PENDING'], ['Completed orders', d.completedOrders, '/admin/orders?status=DELIVERED'],
    ['Customers', d.totalCustomers, '/admin/customers'], ['New enquiries', d.newEnquiries, '/admin/enquiries'],
  ];
  return (
    <>
      <AdminTitle title="Dashboard" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map(([label, value, to]) => (
          <Link key={label} to={to} className="border border-espresso/10 bg-ivory p-5 transition hover:border-gold">
            <p className="text-[10.5px] uppercase tracking-wide2 text-espresso-muted">{label}</p>
            <p className="mt-3 font-display text-3xl tabular-nums">{value}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Recent orders">
          {d.recentOrders.length === 0 ? <p className="p-6 text-sm text-espresso-muted">No orders yet.</p> : (
            <ul className="divide-y divide-espresso/5">
              {d.recentOrders.map((o) => (
                <li key={o.id}>
                  <Link to={`/admin/orders/${o.id}`} className="grid grid-cols-[1fr_auto] gap-2 px-5 py-3 text-sm hover:bg-champagne/40 sm:grid-cols-[1.2fr_1fr_auto_auto] sm:items-center">
                    <span className="font-medium">{o.orderNumber}</span>
                    <span className="hidden text-espresso-muted sm:block">{o.customerName}</span>
                    <StatusPill value={o.status} />
                    <span className="text-right tabular-nums">{money(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Bestselling products">
          {d.bestsellers.length === 0 ? <p className="p-6 text-sm text-espresso-muted">Sales will appear here once orders arrive.</p> : (
            <ul className="divide-y divide-espresso/5">
              {d.bestsellers.map((b) => (
                <li key={b.productName} className="flex justify-between gap-3 px-5 py-3 text-sm">
                  <span>{b.productName}</span><span className="text-espresso-muted tabular-nums">{b.unitsSold} sold · {money(b.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <p className="mt-6 text-xs text-espresso-muted">{d.activeProducts} active products · last refreshed {date(new Date())}</p>
    </>
  );
}
