import { Mail, Phone, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PageHero from '../components/PageHero';
import EnquiryForm from '../components/EnquiryForm';
import { Seo } from '../components/ui';

export default function Contact() {
  const { content } = useApp();
  const c = content.contact || {};
  const email = c.email && !c.email.includes('.example') ? c.email : null;
  const phone = '07831 082965';

  const rows = [
    [Phone, 'Phone', phone, `tel:07831082965`],
    email && [Mail, 'Email', email, `mailto:${email}`],
    c.hours && [Clock, 'Hours', c.hours],
  ].filter(Boolean);
  return (
    <>
      <Seo title="Contact Us" description="Get in touch with LICHT Signature Souvenirs about personalised gifts, events and corporate orders." />
      <PageHero eyebrow="Contact Us" title="We'd love to hear about your moment." text="Questions, ideas or orders — our studio replies within two working days." />
      <section className="container-site grid gap-14 py-20 lg:grid-cols-[1fr_1.6fr] lg:py-28">
        <aside>
          <ul className="space-y-6">
            {rows.map(([Icon, label, value, href]) => (
              <li key={label} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold-deep"><Icon size={16} strokeWidth={1.3} /></span>
                <div>
                  <span className="label">{label}</span>
                  {href ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="break-all hover:text-gold-deep">{value}</a> : <span>{value}</span>}
                </div>
              </li>
            ))}
          </ul>
          {c.note && <p className="mt-8 text-xs text-gold-deep">{c.note}</p>}
        </aside>
        <div>
          <h2 className="display-md mb-10">Send a message</h2>
          <EnquiryForm type="CONTACT" submitLabel="Send message" />
        </div>
      </section>
    </>
  );
}
