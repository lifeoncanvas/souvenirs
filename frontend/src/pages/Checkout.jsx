import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, MapPin, Truck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, ApiError } from '../lib/api';
import { money } from '../lib/format';
import { loadPayPal, paymentConfig } from '../lib/payments';
import Captcha, { captchaEnabled } from '../components/Captcha';
import { PersonalisationList } from '../components/CartDrawer';
import { CouponBox, Totals } from './Cart';
import { EmptyState, Field, Img, Notice, PageLoader, Seo, Spinner } from '../components/ui';

const SHIPPING = [
  ['STANDARD', 'Standard delivery', '3–5 working days after production'],
];

function getDeliveryEstimate(address) {
  const country = (address?.country || '').toLowerCase().trim();
  const isUK = !country || ['uk', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'northern ireland'].includes(country);
  
  // Handcrafted production: 1–2 business days
  // Standard transit: 3–5 working days (domestic) or 6–10 working days (international)
  const minDays = isUK ? 4 : 7;
  const maxDays = isUK ? 7 : 12;

  function addBusinessDays(date, days) {
    const result = new Date(date);
    let count = 0;
    while (count < days) {
      result.setDate(result.getDate() + 1);
      const day = result.getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return result;
  }

  const now = new Date();
  const start = addBusinessDays(now, minDays);
  const end = addBusinessDays(now, maxDays);

  const opts = { weekday: 'short', day: 'numeric', month: 'short' };
  const range = `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`;
  const transitTime = isUK ? '3–5 working days' : '6–10 working days';
  const destination = [address?.city, address?.postalCode, address?.country].filter(Boolean).join(', ');

  return { range, transitTime, destination };
}
const PAYPAL = ['PAYPAL', 'PayPal', 'Pay now with your PayPal account, or by card through PayPal. Your order is confirmed straight away.'];
const MANUAL_PAYMENT = [
  ['PAY_ON_CONFIRMATION', 'Pay after proof approval', 'We email a proof and a secure payment link. Ideal for personalised orders.'],
  ['BANK_TRANSFER', 'Bank transfer', 'Transfer using your order number as reference. Details are emailed to you.'],
];
const EMPTY_ADDR = { fullName: '', phone: '', line1: '', line2: '', city: '', region: '', postalCode: '', country: '' };

export default function Checkout() {
  const { cart, setCart, user, refreshCart } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState({ email: '', customerName: '', phone: '' });
  const [address, setAddress] = useState(EMPTY_ADDR);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [saveAddress, setSaveAddress] = useState(true);
  const [shippingMethod, setShippingMethod] = useState('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState('PAY_ON_CONFIRMATION');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const [config, setConfig] = useState(null);
  const [captcha, setCaptcha] = useState(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  useEffect(() => { paymentConfig().then(setConfig); }, []);
  const PAYMENT = [PAYPAL, ...MANUAL_PAYMENT];
  const estimate = getDeliveryEstimate(address);

  useEffect(() => {
    if (user) {
      setCustomer((c) => ({ email: c.email || user.email, customerName: c.customerName || [user.firstName, user.lastName].filter(Boolean).join(' '), phone: c.phone || user.phone || '' }));
      api('/api/account/addresses').then((list) => {
        setSavedAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) setAddress({ ...EMPTY_ADDR, ...def });
      }).catch(() => { });
    }
  }, [user]);

  useEffect(() => {
    api(`/api/cart?shippingMethod=${shippingMethod}`).then(setCart).catch(() => { });
  }, [shippingMethod, setCart]);

  if (!cart) return <PageLoader />;
  if (cart.items.length === 0) {
    return <EmptyState title="Your bag is empty." text="Add a piece or two before checking out." action={<Link to="/shop" className="btn-dark">Explore the collection</Link>} />;
  }

  const validateStep1 = () => {
    const e = {};
    if (!/^\S+@\S+\.\S+$/.test(customer.email)) e.email = 'Please enter a valid email address.';
    if (!customer.customerName.trim()) e.customerName = 'Please enter your name.';
    if (customer.phone && !/^[+0-9 ()-]{6,40}$/.test(customer.phone)) e.phone = 'Please enter a valid phone number.';
    ['fullName', 'line1', 'city', 'postalCode', 'country'].forEach((k) => { if (!address[k]?.trim()) e[`a.${k}`] = 'Required'; });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const checkoutBody = () => ({
    ...customer, shippingAddress: { ...address, id: null, isDefault: false }, shippingMethod, paymentMethod, notes,
    saveAddress: !!user && saveAddress, captchaToken: captcha,
  });

  const finish = async (res) => {
    sessionStorage.setItem(`licht.order.${res.order.orderNumber}`, JSON.stringify(res));
    await refreshCart();
    navigate(`/order/${res.order.orderNumber}`, { replace: true });
  };

  const placeOrder = async () => {
    if (captchaEnabled && !captcha) { setSubmitError('Please complete the security check.'); return; }
    setBusy(true); setSubmitError('');
    try {
      await finish(await api('/api/checkout', { method: 'POST', body: checkoutBody() }));
    } catch (e) {
      setSubmitError(e.message);
      if (e.fields) setErrors(e.fields);
      setCaptchaReset((n) => n + 1);
    } finally { setBusy(false); }
  };

  const steps = ['Details & delivery', 'Shipping & payment', 'Review & confirm'];

  return (
    <>
      <Seo title="Checkout" noindex />
      <div className="container-site py-12 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="display-lg">Checkout</h1>
          <p className="flex items-center gap-2 text-xs text-espresso-muted"><Lock size={13} /> Secure checkout — card details are never stored by us</p>
        </div>
        <ol className="mt-8 grid grid-cols-3 gap-2 text-[10.5px] uppercase tracking-wide2">
          {steps.map((s, i) => (
            <li key={s} className={`border-t-2 pt-3 ${i + 1 <= step ? 'border-espresso text-espresso' : 'border-espresso/15 text-espresso-muted'}`}>
              <span className="hidden sm:inline">0{i + 1} — </span>{s}
            </li>
          ))}
        </ol>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px]">
          <div>
            {step === 1 && (
              <div className="space-y-10">
                {!user && <Notice>Have an account? <Link to="/login?next=/checkout" className="underline underline-offset-4">Sign in</Link> for saved addresses and order history — or continue as a guest.</Notice>}
                <section>
                  <h2 className="font-display text-2xl">1. Customer information</h2>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <Field label="Email" error={errors.email}><input type="email" autoComplete="email" className="field" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} /></Field>
                    <Field label="Full name" error={errors.customerName}><input autoComplete="name" className="field" value={customer.customerName} onChange={(e) => setCustomer({ ...customer, customerName: e.target.value })} /></Field>
                    <Field label="Phone (optional)" error={errors.phone}><input type="tel" autoComplete="tel" className="field" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} /></Field>
                  </div>
                </section>
                <section>
                  <h2 className="font-display text-2xl">2. Delivery address</h2>
                  {savedAddresses.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {savedAddresses.map((a) => (
                        <button key={a.id} type="button" onClick={() => setAddress({ ...EMPTY_ADDR, ...a })}
                          className={`border px-4 py-2 text-left text-xs ${address.id === a.id ? 'border-espresso' : 'border-espresso/15'}`}>
                          <strong className="block font-medium">{a.label || a.fullName}</strong>{a.line1}, {a.city}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    {[['fullName', 'Recipient name', 'name'], ['phone', 'Recipient phone (optional)', 'tel'], ['line1', 'Address line 1', 'address-line1'], ['line2', 'Address line 2 (optional)', 'address-line2'], ['city', 'Town / City', 'address-level2'], ['region', 'County / State (optional)', 'address-level1'], ['postalCode', 'Postcode', 'postal-code'], ['country', 'Country', 'country-name']].map(([k, label, ac]) => (
                      <Field key={k} label={label} error={errors[`a.${k}`] || errors[`shippingAddress.${k}`]}>
                        <input autoComplete={ac} className="field" value={address[k] || ''} onChange={(e) => setAddress({ ...address, [k]: e.target.value, id: undefined })} />
                      </Field>
                    ))}
                  </div>
                  {user && (
                    <label className="mt-6 flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="h-4 w-4 rounded-none border-espresso/30 text-espresso" />
                      Save this address to my account
                    </label>
                  )}
                </section>
                <button className="btn-dark w-full sm:w-auto" onClick={() => validateStep1() && setStep(2)}>Continue to shipping</button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-10">
                <section>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-2xl">3. Shipping method</h2>
                    {estimate.destination && (
                      <span className="flex items-center gap-1.5 text-xs text-espresso-muted">
                        <MapPin size={13} className="text-gold-deep" />
                        Delivering to <strong className="font-medium text-espresso">{estimate.destination}</strong>
                      </span>
                    )}
                  </div>
                  <div className="mt-6">
                    <div className="border border-espresso bg-linen/60 p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <input
                            type="radio"
                            name="ship"
                            value="STANDARD"
                            checked={shippingMethod === 'STANDARD'}
                            onChange={() => setShippingMethod('STANDARD')}
                            className="mt-1 text-espresso"
                          />
                          <div>
                            <span className="block text-sm font-medium">Standard delivery</span>
                            <p className="mt-1 text-xs text-espresso-muted">
                              Hand-finished and securely packaged. Dispatched from our studio within 1–2 working days.
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium">
                          {Number(cart?.shippingFee) === 0 ? 'Free' : money(cart?.shippingFee || 0)}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col gap-2 rounded border border-espresso/10 bg-ivory/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Truck size={15} className="text-gold-deep shrink-0" />
                          <span>
                            Estimated arrival: <strong className="font-medium text-gold-deep">{estimate.range}</strong>
                          </span>
                        </div>
                        <span className="text-espresso-muted">
                          Approx. {estimate.transitTime} via tracked courier
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
                <section>
                  <h2 className="font-display text-2xl">4. Payment method</h2>
                  <div className="mt-6 space-y-3">
                    {PAYMENT.map(([v, label, hint]) => (
                      <label key={v} className={`flex cursor-pointer items-start gap-4 border p-5 transition ${paymentMethod === v ? 'border-espresso bg-linen/60' : 'border-espresso/15'}`}>
                        <input type="radio" name="pay" value={v} checked={paymentMethod === v} onChange={() => setPaymentMethod(v)} className="mt-1 text-espresso" />
                        <span><span className="block text-sm font-medium">{label}</span><span className="text-xs text-espresso-muted">{hint}</span></span>
                      </label>
                    ))}
                  </div>
                </section>
                <Field label="Order notes (optional)">
                  <textarea className="field resize-none" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, gift notes, deadlines…" />
                </Field>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="btn-outline" onClick={() => setStep(1)}>Back</button>
                  <button className="btn-dark" onClick={() => setStep(3)}>Review order</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8">
                <h2 className="font-display text-2xl">5. Review & confirm</h2>
                <dl className="grid gap-6 border border-espresso/10 bg-linen/40 p-6 text-sm sm:grid-cols-2">
                  <div><dt className="label">Contact</dt><dd>{customer.customerName}<br />{customer.email}<br />{customer.phone}</dd></div>
                  <div><dt className="label">Deliver to</dt><dd>{address.fullName}<br />{address.line1}{address.line2 && <>, {address.line2}</>}<br />{address.city} {address.postalCode}<br />{address.country}</dd></div>
                  <div><dt className="label">Shipping</dt><dd>Standard delivery ({estimate.range})</dd></div>
                  <div><dt className="label">Payment</dt><dd>{PAYMENT.find(([v]) => v === paymentMethod)[1]}</dd></div>
                </dl>
                <p className="text-xs text-espresso-muted">By placing your order you agree to our <Link to="/policies/terms" className="underline">terms</Link> and <Link to="/policies/returns" className="underline">returns policy</Link>. Personalised pieces are made to order.</p>
                <Captcha onToken={setCaptcha} resetKey={captchaReset} />
                {submitError && <Notice tone="error">{submitError}</Notice>}
                {paymentMethod === 'PAYPAL' && config?.paypalEnabled ? (
                  <div className="space-y-4">
                    <PayPalCheckout
                      config={config}
                      buildBody={checkoutBody}
                      captchaToken={captcha}
                      onStart={() => setSubmitError('')}
                      onOrderCreated={() => setCaptchaReset((n) => n + 1)}
                      onPaid={finish}
                      onProblem={(message) => { setSubmitError(message); setCaptchaReset((n) => n + 1); }}
                    />
                    <button className="btn-outline" onClick={() => setStep(2)}>Back</button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button className="btn-outline" onClick={() => setStep(2)} disabled={busy}>Back</button>
                    <button className="btn-dark sm:min-w-[260px]" onClick={placeOrder} disabled={busy}>{busy ? <Spinner /> : `Place order · ${money(cart.total)}`}</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="h-fit space-y-6 bg-champagne/50 p-6 sm:p-8 lg:sticky lg:top-36">
            <h2 className="font-display text-2xl">Order summary</h2>
            <ul className="max-h-[340px] space-y-4 overflow-y-auto pr-1">
              {cart.items.map((i) => (
                <li key={i.id} className="flex gap-4">
                  <div className="relative shrink-0">
                    <Img src={i.imageUrl} alt={i.name} className="h-20 w-16" />
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-espresso px-1 text-[10px] text-ivory">{i.quantity}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-sm"><span className="font-display text-base">{i.name}</span><span className="tabular-nums">{money(i.lineTotal)}</span></div>
                    <PersonalisationList data={i.personalisation} />
                  </div>
                </li>
              ))}
            </ul>
            <CouponBox />
            <Totals cart={cart} shippingLabel={SHIPPING.find(([v]) => v === shippingMethod)[1].toLowerCase()} />
          </aside>
        </div>
      </div>
    </>
  );
}

/**
 * PayPal Smart Buttons. Creating the PayPal order also creates ours (stock is reserved); on approval
 * the server captures the payment and confirms the order. Cancelling releases the reservation, and
 * the bag is only emptied once payment has been captured.
 */
function PayPalCheckout({ config, buildBody, captchaToken, onStart, onOrderCreated, onPaid, onProblem }) {
  const box = useRef(null);
  const latest = useRef({});
  latest.current = { buildBody, captchaToken, onStart, onOrderCreated, onPaid, onProblem };
  const [state, setState] = useState('loading');

  useEffect(() => {
    let buttons;
    let cancelled = false;
    const pending = { orderNumber: null, paypalOrderId: null };
    const release = () => {
      if (!pending.orderNumber) return;
      api('/api/payments/paypal/cancel', { method: 'POST', body: { ...pending } }).catch(() => { });
      pending.orderNumber = null;
    };
    loadPayPal(config.paypalClientId, config.currency).then((paypal) => {
      if (cancelled || !box.current) return undefined;
      buttons = paypal.Buttons({
        style: { layout: 'vertical', color: 'black', shape: 'rect', label: 'pay', height: 48 },
        onClick: (_data, actions) => {
          if (captchaEnabled && !latest.current.captchaToken) {
            latest.current.onProblem('Please complete the security check first.');
            return actions.reject();
          }
          latest.current.onStart();
          return actions.resolve();
        },
        createOrder: async () => {
          const res = await api('/api/checkout', { method: 'POST', body: latest.current.buildBody() });
          pending.orderNumber = res.order.orderNumber;
          pending.paypalOrderId = res.paypalOrderId;
          latest.current.onOrderCreated();
          return res.paypalOrderId;
        },
        onApprove: async (data, actions) => {
          try {
            const res = await api('/api/payments/paypal/capture', {
              method: 'POST', body: { orderNumber: pending.orderNumber, paypalOrderId: data.orderID },
            });
            pending.orderNumber = null;
            await latest.current.onPaid(res);
          } catch (e) {
            if (e.code === 'INSTRUMENT_DECLINED') return actions.restart();
            latest.current.onProblem(e.message);
          }
          return undefined;
        },
        onCancel: () => {
          release();
          latest.current.onProblem('PayPal checkout was cancelled. Your bag is just as you left it.');
        },
        onError: (err) => {
          release();
          // Our own API errors (stock, validation) explain themselves; PayPal's internal ones do not.
          latest.current.onProblem(err instanceof ApiError
            ? err.message
            : 'PayPal could not complete the payment. You have not been charged; please try again.');
        },
      });
      return buttons.render(box.current).then(() => { if (!cancelled) setState('ready'); });
    }).catch(() => { if (!cancelled) setState('failed'); });
    return () => {
      cancelled = true;
      if (buttons?.close) buttons.close().catch(() => { });
    };
  }, [config.paypalClientId, config.currency]);

  return (
    <div>
      {state === 'loading' && <div className="flex h-12 items-center justify-center"><Spinner /></div>}
      {state === 'failed' && <Notice tone="error">PayPal could not be loaded. Check your connection, or go back and choose another payment method.</Notice>}
      <div ref={box} className={state === 'ready' ? 'max-w-md' : 'hidden'} />
    </div>
  );
}
