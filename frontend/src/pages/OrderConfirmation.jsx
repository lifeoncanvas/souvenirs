import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { money, titleCase } from '../lib/format';
import { PersonalisationList } from '../components/CartDrawer';
import { Img, Ornament, PageLoader, Seo } from '../components/ui';

export function OrderSummary({ order }) {
  const a = order.shippingAddress;
  return (
    <div className="border border-espresso/10 bg-linen/40">
      <div className="flex flex-wrap justify-between gap-4 border-b border-espresso/10 p-6 text-sm">
        <div><span className="label">Order</span>{order.orderNumber}</div>
        <div><span className="label">Status</span>{titleCase(order.status)}</div>
        <div><span className="label">Payment</span>{titleCase(order.paymentStatus)}</div>
        <div><span className="label">Delivery</span>{titleCase(order.shippingMethod)}</div>
      </div>
      <ul className="divide-y divide-espresso/10 px-6">
        {order.items.map((i, n) => (
          <li key={n} className="flex gap-4 py-5">
            <Img src={i.imageUrl} alt={i.productName} className="h-20 w-16 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between gap-3"><span className="font-display text-lg">{i.productName}</span><span className="tabular-nums">{money(i.lineTotal)}</span></div>
              <p className="text-xs text-espresso-muted">{i.quantity} × {money(i.unitPrice)}</p>
              <PersonalisationList data={i.personalisation} />
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-6 border-t border-espresso/10 p-6 text-sm sm:grid-cols-2">
        <div>
          <span className="label">Delivering to</span>
          <p>{a.fullName}<br />{a.line1}{a.line2 && <>, {a.line2}</>}<br />{a.city} {a.postalCode}<br />{a.country}</p>
          {order.trackingNumber && <p className="mt-3"><span className="label">Tracking</span>{order.carrier} {order.trackingNumber}</p>}
        </div>
        <dl className="space-y-1.5">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          {Number(order.discount) > 0 && <div className="flex justify-between text-gold-deep"><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>−{money(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{money(order.shippingFee)}</dd></div>
          <div className="flex justify-between border-t border-espresso/10 pt-2 font-display text-xl"><dt>Total</dt><dd>{money(order.total)}</dd></div>
        </dl>
      </div>
    </div>
  );
}

export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const { user } = useApp();
  const [data, setData] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(`licht.order.${orderNumber}`)); } catch { return null; }
  });
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (data || !user) { if (!data) setMissing(true); return; }
    api(`/api/account/orders/${orderNumber}`).then((order) => setData({ order })).catch(() => setMissing(true));
  }, [orderNumber, user, data]);

  if (missing && !data) {
    return (
      <div className="container-site max-w-xl py-24 text-center">
        <h1 className="display-md">Looking for an order?</h1>
        <p className="lede mt-4">Track any order with its number and the email used at checkout.</p>
        <Link to="/track-order" className="btn-dark mt-8">Track an order</Link>
      </div>
    );
  }
  if (!data) return <PageLoader />;

  return (
    <>
      <Seo title="Thank you" noindex />
      <div className="container-site max-w-3xl py-16 lg:py-24">
        <div className="text-center">
          <Ornament />
          <p className="eyebrow mt-6">Order received</p>
          <h1 className="display-lg mt-4">Thank you, {data.order.customerName.split(' ')[0]}.</h1>
          <p className="lede mx-auto mt-4 max-w-lg">Your order <strong className="font-medium">{data.order.orderNumber}</strong> is with our studio. A confirmation is on its way to {data.order.email}.</p>
        </div>
        {data.paymentInstructions && <div className="mt-10 border-l-2 border-gold bg-champagne/50 p-6 text-sm leading-relaxed"><span className="label">Next steps</span>{data.paymentInstructions}</div>}
        <div className="mt-10"><OrderSummary order={data.order} /></div>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/shop" className="btn-outline">Continue shopping</Link>
          {user ? <Link to="/account/orders" className="btn-dark">View my orders</Link> : <Link to="/track-order" className="btn-dark">Track this order</Link>}
        </div>
      </div>
    </>
  );
}
