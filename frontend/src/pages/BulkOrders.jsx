import { useApp } from '../context/AppContext';
import PageHero from '../components/PageHero';
import EnquiryForm from '../components/EnquiryForm';
import { Reveal, Seo } from '../components/ui';

export default function BulkOrders() {
  const { content } = useApp();
  const d = content.bulk || {};
  return (
    <>
      <Seo title="Bulk & Event Orders" description={d.body?.slice(0, 155)} image={d.image} />
      <PageHero eyebrow="Bulk & Event Orders" title={d.heading || 'Planning an Event? Let Us Help.'} text={d.body} image={d.image} imageAlt="An elegant event table">
        <a href="#quote" className="btn-dark mt-10">Request a Quote</a>
      </PageHero>
      <section className="container-site py-20">
        <div className="grid grid-cols-2 gap-px border border-espresso/10 bg-espresso/10 md:grid-cols-4">
          {(d.tiers || ['20', '50', '100', '500+']).map((t, i) => (
            <Reveal key={t} delay={i * 80} className="flex flex-col items-center bg-ivory py-12">
              <span className="font-display text-6xl font-light text-gold-deep">{t}</span>
              <span className="mt-2 text-[10px] uppercase tracking-luxe text-espresso-muted">souvenirs</span>
            </Reveal>
          ))}
        </div>
      </section>
      <section id="quote" className="scroll-mt-28 border-t border-espresso/10 bg-champagne/40 py-24">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <span className="eyebrow">Request a Quote</span>
            <h2 className="display-md mt-4">Tell us about your event.</h2>
            <p className="lede mt-6">Share the date, quantity and the feeling you'd like guests to take home. We'll come back with ideas, samples and tiered pricing.</p>
          </Reveal>
          <EnquiryForm type="BULK" />
        </div>
      </section>
    </>
  );
}
