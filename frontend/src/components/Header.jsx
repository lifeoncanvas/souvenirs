import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const NAV = [
  { to: '/', label: 'Home' },
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About Us' },
  { to: '/occasions', label: 'Events & Occasions' },
  { to: '/contact', label: 'Contact Us' },
];

export function Logo({ light = false, className = '', markClassName = 'h-10 sm:h-12' }) {
  return (
    <Link to="/" className={`group flex items-center gap-3 leading-none ${className}`} aria-label="LICHT Signature Souvenirs — home">
      <img src="/logo-192h.png" alt="" width="88" height="96" className={`w-auto ${markClassName}`} />
      <span className="flex flex-col items-start">
        <span className={`font-display text-[1.45rem] tracking-[0.28em] sm:text-[1.75rem] ${light ? 'text-ivory' : 'text-espresso'}`}>LICHT</span>
        <span className={`mt-1 hidden text-[11px] font-medium uppercase tracking-[0.34em] sm:text-[11.5px] min-[380px]:block ${light ? 'text-gold-soft' : 'text-gold-deep'}`}>Signature Souvenirs</span>
      </span>
    </Link>
  );
}

export default function Header() {
  const { cart, setCartOpen, user, wishlist } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { pathname } = useLocation();
  const overHero = pathname === '/' && !scrolled && !menuOpen;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const iconBtn = `relative flex h-10 w-10 items-center justify-center transition-colors ${overHero ? 'text-ivory hover:text-gold-soft' : 'text-espresso hover:text-gold-deep'}`;
  const count = cart?.itemCount || 0;

  return (
    <>
      <header className={`${pathname === '/' ? 'fixed inset-x-0' : 'sticky'} top-0 z-40 transition-all duration-500 ease-silk ${overHero ? 'bg-transparent' : 'border-b border-espresso/10 bg-ivory/95 backdrop-blur'}`}>
        <div className="container-site">
          <div className="grid h-[72px] grid-cols-[1fr_auto_1fr] items-center lg:h-[92px]">
            <div className="flex items-center gap-1">
              <button className={`${iconBtn} lg:hidden`} onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} strokeWidth={1.4} /></button>
              <button className={iconBtn} onClick={() => setSearchOpen(true)} aria-label="Search"><Search size={19} strokeWidth={1.4} /></button>
            </div>
            <Logo light={overHero} />
            <div className="flex items-center justify-end gap-0.5">
              <Link to={user ? (user.admin ? '/admin' : '/account') : '/login'} className={`${iconBtn} hidden sm:flex`} aria-label={user ? 'Your account' : 'Sign in'}>
                <User size={19} strokeWidth={1.4} />
              </Link>
              <Link to={user ? '/account/wishlist' : '/login'} className={iconBtn} aria-label="Wishlist">
                <Heart size={19} strokeWidth={1.4} />
                {wishlist.size > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold" />}
              </Link>
              <button className={iconBtn} onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${count} items`}>
                <ShoppingBag size={19} strokeWidth={1.4} />
                {count > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gold px-1 text-[9.5px] font-semibold text-ink">{count}</span>
                )}
              </button>
            </div>
          </div>
          <nav className="hidden justify-center gap-9 pb-4 lg:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'}
                className={({ isActive }) => `text-[13px] font-medium uppercase tracking-[0.22em] transition-colors ${overHero ? 'text-ivory/85 hover:text-ivory' : 'text-espresso-soft hover:text-espresso'} ${isActive ? (overHero ? '!text-ivory' : '!text-espresso underline decoration-gold underline-offset-[6px]') : ''}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile menu */}
      <div className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? '' : 'pointer-events-none'}`} aria-hidden={!menuOpen}>
        <div className={`absolute inset-0 bg-ink/40 transition-opacity duration-500 ${menuOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setMenuOpen(false)} />
        <aside className={`absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-ivory transition-transform duration-500 ease-silk ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between border-b border-espresso/10 px-5 py-5">
            <Logo />
            <button className="flex h-10 w-10 items-center justify-center" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} strokeWidth={1.4} /></button>
          </div>
          <nav className="flex flex-1 flex-col overflow-y-auto px-5 py-4" aria-label="Mobile">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `border-b border-espresso/5 py-4 font-display text-2xl ${isActive ? 'text-gold-deep' : ''}`}>{n.label}</NavLink>
            ))}
            <NavLink to="/bulk-orders" className="border-b border-espresso/5 py-4 font-display text-2xl">Bulk & Event Orders</NavLink>
            <NavLink to="/faq" className="border-b border-espresso/5 py-4 font-display text-2xl">FAQ</NavLink>
          </nav>
          <div className="grid gap-3 border-t border-espresso/10 p-5">
            <Link to="/shop" className="btn-dark">Shop Now</Link>
            <Link to={user ? '/account' : '/login'} className="btn-outline">{user ? 'My Account' : 'Sign In'}</Link>
          </div>
        </aside>
      </div>

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function SearchOverlay({ onClose }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const input = useRef(null);
  useEffect(() => {
    input.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 animate-fadeIn bg-ivory/97 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Search">
      <div className="container-site flex justify-end pt-6">
        <button className="flex h-10 w-10 items-center justify-center" onClick={onClose} aria-label="Close search"><X size={22} strokeWidth={1.3} /></button>
      </div>
      <form onSubmit={submit} className="container-site mt-[12vh] max-w-3xl">
        <span className="eyebrow">Search the collection</span>
        <div className="mt-4 flex items-center gap-4 border-b border-espresso/30 pb-3">
          <Search size={22} strokeWidth={1.3} className="text-gold-deep" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Candles, ring dish, gift box…"
            className="w-full border-0 bg-transparent p-0 font-display text-3xl placeholder:text-espresso-muted/50 focus:outline-none focus:ring-0 sm:text-5xl" />
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          {['Wedding favours', 'Candle', 'Gift box', 'Corporate', 'Necklace'].map((s) => (
            <button type="button" key={s} onClick={() => { navigate(`/shop?q=${encodeURIComponent(s.split(' ')[0])}`); onClose(); }}
              className="border border-espresso/15 px-4 py-2 text-xs tracking-wide text-espresso-soft hover:border-espresso">{s}</button>
          ))}
        </div>
      </form>
    </div>
  );
}
