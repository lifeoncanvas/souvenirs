import { useEffect, useRef, useState } from 'react';
import { loadTurnstile } from '../lib/payments';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

/** True when forms must send a Turnstile token (the server must also have TURNSTILE_SECRET_KEY). */
export const captchaEnabled = Boolean(SITE_KEY);

/**
 * Cloudflare Turnstile widget. Renders nothing unless VITE_TURNSTILE_SITE_KEY is set.
 * Calls onToken with each fresh token (or null when it expires). Tokens are single-use:
 * change `resetKey` after every submit to get a new one.
 */
export default function Captcha({ onToken, resetKey = 0 }) {
  const box = useRef(null);
  const widget = useRef(null);
  const tokenCb = useRef(onToken);
  const [error, setError] = useState('');
  tokenCb.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let cancelled = false;
    loadTurnstile().then((ts) => {
      if (cancelled || !box.current) return;
      widget.current = ts.render(box.current, {
        sitekey: SITE_KEY,
        theme: 'light',
        callback: (t) => tokenCb.current?.(t),
        'expired-callback': () => tokenCb.current?.(null),
        'error-callback': () => { tokenCb.current?.(null); setError('The security check could not run. Please refresh the page.'); },
      });
    }).catch((e) => setError(e.message));
    return () => {
      cancelled = true;
      if (widget.current != null && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey && widget.current != null && window.turnstile) {
      tokenCb.current?.(null);
      window.turnstile.reset(widget.current);
    }
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return (
    <div>
      <div ref={box} className="min-h-[65px]" />
      {error && <span className="mt-1 block text-xs text-red-800">{error}</span>}
    </div>
  );
}
