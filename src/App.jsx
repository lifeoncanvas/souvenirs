import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import { PageLoader } from './components/ui';
import { useApp } from './context/AppContext';
import { trackPage } from './lib/analytics';
import Home from './pages/Home';

const Shop = lazy(() => import('./pages/Shop'));
const Product = lazy(() => import('./pages/Product'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const About = lazy(() => import('./pages/About'));
const Occasions = lazy(() => import('./pages/Occasions'));
const Personalised = lazy(() => import('./pages/Personalised'));
const Corporate = lazy(() => import('./pages/Corporate'));
const GiftBoxes = lazy(() => import('./pages/GiftBoxes'));
const BulkOrders = lazy(() => import('./pages/BulkOrders'));
const Contact = lazy(() => import('./pages/Contact'));
const Faq = lazy(() => import('./pages/Faq'));
const Policy = lazy(() => import('./pages/Policy'));
const Auth = lazy(() => import('./pages/Auth'));
const Account = lazy(() => import('./pages/account/Account'));
const Admin = lazy(() => import('./pages/admin/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div key={toast.id} role="status" aria-live="polite"
      className={`fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2.5rem)] max-w-sm -translate-x-1/2 animate-fadeUp px-5 py-4 text-sm shadow-xl ${toast.tone === 'error' ? 'bg-red-950 text-red-50' : 'bg-espresso text-ivory'}`}>
      {toast.message}
    </div>
  );
}

export default function App() {
  const { pathname, hash } = useLocation();
  const isAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 60); return; }
    }
    window.scrollTo(0, 0);
    trackPage(pathname);
  }, [pathname, hash]);

  if (isAdmin) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes><Route path="/admin/*" element={<Admin />} /></Routes>
        <Toast />
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-ivory focus:px-4 focus:py-2">Skip to content</a>
      <Header />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:category" element={<Shop />} />
            <Route path="/product/:slug" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order/:orderNumber" element={<OrderConfirmation />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/about" element={<About />} />
            <Route path="/occasions" element={<Occasions />} />
            <Route path="/personalised" element={<Personalised />} />
            <Route path="/corporate" element={<Corporate />} />
            <Route path="/gift-boxes" element={<GiftBoxes />} />
            <Route path="/bulk-orders" element={<BulkOrders />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/policies/:slug" element={<Policy />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/register" element={<Auth mode="register" />} />
            <Route path="/forgot-password" element={<Auth mode="forgot" />} />
            <Route path="/reset-password" element={<Auth mode="reset" />} />
            <Route path="/verify-email" element={<Auth mode="verify" />} />
            <Route path="/account/*" element={<Account />} />
            <Route path="/wishlist" element={<Navigate to="/account/wishlist" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <Toast />
    </div>
  );
}
