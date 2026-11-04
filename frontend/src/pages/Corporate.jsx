import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import PageHero from '../components/PageHero';
import ProductCard from '../components/ProductCard';
import EnquiryForm from '../components/EnquiryForm';
import { Reveal, SectionHeading, Seo } from '../components/ui';

export default function Corporate() {
  const { content } = useApp();
  const d = content.corporate || {};
  const [products, setProducts] = useState([]);
  useEffect(() => { api('/api/products?category=corporate-gifts&size=4&sort=popular').then((r) => setProducts(r.content)).catch(() => {}); }, []);
  return (
    <>
      <Seo title="Corporate Gifts" description={d.body?.slice(0, 155)} image={d.image} />
      <PageHero eyebrow="Corporate Gifting" title={d.heading || 'Corporate Gifting, With a Signature Touch.'} text={d.body} image={d.image} imageAlt="A business meeting">
        <ul className="mt-8 space-y-3">
          {(d.points || []).map((p) => <li key={p} className="flex items-center gap-3 text-sm"><span className="h-px w-6 bg-gold" />{p}</li>)}
        </ul>
        <a href="#quote" className="btn-dark mt-10">Request a Corporate Quote</a>
      </PageHero>
      {products.length > 0 && (
        <section className="container-site py-24">
          <SectionHeading eyebrow="Client favourites" title="Corporate pieces" />
          <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
      <section id="quote" className="scroll-mt-28 border-t border-espresso/10 bg-champagne/40 py-24">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <span className="eyebrow">Request a Quote</span>
            <h2 className="display-md mt-4">Tell us about your gifting programme.</h2>
            <p className="lede mt-6">Client appreciation, onboarding kits, events or seasonal gifting — we'll respond within two working days with ideas and tiered pricing.</p>
          </Reveal>
          <EnquiryForm type="CORPORATE" submitLabel="Request a Corporate Quote" />
        </div>
      </section>
    </>
  );
}
