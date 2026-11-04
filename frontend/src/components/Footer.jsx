import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { Logo } from './Header';
import { Ornament, Spinner } from './ui';

const COLUMNS = [
  { title: 'Shop', links: [['All Products', '/shop'], ['Wedding Souvenirs', '/shop/wedding-souvenirs'], ['Birthday Gifts', '/shop/birthday-gifts'], ['Personalised Gifts', '/shop/personalised-gifts'], ['Gift Boxes', '/shop/gift-boxes'], ['New Arrivals', '/shop/new-arrivals']] },
  { title: 'Information', links: [['About Us', '/about'], ['Events & Occasions', '/occasions'], ['FAQ', '/faq'], ['Track an Order', '/track-order'], ['Contact Us', '/contact']] },
  { title: 'Business', links: [['Corporate Gifts', '/corporate'], ['Bulk & Event Orders', '/bulk-orders'], ['Request a Quote', '/bulk-orders#quote'], ['Custom Commissions', '/personalised#custom']] },
];

export function NewsletterForm({ dark = true }) {
  const { notify } = useApp();
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Please enter a valid email address.'); return; }
    setState('busy'); setError('');
    try {
      const r = await api('/api/newsletter', { method: 'POST', body: { email } });
      setState('done'); setEmail(''); notify(r.message);
    } catch (err) { setState('idle'); setError(err.message); }
  };
  if (state === 'done') return <p className={`font-display text-xl italic ${dark ? 'text-champagne' : ''}`}>Thank you — a little letter will find you soon.</p>;
  return (
    <form onSubmit={submit} noValidate className="w-full">
      <div className={`flex items-center border-b ${dark ? 'border-ivory/30' : 'border-espresso/30'}`}>
        <label htmlFor={`nl-${dark}`} className="sr-only">Email address</label>
        <input id={`nl-${dark}`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address"
          className={`w-full border-0 bg-transparent px-0 py-3 text-sm focus:outline-none focus:ring-0 ${dark ? 'text-ivory placeholder:text-ivory/50' : 'placeholder:text-espresso-muted'}`} />
        <button disabled={state === 'busy'} className={`shrink-0 py-3 pl-4 text-[11px] font-medium uppercase tracking-wide2 ${dark ? 'text-gold-soft hover:text-ivory' : 'text-gold-deep hover:text-espresso'}`}>
          {state === 'busy' ? <Spinner /> : 'Subscribe'}
        </button>
      </div>
      {error && <p className={`mt-2 text-xs ${dark ? 'text-red-200' : 'text-red-800'}`}>{error}</p>}
    </form>
  );
}

export default function Footer() {
  const { content } = useApp();
  const c = content?.contact || {};
  const email = c.email && !c.email.includes('.example') ? c.email : null;
  const phone = '07831 082965';

  return (
    <footer className="bg-cocoa text-champagne/80">
      <div className="container-site grid gap-10 py-14 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm">
          <Logo light markClassName="h-16" />
          <p className="mt-6 font-display text-2xl italic leading-snug text-ivory">Every moment deserves a signature.</p>
          <p className="mt-6 text-sm leading-relaxed">Letters on new collections, studio notes and occasional private offers.</p>
          <div className="mt-4"><NewsletterForm /></div>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 font-sans text-[10.5px] font-medium uppercase tracking-luxe text-gold-soft">{col.title}</h3>
              <ul className="space-y-2 text-sm">
                {col.links.map(([label, to]) => <li key={to}><Link to={to} className="transition-colors hover:text-ivory">{label}</Link></li>)}
              </ul>
            </div>
          ))}
          <div className="col-span-2 sm:col-span-1">
            <h3 className="mb-3 font-sans text-[10.5px] font-medium uppercase tracking-luxe text-gold-soft">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <Phone size={15} className="mt-0.5 shrink-0 text-gold-soft" />
                <a href="tel:07831082965" className="hover:text-ivory">07831 082965</a>
              </li>
              {email && (
                <li className="flex gap-2">
                  <Mail size={15} className="mt-0.5 shrink-0 text-gold-soft" />
                  <a href={`mailto:${email}`} className="break-all hover:text-ivory">{email}</a>
                </li>
              )}
              <li className="pt-1">
                <Link to="/contact" className="transition-colors hover:text-ivory">Contact Us</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <Ornament className="opacity-60" />
      <div className="container-site flex flex-col gap-5 py-8 text-xs text-champagne/60 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} LICHT Signature Souvenirs. All rights reserved. <span className="text-champagne/40">·</span> Made in Loveworld</p>
        <div className="flex items-center gap-3">
          <Link to="/policies/privacy" className="hover:text-ivory">Privacy Policy</Link>
          <span className="text-champagne/40">-</span>
          <Link to="/policies/terms" className="hover:text-ivory">Terms and Conditions</Link>
        </div>
      </div>
    </footer>
  );
}
