import { Link } from 'react-router-dom';
import { Ornament, Seo } from '../components/ui';

export default function NotFound() {
  return (
    <>
      <Seo title="Page not found" noindex />
      <div className="container-site flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <Ornament />
        <p className="mt-8 font-display text-8xl font-light text-gold/60">404</p>
        <h1 className="display-md mt-4">This page has slipped away.</h1>
        <p className="lede mt-4 max-w-md">The page you were looking for may have moved. Let us guide you back.</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link to="/" className="btn-dark">Return home</Link>
          <Link to="/shop" className="btn-outline">Explore the shop</Link>
        </div>
      </div>
    </>
  );
}
