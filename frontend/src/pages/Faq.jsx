import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import PageHero from '../components/PageHero';
import { ErrorState, PageLoader, Seo } from '../components/ui';

export default function Faq() {
  const [faqs, setFaqs] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  useEffect(() => { api('/api/faqs').then(setFaqs).catch((e) => setError(e.message)); }, []);
  const groups = useMemo(() => {
    const g = new Map();
    (faqs || []).forEach((f) => g.set(f.category, [...(g.get(f.category) || []), f]));
    return [...g.entries()];
  }, [faqs]);
  const jsonLd = faqs && {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
  };
  return (
    <>
      <Seo title="FAQ" description="Answers about personalised souvenirs, bulk orders, delivery, payments and returns." jsonLd={jsonLd} />
      <PageHero eyebrow="Questions" title="Frequently Asked" text="Everything you need to know about ordering from our studio." />
      <section className="container-site max-w-3xl py-20">
        {error && <ErrorState message={error} />}
        {!faqs && !error && <PageLoader />}
        {groups.map(([cat, items]) => (
          <div key={cat} className="mb-14">
            <h2 className="eyebrow mb-4">{cat}</h2>
            <ul className="border-t border-espresso/10">
              {items.map((f) => (
                <li key={f.id} className="border-b border-espresso/10">
                  <button onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left font-display text-xl sm:text-2xl">
                    {f.question}
                    <Plus size={18} strokeWidth={1.3} className={`shrink-0 transition-transform duration-300 ${open === f.id ? 'rotate-45' : ''}`} />
                  </button>
                  <div className={`grid transition-all duration-500 ease-silk ${open === f.id ? 'grid-rows-[1fr] pb-6' : 'grid-rows-[0fr]'}`}>
                    <p className="overflow-hidden text-[15px] leading-relaxed text-espresso-soft">{f.answer}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="mt-10 border border-espresso/10 bg-champagne/40 p-8 text-center">
          <p className="font-display text-2xl">Still wondering?</p>
          <Link to="/contact" className="btn-dark mt-6">Contact the studio</Link>
        </div>
      </section>
    </>
  );
}
