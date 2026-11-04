import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageHero from '../components/PageHero';
import { Img, Reveal, Seo } from '../components/ui';

export default function Occasions() {
  const { content } = useApp();
  const items = content.occasions?.items || [];
  return (
    <>
      <Seo title="Events & Occasions" description="Souvenirs and gifts for weddings, birthdays, anniversaries, baby showers, christenings, graduations and corporate events." />
      <PageHero eyebrow="Events & Occasions" title={<>For the moments <em>worth keeping.</em></>} text="From intimate milestones to celebrations of hundreds, we compose souvenirs that carry the feeling of the day." />
      <section className="container-site grid gap-x-6 gap-y-14 py-20 sm:grid-cols-2 lg:grid-cols-3 lg:py-28">
        {items.map((o, i) => (
          <Reveal key={o.slug} delay={(i % 3) * 90}>
            <Link to={`/shop/${o.category}`} className="group block">
              <Img src={o.image} alt={o.title} className="aspect-[4/5]" imgClassName="transition-transform duration-[1400ms] ease-silk group-hover:scale-105" />
              <span className="mt-5 block text-[10px] tracking-luxe text-gold-deep">{String(i + 1).padStart(2, '0')}</span>
              <h2 className="mt-1 font-display text-3xl">{o.title}</h2>
              <span className="link-underline mt-4">Explore gifts <ArrowRight size={13} /></span>
            </Link>
          </Reveal>
        ))}
      </section>
      <section className="border-t border-espresso/10 bg-champagne/40 py-20 text-center">
        <h2 className="display-md">Planning for a crowd?</h2>
        <p className="lede mx-auto mt-4 max-w-lg">We produce consistent, beautifully finished souvenirs from 20 to 500+ pieces.</p>
        <Link to="/bulk-orders#quote" className="btn-dark mt-8">Request a Quote</Link>
      </section>
    </>
  );
}
