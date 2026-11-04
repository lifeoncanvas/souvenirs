import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import PageHero from '../components/PageHero';
import ProductCard from '../components/ProductCard';
import EnquiryForm from '../components/EnquiryForm';
import { Reveal, SectionHeading, Seo, Spinner } from '../components/ui';

export default function Personalised() {
  const { content } = useApp();
  const d = content.personalised || {};
  const [products, setProducts] = useState(null);
  useEffect(() => { api('/api/products?personalisable=true&sort=popular&size=8').then((r) => setProducts(r.content)).catch(() => setProducts([])); }, []);
  return (
    <>
      <Seo title="Personalised Gifts" description="Personalise souvenirs with names, dates, initials, messages, logos and event details." image={d.image} />
      <PageHero eyebrow="Personalised Gifting" title={d.heading || 'Make It Personal.'} text={d.body} image={d.image} imageAlt="Personalised stationery">
        <ul className="mt-8 flex flex-wrap gap-2">
          {(d.options || []).map((o) => <li key={o} className="border border-espresso/15 bg-ivory/70 px-4 py-2 font-display text-lg italic">{o}</li>)}
        </ul>
        <a href="#shop-personalised" className="btn-dark mt-10">Create Something Personal</a>
      </PageHero>
      <section id="shop-personalised" className="container-site scroll-mt-28 py-24">
        <SectionHeading eyebrow="Ready to personalise" title="Pieces that carry your details" />
        {!products ? <div className="flex justify-center py-16"><Spinner /></div> : (
          <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
        <div className="mt-12 text-center"><Link to="/shop/personalised-gifts" className="btn-outline">View all personalised gifts</Link></div>
      </section>
      <section id="custom" className="scroll-mt-28 border-t border-espresso/10 bg-champagne/40 py-24">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <span className="eyebrow">Custom Commissions</span>
            <h2 className="display-md mt-4">Have something completely bespoke in mind?</h2>
            <p className="lede mt-6">Share your idea — a custom design, a special material, an unusual quantity — and our studio will advise on what's possible, timing and cost.</p>
          </Reveal>
          <EnquiryForm type="CUSTOM" submitLabel="Send my idea" />
        </div>
      </section>
    </>
  );
}
