import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import PageHero from '../components/PageHero';
import { Notice, Seo } from '../components/ui';

const TITLES = { privacy: 'Privacy Policy', terms: 'Terms & Conditions', shipping: 'Delivery Information', returns: 'Returns & Refunds' };

const DEFAULTS = {
  privacy: `At LICHT Signature Souvenirs, we value your privacy and are committed to protecting your personal information.

We collect details you provide when placing an order, creating an account, requesting a bespoke quote, or subscribing to our notes — including your name, email address, delivery address, phone number, and personalisation details.

Your information is used solely to process and dispatch your orders, communicate regarding proof approvals, and provide customer support. Card details are processed securely and never stored on our servers.

We do not sell, rent, or trade your personal data with third parties. For any inquiries regarding your privacy or data, please contact our studio.`,
  terms: `Welcome to LICHT Signature Souvenirs. By placing an order with us, you agree to these terms and conditions.

Every signature souvenir is crafted with meticulous attention to quality and material integrity. For personalised pieces, please review your text, spelling, and proof carefully before approval, as customized items are made to order.

Orders are confirmed and scheduled for production once payment is completed or terms agreed. Standard delivery is handled by reputable tracked courier services to ensure your pieces arrive safely.

If your order arrives damaged or defective in transit, please notify our studio within 48 hours of receipt with your order number and photographs, and we will arrange a replacement promptly.`
};

/**
 * Policy pages are managed in Admin → Content under keys like "policyPrivacy" ({ "body": "..." }).
 * A sensible default is provided if custom text has not yet been saved in Admin.
 */
export default function Policy() {
  const { slug } = useParams();
  const { content } = useApp();
  const title = TITLES[slug] || 'Policy';
  const key = `policy${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
  const body = content[key]?.body || DEFAULTS[slug];
  return (
    <>
      <Seo title={title} />
      <PageHero eyebrow="Policies" title={title} />
      <section className="container-site max-w-3xl py-16">
        {body
          ? body.split(/\n{2,}/).map((p, i) => <p key={i} className="lede mb-5 whitespace-pre-line">{p}</p>)
          : <Notice>This policy has not been published yet.</Notice>}
      </section>
    </>
  );
}
