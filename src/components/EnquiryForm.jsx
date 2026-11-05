import { useState } from 'react';
import { api } from '../lib/api';
import { Field, Notice, Ornament, Spinner } from './ui';
import Captcha from './Captcha';

const EVENT_TYPES = ['Wedding', 'Birthday', 'Anniversary', 'Baby shower', 'Christening / celebration', 'Graduation', 'Corporate event', 'Conference', 'Product launch', 'Other'];
const BUDGETS = ['Under 500', '500 – 1,500', '1,500 – 5,000', '5,000 – 15,000', '15,000+', 'Not sure yet'];
const TOPICS = ['General question', 'An existing order', 'Personalised gift', 'Bulk / event order', 'Corporate gifting', 'Press & collaborations'];

/**
 * Shared enquiry form for bulk, corporate, custom and contact enquiries.
 * Stored server-side and managed in Admin → Enquiries.
 */
export default function EnquiryForm({ type = 'BULK', submitLabel = 'Request a Quote' }) {
  const corporate = type === 'CORPORATE';
  const contact = type === 'CONTACT';
  const needsQty = type === 'BULK' || corporate;
  const [v, setV] = useState({ website: '' });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ busy: false, done: null, error: '' });
  const [captcha, setCaptcha] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const set = (k) => (e) => { setV({ ...v, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }); };

  const validate = () => {
    const e = {};
    if (!v.fullName?.trim()) e.fullName = 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(v.email || '')) e.email = 'Please enter a valid email address.';
    if (v.phone && !/^[+0-9 ()-]{6,40}$/.test(v.phone)) e.phone = 'Please enter a valid phone number.';
    if (corporate && !v.companyName?.trim()) e.companyName = 'Please tell us your company name.';
    if (needsQty && !v.quantity) e.quantity = 'Roughly how many pieces?';
    if (v.quantity && (Number(v.quantity) < 1 || !Number.isInteger(Number(v.quantity)))) e.quantity = 'Please enter a whole number.';
    if (v.eventDate && new Date(v.eventDate) < new Date(new Date().toDateString())) e.eventDate = 'Please choose a future date.';
    if (contact && !v.message?.trim()) e.message = 'Please write a short message.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setState({ busy: true, done: null, error: '' });
    try {
      const body = { ...v, type, quantity: v.quantity ? Number(v.quantity) : null, eventDate: v.eventDate || null, captchaToken: captcha };
      const r = await api('/api/enquiries', { method: 'POST', body });
      setState({ busy: false, done: r.message, error: '' });
      setV({ website: '' });
    } catch (err) {
      setState({ busy: false, done: null, error: err.message });
      if (err.fields) setErrors(err.fields);
    } finally {
      setCaptchaReset((n) => n + 1);
    }
  };

  if (state.done) {
    return (
      <div className="flex flex-col items-center border border-espresso/10 bg-linen/50 px-6 py-16 text-center">
        <Ornament />
        <h3 className="display-md mt-6">Thank you.</h3>
        <p className="lede mt-3 max-w-md">{state.done}</p>
        <button className="link-underline mt-8" onClick={() => setState({ busy: false, done: null, error: '' })}>Send another enquiry</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-7 sm:grid-cols-2">
      <Field label="Full name *" error={errors.fullName}><input autoComplete="name" className="field" value={v.fullName || ''} onChange={set('fullName')} /></Field>
      <Field label="Email address *" error={errors.email}><input type="email" autoComplete="email" className="field" value={v.email || ''} onChange={set('email')} /></Field>
      <Field label="Phone number" error={errors.phone}><input type="tel" autoComplete="tel" className="field" value={v.phone || ''} onChange={set('phone')} /></Field>
      {corporate
        ? <Field label="Company name *" error={errors.companyName}><input autoComplete="organization" className="field" value={v.companyName || ''} onChange={set('companyName')} /></Field>
        : contact
          ? <Field label="Type of enquiry"><select className="field" value={v.enquiryTopic || ''} onChange={set('enquiryTopic')}><option value="">Select…</option>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></Field>
          : <Field label="Company (optional)"><input className="field" value={v.companyName || ''} onChange={set('companyName')} /></Field>}
      <Field label="Type of event"><select className="field" value={v.eventType || ''} onChange={set('eventType')}><option value="">Select…</option>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Event date" error={errors.eventDate}><input type="date" className="field" value={v.eventDate || ''} onChange={set('eventDate')} /></Field>
      <Field label={`${contact ? 'Number of items required' : 'Quantity required'}${needsQty ? ' *' : ''}`} error={errors.quantity}>
        <input type="number" min="1" inputMode="numeric" className="field" placeholder={needsQty ? 'e.g. 120' : ''} value={v.quantity || ''} onChange={set('quantity')} />
      </Field>
      <Field label="Budget range"><select className="field" value={v.budgetRange || ''} onChange={set('budgetRange')}><option value="">Select…</option>{BUDGETS.map((t) => <option key={t}>{t}</option>)}</select></Field>
      {!contact && (
        <>
          <Field label="Product requirements" className="sm:col-span-2"><textarea rows={2} className="field resize-none" placeholder="Which pieces interest you? Any colours or materials?" value={v.productRequirements || ''} onChange={set('productRequirements')} maxLength={1000} /></Field>
          <Field label="Personalisation requirements" className="sm:col-span-2"><textarea rows={2} className="field resize-none" placeholder="Names, logo, event details, packaging…" value={v.personalisationRequirements || ''} onChange={set('personalisationRequirements')} maxLength={1000} /></Field>
        </>
      )}
      <Field label={contact ? 'Message *' : 'Additional message'} error={errors.message} className="sm:col-span-2">
        <textarea rows={4} className="field resize-none" value={v.message || ''} onChange={set('message')} maxLength={3000} />
      </Field>
      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={v.website} onChange={set('website')} className="hidden" aria-hidden="true" />
      <div className="sm:col-span-2"><Captcha onToken={setCaptcha} resetKey={captchaReset} /></div>
      {state.error && <div className="sm:col-span-2"><Notice tone="error">{state.error}</Notice></div>}
      <div className="sm:col-span-2">
        <button className="btn-dark w-full sm:w-auto sm:min-w-[240px]" disabled={state.busy}>{state.busy ? <Spinner /> : submitLabel}</button>
        <p className="mt-3 text-xs text-espresso-muted">We reply within two working days. Your details are used only to respond to this enquiry.</p>
      </div>
    </form>
  );
}
