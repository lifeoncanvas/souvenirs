import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import PageHero from '../components/PageHero';
import ProductCard from '../components/ProductCard';
import { Img, Reveal, SectionHeading, Seo, Spinner } from '../components/ui';

export default function GiftBoxes() {
  const { content } = useApp();
  const boxes = content.giftBoxes?.items || [];
  const [products, setProducts] = useState(null);
  useEffect(() => { api('/api/products?category=gift-boxes&size=12').then((r) => setProducts(r.content)).catch(() => setProducts([])); }, []);
  return (
    <>
      <Seo title="Gift Boxes" description="Curated luxury gift boxes — The Signature, Celebration, Wedding, Corporate and Luxury Boxes." />
      <PageHero eyebrow="Curated Gift Boxes" title="Composed, wrapped, ready to give." text="Each box is assembled by hand, tissue-wrapped and finished with ribbon and a handwritten card." />
      <section className="container-site grid gap-6 py-20 sm:grid-cols-2 lg:grid-cols-5">
        {boxes.map((b, i) => (
          <Reveal key={b.title} delay={i * 70}>
            <Img src={b.image} alt={b.title} className="aspect-[3/4]" />
            <h2 className="mt-4 font-display text-2xl">{b.title}</h2>
            <p className="mt-1 text-sm text-espresso-muted">{b.description}</p>
          </Reveal>
        ))}
      </section>
      <section className="border-t border-espresso/10 py-20">
        <div className="container-site">
          <SectionHeading eyebrow="Shop gift boxes" title="Available now" />
          {!products ? <div className="flex justify-center py-16"><Spinner /></div> : (
            <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
