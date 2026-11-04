import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import PageHero from '../components/PageHero';
import { Img, Ornament, Reveal, Seo } from '../components/ui';

const VALUES = [
  ['Intention', 'Every piece is chosen for the moment it will hold, not to fill a shelf.'],
  ['Craft', 'We work with makers who care about material, finish and longevity.'],
  ['Presentation', 'The unwrapping is part of the gift. We treat it that way.'],
];

export default function About() {
  const { content } = useApp();
  const a = content.about || {};
  return (
    <>
      <Seo title="About Us" description={a.body?.slice(0, 155)} image={a.image} />
      <PageHero eyebrow="Our Story" title={a.heading || "More Than a Gift. It's a Memory."} text={a.body} image={a.image} imageAlt="A wrapped LICHT gift" />
      <section className="container-site grid items-center gap-12 py-24 lg:grid-cols-2 lg:py-32">
        <Reveal className="grid grid-cols-2 gap-4">
          <Img src={a.image2} alt="Hand-thrown cups" className="aspect-[3/4]" />
          <Img src={a.image3} alt="Candlelight" className="mt-16 aspect-[3/4]" />
        </Reveal>
        <Reveal>
          <span className="eyebrow">Every Moment Deserves a Signature</span>
          <h2 className="display-md mt-4">Designed with intention, finished by hand.</h2>
          <p className="lede mt-6">{a.body2}</p>
          <Link to="/shop" className="btn-dark mt-10">Discover the collection</Link>
        </Reveal>
      </section>
      <section className="bg-cocoa py-24 text-champagne">
        <div className="container-site">
          <Ornament />
          <div className="mt-12 grid gap-12 md:grid-cols-3">
            {VALUES.map(([t, d], i) => (
              <Reveal key={t} delay={i * 100} className="text-center">
                <h3 className="font-display text-3xl italic text-ivory">{t}</h3>
                <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
