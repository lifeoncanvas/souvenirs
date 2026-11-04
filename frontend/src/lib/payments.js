// Payment options and third-party checkout scripts, loaded only when they are needed.
import { api } from './api';

let configPromise;

/** What the server offers ({ paypalEnabled, paypalClientId, currency, captchaEnabled }); fetched once. */
export function paymentConfig() {
  if (!configPromise) {
    configPromise = api('/api/payments/config').catch(() => {
      configPromise = undefined;
      return { paypalEnabled: false, paypalClientId: null, currency: 'GBP', captchaEnabled: false };
    });
  }
  return configPromise;
}

const scripts = {};

function loadScript(src) {
  if (!scripts[src]) {
    scripts[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => { delete scripts[src]; reject(new Error('Could not load ' + new URL(src).host)); };
      document.head.appendChild(s);
    });
  }
  return scripts[src];
}

/** Loads the PayPal JS SDK for the shop's currency and resolves with window.paypal. */
export async function loadPayPal(clientId, currency) {
  const q = new URLSearchParams({ 'client-id': clientId, currency, intent: 'capture', components: 'buttons' });
  await loadScript(`https://www.paypal.com/sdk/js?${q}`);
  if (!window.paypal) throw new Error('PayPal did not load');
  return window.paypal;
}

/** Loads Cloudflare Turnstile and resolves with window.turnstile. */
export async function loadTurnstile() {
  await loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
  if (!window.turnstile) throw new Error('The security check did not load');
  return window.turnstile;
}
