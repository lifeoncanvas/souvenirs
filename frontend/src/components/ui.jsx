import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SITE = 'LICHT Signature Souvenirs';

/** Per-page title, description, canonical and Open Graph tags, plus optional JSON-LD. */
export function Seo({ title, description, image, type = 'website', jsonLd, noindex }) {
  const { pathname } = useLocation();
  const full = title ? `${title} — ${SITE}` : `${SITE} — Memorable Moments. Beautifully Preserved.`;
  const origin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://lichtsignaturesouvenirs.store';
  const url = typeof window !== 'undefined' ? `${window.location.origin}${pathname}` : `${origin}${pathname}`;
  const fullImage = image
    ? (image.startsWith('http') ? image : `${origin}${image.startsWith('/') ? '' : '/'}${image}`)
    : `${origin}/logo.png`;

  return (
    <Helmet>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={fullImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={fullImage} />
      {noindex && <meta name="robots" content="noindex" />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}

/** Lazy image with a soft fade-in and a warm placeholder tone. */
export function Img({ src, alt = '', className = '', imgClassName = '', eager = false, sizes }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-champagne ${className}`}>
      {src && (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      )}
    </div>
  );
}

/** Adds the `in` class once the element scrolls into view. */
export function Reveal({ as: Tag = 'div', className = '', delay = 0, children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) { el.classList.add('in'); return undefined; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>{children}</Tag>;
}

export function SectionHeading({ eyebrow, title, text, align = 'center', className = '' }) {
  const a = align === 'center' ? 'mx-auto text-center items-center' : 'items-start';
  return (
    <Reveal className={`flex max-w-2xl flex-col gap-4 ${a} ${className}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2 className="display-lg text-balance">{title}</h2>
      {text && <p className="lede max-w-xl">{text}</p>}
    </Reveal>
  );
}

/** Thin gold ornament: line — diamond — line. */
export function Ornament({ className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold ${className}`} aria-hidden="true">
      <span className="h-px w-10 bg-gold/60" />
      <span className="h-1.5 w-1.5 rotate-45 border border-gold" />
      <span className="h-px w-10 bg-gold/60" />
    </div>
  );
}

export function Spinner({ className = '' }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border border-current border-t-transparent ${className}`} aria-label="Loading" />;
}

export function PageLoader() {
  return <div className="flex min-h-[50vh] items-center justify-center text-gold-deep"><Spinner className="h-6 w-6" /></div>;
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <p className="display-md">Something didn't arrive.</p>
      <p className="lede">{message}</p>
      {onRetry && <button className="btn-outline" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <Ornament />
      <p className="display-md">{title}</p>
      {text && <p className="lede">{text}</p>}
      {action}
    </div>
  );
}

export function Field({ label, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {label && <span className="label">{label}</span>}
      {children}
      {error && <span className="mt-1 block text-xs text-red-800">{error}</span>}
    </label>
  );
}

export function Notice({ tone = 'default', children }) {
  const tones = {
    default: 'border-gold/40 bg-champagne/60 text-espresso',
    success: 'border-emerald-900/20 bg-emerald-50 text-emerald-900',
    error: 'border-red-900/20 bg-red-50 text-red-900',
  };
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`border px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export function Stars({ value = 5, className = '' }) {
  return (
    <span className={`inline-flex gap-0.5 text-gold ${className}`} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= Math.round(value) ? '' : 'opacity-25'}>★</span>)}
    </span>
  );
}
