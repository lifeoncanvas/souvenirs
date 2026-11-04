import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Gift, Feather, Package, Sparkles, HeartHandshake, Instagram } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import ProductCard from '../components/ProductCard';
import { NewsletterForm } from '../components/Footer';
import { Img, Ornament, Reveal, SectionHeading, Seo, Spinner, Stars } from '../components/ui';

export default function Home() {
  const { content } = useApp();
  return (
    <>
      <Seo description="Luxury personalised souvenirs, curated gift boxes, corporate gifting and event favours — every moment deserves a signature."
        jsonLd={{ '@context': 'https://schema.org', '@type': 'Store', name: 'LICHT Signature Souvenirs', slogan: 'Memorable Moments. Beautifully Preserved.' }} />
      <Hero hero={content.hero} />
      <FeaturedCollections />
      <SignatureCollection />
      <AboutBrand about={content.about} />
      <WhyChoose />
      <Occasions data={content.occasions} />
      <Personalised data={content.personalised} />
      <CorporateBand data={content.corporate} />
      <GiftBoxes data={content.giftBoxes} />
      <BulkOrders data={content.bulk} />
      <HowItWorks />
      <Testimonials />
      <InstagramGrid data={content.instagram} />
      <Newsletter />
    </>
  );
}

/* A — Hero: full-bleed photograph framed by a fine hairline circle, like a gallery plate. */
function Hero({ hero }) {
  const h = hero || {};
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink text-ivory">
      {h.image && <img src={h.image} alt={h.imageAlt || ''} className="absolute inset-0 h-full w-full animate-slowZoom object-cover opacity-75" fetchpriority="high" />}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/30 to-ink/75" />
      {/* soft dark pool behind the copy so it reads over busy photography */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_52%,rgba(21,17,14,0.72)_0%,rgba(21,17,14,0.45)_55%,rgba(21,17,14,0)_100%)]" />
      {/* hairline geometry */}
      <div className="pointer-events-none absolute inset-0 hidden items-center justify-center md:flex" aria-hidden="true">
        <div className="relative aspect-square h-[78vh] max-h-[760px] rounded-full border border-ivory/25">
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ivory/15" />
          <span className="absolute left-[-14vw] right-[-14vw] top-1/2 h-px bg-ivory/15" />
          {['left-1/2 -top-[3px] -translate-x-1/2', 'left-1/2 -bottom-[3px] -translate-x-1/2', '-left-[3px] top-1/2 -translate-y-1/2', '-right-[3px] top-1/2 -translate-y-1/2'].map((pos) => (
            <span key={pos} className={`absolute h-1.5 w-1.5 rounded-full bg-ivory/80 ${pos}`} />
          ))}
        </div>
      </div>
      <div className="container-site relative z-10 flex flex-col items-center pt-24 text-center">
        <span className="animate-fadeUp text-[10.5px] font-medium uppercase tracking-luxe text-champagne [text-shadow:0_1px_12px_rgba(0,0,0,.6)]">{h.eyebrow || 'Luxury souvenirs & personalised gifting'}</span>
        <h1 className="mt-6 max-w-4xl animate-fadeUp font-display text-[2.7rem] font-normal uppercase leading-[1.02] tracking-[0.02em] text-balance [animation-delay:120ms] [text-shadow:0_2px_30px_rgba(0,0,0,.55)] sm:text-6xl lg:text-[5.4rem]">
          {(h.headline || 'Memorable Moments. Beautifully Preserved.').split('. ').map((part, i, arr) => (
            <span key={i} className={`block ${i === 1 ? 'italic normal-case text-champagne' : ''}`}>{part}{i < arr.length - 1 ? '.' : ''}</span>
          ))}
        </h1>
        <p className="mt-7 max-w-xl animate-fadeUp text-[15px] leading-[1.8] text-ivory [animation-delay:240ms] [text-shadow:0_1px_14px_rgba(0,0,0,.7)] sm:text-base">{h.subheadline}</p>
        <div className="mt-10 flex w-full animate-fadeUp flex-col justify-center gap-3 [animation-delay:360ms] sm:w-auto sm:flex-row">
          <Link to="/shop" className="btn-light">{h.primaryCta || 'Shop Now'}</Link>
          <a href="#collections" className="btn-outline-light bg-ink/35 backdrop-blur-sm">{h.secondaryCta || 'Explore Our Collection'}</a>
        </div>
      </div>
      <a href="#collections" className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[9.5px] uppercase tracking-luxe text-ivory/70 sm:flex" aria-label="Scroll to collections">
        Scroll<span className="h-10 w-px bg-ivory/40" />
      </a>
    </section>
  );
}

/* B — Featured collections: an asymmetric editorial grid. */
function FeaturedCollections() {
  const [cats, setCats] = useState(null);
  useEffect(() => { api('/api/categories').then((c) => setCats(c.filter((x) => x.featured))).catch(() => setCats([])); }, []);
  return (
    <section id="collections" className="container-site scroll-mt-24 py-24 lg:py-32">
      <SectionHeading eyebrow="The Collections" title={<>Gifts Made for <em className="text-gold-deep">Every</em> Occasion.</>}
        text="Five considered collections, each composed to hold a different kind of moment." />
      {!cats ? <div className="flex justify-center py-20"><Spinner /></div> : (
        <div className="mt-16 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-6 md:grid-rows-[repeat(2,minmax(0,300px))] lg:grid-rows-[repeat(2,minmax(0,340px))]">
          {cats.slice(0, 5).map((c, i) => {
            const layout = ['md:col-span-3 md:row-span-2', 'md:col-span-3', 'md:col-span-1 md:col-start-4', 'md:col-span-2', 'md:col-span-6 md:h-[300px]'][i] || '';
            const imageSrc = c.slug === 'gift-boxes'
              ? 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=2000&q=85'
              : c.imageUrl;
            return (
              <Reveal key={c.id} delay={i * 90} className={`${layout} ${i === 0 ? 'col-span-2' : ''} ${i === 4 ? 'md:row-start-3' : ''}`}>
                <Link to={`/shop/${c.slug}`} className={`group relative block overflow-hidden md:h-full ${i === 0 ? 'h-[440px]' : 'h-[280px]'}`}>
                  <Img src={imageSrc} alt={c.name} className="absolute inset-0" imgClassName={`transition-transform duration-[1600ms] ease-silk group-hover:scale-105 ${i === 4 ? 'object-[center_40%]' : ''}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-ivory sm:p-8">
                    <span className="text-[10px] uppercase tracking-luxe text-gold-soft">0{i + 1}</span>
                    <h3 className={`mt-2 font-display leading-none ${i === 0 ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'} ${i === 2 ? 'md:text-2xl' : ''}`}>{c.name}</h3>
                    <p className={`mt-3 max-w-xs text-sm text-ivory/75 ${i === 0 ? '' : 'hidden sm:block'} ${i === 2 ? 'md:hidden' : ''}`}>{c.description}</p>
                    <span className="link-underline mt-5 text-ivory">Explore collection <ArrowRight size={13} /></span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* C — Signature collection: bestsellers from the product database. */
function SignatureCollection() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    api('/api/products?category=bestsellers&sort=popular&size=8').then((r) => setProducts(r.content)).catch(() => setError(true));
  }, []);
  return (
    <section className="border-t border-espresso/10 bg-champagne/40 py-24 lg:py-32">
      <div className="container-site">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading align="left" eyebrow="Bestsellers" title="Our Signature Collection" text="The pieces our clients return to — refined, personal and made to be kept." />
          <Link to="/shop/bestsellers" className="link-underline shrink-0">View all <ArrowRight size={13} /></Link>
        </div>
        {error && <p className="mt-12 text-espresso-muted">The collection could not be loaded right now. Please refresh to try again.</p>}
        {!products && !error && <div className="flex justify-center py-20"><Spinner /></div>}
        {products && (
          <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
            {products.map((p, i) => <Reveal key={p.id} delay={(i % 4) * 80}><ProductCard product={p} /></Reveal>)}
          </div>
        )}
      </div>
    </section>
  );
}

/* D — About the brand: a scattered editorial collage around oversized type. */
function AboutBrand({ about }) {
  const a = about || {};
  return (
    <section className="relative overflow-hidden py-24 lg:py-36">
      <div className="container-site relative grid gap-y-10 lg:grid-cols-12 lg:gap-x-8">
        <Reveal className="lg:col-span-5 lg:col-start-1 lg:row-start-1">
          <p className="font-display text-[3.3rem] leading-[0.95] text-gold-deep sm:text-7xl lg:text-[6.5rem]">More</p>
        </Reveal>
        <Reveal delay={120} className="lg:col-span-4 lg:col-start-6 lg:row-span-2 lg:row-start-1">
          <Img src={a.image} alt="A gift tied with ribbon" className="aspect-[4/5] w-full" />
          <p className="mt-2 text-[10px] uppercase tracking-wide2 text-espresso-muted">Hand-tied, every time</p>
        </Reveal>
        <Reveal delay={60} className="lg:col-span-4 lg:col-start-9 lg:row-start-2 lg:mt-16 lg:self-start">
          <p className="text-right font-display text-[3.3rem] italic leading-[0.95] text-gold-deep sm:text-7xl lg:text-[6.5rem]">than a gift.</p>
        </Reveal>
        <Reveal delay={160} className="hidden lg:col-span-3 lg:col-start-1 lg:row-start-2 lg:mt-24 lg:block">
          <Img src={a.image2} alt="Hand-thrown ceramic cups" className="aspect-square w-full" />
        </Reveal>
        <Reveal className="lg:col-span-5 lg:col-start-4 lg:row-start-3 lg:mt-16">
          <h2 className="display-md">{a.heading || "More Than a Gift. It's a Memory."}</h2>
          <p className="lede mt-6">{a.body}</p>
          <Link to="/about" className="btn-outline mt-9">Explore Our Story</Link>
        </Reveal>
        <Reveal delay={200} className="hidden lg:col-span-3 lg:col-start-10 lg:row-start-3 lg:mt-36 lg:block">
          <Img src={a.image3} alt="A lit candle" className="aspect-[3/4] w-full" />
        </Reveal>
      </div>
    </section>
  );
}

/* E — Why choose LICHT. */
const BENEFITS = [
  { icon: Sparkles, title: 'Beautifully Curated', text: 'Every piece is selected for craft, material and quiet elegance.' },
  { icon: Feather, title: 'Personalised', text: 'Names, dates, initials and messages, finished by hand.' },
  { icon: Gift, title: 'Premium Presentation', text: 'Keepsake boxes, tissue and ribbon — ready to give.' },
  { icon: HeartHandshake, title: 'Made for Memories', text: 'Designed to be kept long after the moment has passed.' },
  { icon: Package, title: 'Professional Service', text: 'A dedicated studio contact from first idea to delivery.' },
];
function WhyChoose() {
  return (
    <section className="bg-cocoa py-24 text-champagne lg:py-28">
      <div className="container-site">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] uppercase tracking-luxe text-gold-soft">The Signature Difference</span>
          <h2 className="display-lg mt-4 text-ivory">Why Choose LICHT Signature?</h2>
        </Reveal>
        <div className="mt-16 grid gap-px bg-champagne/10 sm:grid-cols-2 lg:grid-cols-5">
          {BENEFITS.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 80} className="flex flex-col items-center bg-cocoa px-6 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 text-gold-soft"><Icon size={20} strokeWidth={1.2} /></span>
              <h3 className="mt-6 font-display text-xl text-ivory">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-champagne/70">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* F — Events & occasions: a horizontal gallery of tall frames. */
function Occasions({ data }) {
  const items = data?.items || [];
  return (
    <section className="py-24 lg:py-32">
      <div className="container-site flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading align="left" eyebrow="Events & Occasions" title={<>For the moments <em>worth keeping.</em></>} />
        <Link to="/occasions" className="link-underline shrink-0">All occasions <ArrowRight size={13} /></Link>
      </div>
      <div className="scrollbar-none mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:px-8 lg:px-12">
        {items.map((o, i) => (
          <Link key={o.slug} to={`/shop/${o.category}`} className="group relative w-[72vw] max-w-[320px] shrink-0 snap-start sm:w-[300px]">
            <Img src={o.image} alt={o.title} className="aspect-[3/4]" imgClassName="transition-transform duration-[1600ms] ease-silk group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent opacity-90" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-ivory">
              <span className="text-[10px] tracking-luxe text-gold-soft">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-1 font-display text-2xl leading-tight">{o.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* G — Make it personal. */
function Personalised({ data }) {
  const d = data || {};
  return (
    <section className="bg-champagne/50">
      <div className="grid lg:grid-cols-2">
        <Img src={d.image} alt="Personalised stationery" className="min-h-[420px] lg:min-h-[640px]" />
        <div className="flex items-center px-5 py-20 sm:px-12 lg:px-20">
          <Reveal className="max-w-lg">
            <span className="eyebrow">Personalised Gifting</span>
            <h2 className="display-lg mt-4">{d.heading || 'Make It Personal.'}</h2>
            <p className="lede mt-6">{d.body}</p>
            <ul className="mt-9 flex flex-wrap gap-2">
              {(d.options || []).map((o) => (
                <li key={o} className="border border-espresso/15 bg-ivory/70 px-4 py-2 font-display text-lg italic">{o}</li>
              ))}
            </ul>
            <Link to="/personalised" className="btn-dark mt-10">Create Something Personal</Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* H — Corporate gifting. */
function CorporateBand({ data }) {
  const d = data || {};
  return (
    <section className="relative overflow-hidden bg-ink py-24 text-ivory lg:py-36">
      {d.image && <img src={d.image} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" />
      <div className="container-site relative">
        <Reveal className="max-w-xl">
          <span className="text-[11px] uppercase tracking-luxe text-gold-soft">Corporate Gifting</span>
          <h2 className="display-lg mt-4">{d.heading || 'Corporate Gifting, With a Signature Touch.'}</h2>
          <p className="mt-6 text-[15px] leading-[1.8] text-ivory/75">{d.body}</p>
          <ul className="mt-8 space-y-3">
            {(d.points || []).map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-ivory/85"><span className="h-px w-6 bg-gold" />{p}</li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link to="/corporate#quote" className="btn-light">Request a Corporate Quote</Link>
            <Link to="/shop/corporate-gifts" className="btn-outline-light">Shop corporate gifts</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* I — Gift boxes. */
function GiftBoxes({ data }) {
  const items = data?.items || [];
  return (
    <section className="container-site py-24 lg:py-32">
      <SectionHeading eyebrow="Curated Gift Boxes" title="Composed, wrapped, ready to give." />
      <div className="mt-14 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5">
        {items.map((b, i) => (
          <Reveal key={b.title} delay={i * 80} className={i === 4 ? 'col-span-2 lg:col-span-1' : ''}>
            <Link to={b.link || '/gift-boxes'} className="group block">
              <Img src={b.image} alt={b.title} className={`${i === 4 ? 'aspect-[2/1] lg:aspect-[3/4]' : 'aspect-[3/4]'}`} imgClassName="transition-transform duration-[1400ms] ease-silk group-hover:scale-105" />
              <h3 className="mt-4 font-display text-xl">{b.title}</h3>
              <p className="mt-1 text-[13px] text-espresso-muted">{b.description}</p>
            </Link>
          </Reveal>
        ))}
      </div>
      <div className="mt-12 text-center"><Link to="/gift-boxes" className="btn-outline">Discover gift boxes</Link></div>
    </section>
  );
}

/* J — Bulk & event orders. */
function BulkOrders({ data }) {
  const d = data || {};
  return (
    <section className="border-y border-espresso/10 bg-ivory">
      <div className="container-site grid items-center gap-12 py-24 lg:grid-cols-2 lg:py-28">
        <Reveal>
          <span className="eyebrow">Bulk & Event Orders</span>
          <h2 className="display-lg mt-4">{d.heading || 'Planning an Event? Let Us Help.'}</h2>
          <p className="lede mt-6 max-w-lg">{d.body}</p>
          <Link to="/bulk-orders#quote" className="btn-dark mt-10">Request a Quote</Link>
        </Reveal>
        <div className="grid grid-cols-2 gap-px border border-espresso/10 bg-espresso/10">
          {(d.tiers || ['20', '50', '100', '500+']).map((t, i) => (
            <Reveal key={t} delay={i * 90} className="flex aspect-[4/3] flex-col items-center justify-center bg-ivory">
              <span className="font-display text-5xl font-light text-gold-deep sm:text-6xl">{t}</span>
              <span className="mt-2 text-[10px] uppercase tracking-luxe text-espresso-muted">souvenirs</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* K — How it works. */
const STEPS = [
  ['Choose', 'Browse and select your preferred product.'],
  ['Personalise', 'Add names, dates, logos, or messages.'],
  ['Confirm', 'Review and approve the order details.'],
  ['Receive', 'Get your beautifully packaged order delivered.'],
];
function HowItWorks() {
  return (
    <section className="container-site py-24 lg:py-32">
      <SectionHeading eyebrow="How It Works" title="Four quiet steps." />
      <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {STEPS.map(([t, d], i) => (
          <Reveal as="li" key={t} delay={i * 100} className="relative lg:px-8 lg:[&:not(:first-child)]:border-l lg:border-espresso/10">
            <span className="font-display text-6xl font-light text-gold/70">0{i + 1}</span>
            <h3 className="mt-4 text-[12px] font-medium uppercase tracking-luxe">{t}</h3>
            <p className="mt-3 text-sm leading-relaxed text-espresso-muted">{d}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

/* L — Testimonials carousel. */
function Testimonials() {
  const [items, setItems] = useState([]);
  const [i, setI] = useState(0);
  useEffect(() => { api('/api/testimonials').then(setItems).catch(() => {}); }, []);
  useEffect(() => {
    if (items.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [items.length]);
  if (!items.length) return null;
  const t = items[i];
  return (
    <section className="bg-champagne/50 py-24 lg:py-32">
      <div className="container-site max-w-4xl text-center">
        <span className="eyebrow">Kind Words</span>
        <div key={t.id} className="mt-8 animate-fadeIn">
          <Stars value={t.rating} className="text-lg" />
          <blockquote className="mt-6 font-display text-2xl italic leading-snug text-balance sm:text-4xl">“{t.quote}”</blockquote>
          <p className="mt-8 text-[11px] uppercase tracking-luxe">{t.authorName}</p>
          {t.occasion && <p className="mt-1 text-xs text-espresso-muted">{t.occasion}</p>}
          {t.placeholder && <p className="mt-3 text-[10px] uppercase tracking-wide text-gold-deep">Placeholder testimonial</p>}
        </div>
        {items.length > 1 && (
          <div className="mt-10 flex items-center justify-center gap-6">
            <button onClick={() => setI((i - 1 + items.length) % items.length)} aria-label="Previous testimonial" className="flex h-11 w-11 items-center justify-center rounded-full border border-espresso/20 hover:border-espresso"><ArrowLeft size={16} strokeWidth={1.3} /></button>
            <div className="flex gap-2">
              {items.map((x, n) => <button key={x.id} onClick={() => setI(n)} aria-label={`Testimonial ${n + 1}`} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-gold-deep' : 'w-1.5 bg-espresso/25'}`} />)}
            </div>
            <button onClick={() => setI((i + 1) % items.length)} aria-label="Next testimonial" className="flex h-11 w-11 items-center justify-center rounded-full border border-espresso/20 hover:border-espresso"><ArrowRight size={16} strokeWidth={1.3} /></button>
          </div>
        )}
      </div>
    </section>
  );
}

/* M — Instagram grid. */
function InstagramGrid({ data }) {
  const d = data || {};
  const images = d.images || [];
  if (!images.length) return null;
  return (
    <section className="py-24 lg:py-28">
      <div className="container-site flex flex-col items-center text-center">
        <span className="eyebrow">{d.handle || '@lichtsignature'}</span>
        <h2 className="display-md mt-3">From the studio, on Instagram</h2>
      </div>
      <div className="mt-12 grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-8">
        {images.map((src, n) => (
          <a key={src} href={d.url} target="_blank" rel="noreferrer" className="group relative block" aria-label={`Instagram post ${n + 1}`}>
            <Img src={src} alt="" className="aspect-square" imgClassName="transition-transform duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 flex items-center justify-center bg-ink/0 text-ivory opacity-0 transition group-hover:bg-ink/30 group-hover:opacity-100"><Instagram size={20} strokeWidth={1.4} /></span>
          </a>
        ))}
      </div>
      <div className="mt-10 text-center"><a href={d.url} target="_blank" rel="noreferrer" className="btn-outline">Follow Us</a></div>
    </section>
  );
}

/* N — Newsletter. */
function Newsletter() {
  return (
    <section className="border-t border-espresso/10 py-24">
      <Reveal className="container-site flex max-w-xl flex-col items-center text-center">
        <Ornament />
        <h2 className="display-md mt-6">Letters from the studio</h2>
        <p className="lede mt-4">New collections, gifting notes and the occasional private offer. Never more than once a month.</p>
        <div className="mt-8 w-full"><NewsletterForm dark={false} /></div>
      </Reveal>
    </section>
  );
}
