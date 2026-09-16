/* Applicatiestatus: sessieprofiel, winkelmandje en eenvoudige pub/sub. */
import { api } from './api.js';

const CART_KEY = 'gng.cart.v2';
const DISPLAY_KEY = 'gng.display.v2';

const listeners = new Set();
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn(state));

export const state = {
  profile: null,      // { user, company, customer, display } of null
  cart: [],           // [{ productId, qty }]
  settings: null,
  pendingDisplayCode: null,
  ready: false,
};

const readCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
const writeCart = () => localStorage.setItem(CART_KEY, JSON.stringify(state.cart));

export async function initStore() {
  state.cart = readCart();
  state.pendingDisplayCode = localStorage.getItem(DISPLAY_KEY) || null;
  state.settings = await api.settings();
  state.profile = await api.me();
  state.ready = true;
  emit();
  return state;
}

export async function refreshProfile() { state.profile = await api.me(); emit(); return state.profile; }
export const isLoggedIn = () => !!state.profile;

export function setPendingDisplay(code) {
  state.pendingDisplayCode = code ? String(code).toUpperCase() : null;
  state.pendingDisplayCode ? localStorage.setItem(DISPLAY_KEY, state.pendingDisplayCode) : localStorage.removeItem(DISPLAY_KEY);
  emit();
}

/* ---- winkelmand ---- */
export const cartCount = () => state.cart.reduce((s, l) => s + l.qty, 0);

export function addToCart(productId, qty = 1) {
  const line = state.cart.find((l) => l.productId === productId);
  if (line) line.qty = Math.min(999, line.qty + qty);
  else state.cart.push({ productId, qty: Math.min(999, Math.max(1, qty)) });
  writeCart(); emit();
}
export function setQty(productId, qty) {
  const q = Math.max(0, Math.min(999, Math.round(qty || 0)));
  if (q === 0) return removeFromCart(productId);
  const line = state.cart.find((l) => l.productId === productId);
  if (line) line.qty = q;
  writeCart(); emit();
}
export function removeFromCart(productId) {
  state.cart = state.cart.filter((l) => l.productId !== productId);
  writeCart(); emit();
}
export function clearCart() { state.cart = []; writeCart(); emit(); }

/* Winkelmand met actuele productgegevens en totalen (prijzen komen uit de API). */
export async function cartDetails() {
  const lines = [];
  for (const l of state.cart) {
    try {
      const p = await api.product(l.productId);
      if (!p.active) continue;
      lines.push({ ...l, product: p, lineTotalExVat: Math.round(p.purchasePriceExVat * l.qty * 100) / 100 });
    } catch { /* product bestaat niet meer: stil overslaan, regel wordt opgeruimd */ }
  }
  const known = new Set(lines.map((l) => l.productId));
  if (known.size !== state.cart.length) { state.cart = state.cart.filter((l) => known.has(l.productId)); writeCart(); }

  const s = state.settings || {};
  const subtotalExVat = Math.round(lines.reduce((t, l) => t + l.lineTotalExVat, 0) * 100) / 100;
  const shippingExVat = s.shippingCostExVat ?? 0;
  const vatRate = s.vatRate ?? 0.21;
  const vatAmount = Math.round((subtotalExVat + shippingExVat) * vatRate * 100) / 100;
  return {
    lines, subtotalExVat, shippingExVat, vatRate, vatAmount,
    totalIncVat: Math.round((subtotalExVat + shippingExVat + vatAmount) * 100) / 100,
    shippingUnknown: s.shippingCostExVat === null || s.shippingCostExVat === undefined,
  };
}

/* Opnieuw bestellen: zet alle regels van een eerdere order in het mandje. */
export async function reorder(order) {
  for (const item of order.items) {
    try { const p = await api.product(item.productId); if (p.active) addToCart(p.id, item.qty); } catch { /* overslaan */ }
  }
  return cartCount();
}
