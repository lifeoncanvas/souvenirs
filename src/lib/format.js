let currency = 'GBP';
let locale = 'en-GB';

export function configureStore(store) {
  if (store?.currency) currency = store.currency;
  if (store?.locale) locale = store.locale;
}

export function money(value) {
  const n = Number(value ?? 0);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

export function date(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

export const titleCase = (s) => (s || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const PERSONALISATION_LABELS = {
  name: 'Name', initials: 'Initials', date: 'Date', message: 'Message',
  logoUrl: 'Logo', eventDetails: 'Event details', instructions: 'Special instructions',
};
