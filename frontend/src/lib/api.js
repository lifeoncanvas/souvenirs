// Thin fetch wrapper: attaches the JWT and guest cart token, and normalises errors.
const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'licht.token';
const CART_KEY = 'licht.cart';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

export const tokens = {
  auth: () => store.get(TOKEN_KEY),
  setAuth: (t) => store.set(TOKEN_KEY, t),
  cart: () => store.get(CART_KEY),
  setCart: (t) => store.set(CART_KEY, t),
};

export class ApiError extends Error {
  constructor(message, status, fields, code) {
    super(message);
    this.status = status;
    this.fields = fields || {};
    this.code = code || null;
  }
}

export async function api(path, { method = 'GET', body, form, signal } = {}) {
  const headers = {};
  const auth = tokens.auth();
  if (auth) headers.Authorization = `Bearer ${auth}`;
  const cart = tokens.cart();
  if (cart) headers['X-Cart-Token'] = cart;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(BASE + path, {
      method, headers, signal,
      body: form ? form : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError('We could not reach the server. Please check your connection and try again.', 0);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!res.ok) {
    if (res.status === 401 && auth) tokens.setAuth(null);
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', res.status, data?.fields, data?.code);
  }
  return data;
}

export const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : '';
};
