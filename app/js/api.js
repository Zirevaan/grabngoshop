/* ==========================================================================
   GRABNGO — API-laag
   De app praat uitsluitend via deze module met de gegevens. Er zijn twee
   adapters met exact dezelfde interface:

     LocalAdapter  — ingebouwde demo-backend (browseropslag). Bedoeld voor de
                     visuele review op een echte telefoon (fase 2/3 uit de brief).
     RestAdapter   — de echte backend/API. Zie docs/05-api.md voor de endpoints.

   Omschakelen gebeurt in js/config.js (backend: 'local' | 'rest'). Er staan
   géén prijzen of productgegevens hardcoded in de schermen.
   ========================================================================== */
import { CONFIG } from './config.js';

const DB_KEY = 'gng.db.v2';
const SESSION_KEY = 'gng.session.v2';

/* ---------------- helpers ---------------- */
const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const clone = (o) => JSON.parse(JSON.stringify(o));
const nowIso = () => new Date().toISOString();

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

export async function hashPassword(password, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64
    ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
  return { salt: saltB64 || b64(salt), hash: b64(bits) };
}

export class AppError extends Error {
  constructor(message, code = 'onbekend') { super(message); this.code = code; }
}

/* ==========================================================================
   LocalAdapter
   ========================================================================== */
class LocalAdapter {
  constructor() { this.db = null; }

  /* ---- opslag ---- */
  async _load() {
    if (this.db) return this.db;
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try { this.db = JSON.parse(raw); return this.db; } catch { /* val terug op seed */ }
    }
    this.db = await this._seed();
    this._save();
    return this.db;
  }
  _save() { localStorage.setItem(DB_KEY, JSON.stringify(this.db)); }

  async _seed() {
    const res = await fetch(CONFIG.catalogUrl, { cache: 'no-store' });
    if (!res.ok) throw new AppError('De productcatalogus kon niet worden geladen.', 'netwerk');
    const cat = await res.json();
    return {
      meta: { seededAt: nowIso(), catalogVersion: cat.version, source: cat.source },
      settings: {
        ...cat.settings,
        orderStatuses: ['nieuw', 'in_behandeling', 'verzonden', 'geleverd', 'geannuleerd'],
        reorderReminderDays: 60,
      },
      categories: cat.categories,
      products: cat.products,
      excludedProducts: cat.excludedProducts,
      displayInfo: cat.displayInfo,
      users: [], companies: [], customers: [], orders: [],
      displays: [
        { id: 'd_demo1', code: 'GNG-DEMO-01', name: 'Demo-display 01', locationId: 'l_demo1',
          customerId: null, assortment: null, active: true, createdAt: nowIso(),
          note: 'Voorbeelddisplay voor de visuele review. Echte displaycodes/locaties: NOG AAN TE LEVEREN.' },
      ],
      locations: [
        { id: 'l_demo1', name: 'Demo-locatie', street: null, postcode: null, city: null, country: 'Nederland', active: true },
      ],
      qrLinks: [
        { id: 'q_demo1', code: 'GNG-DEMO-01', displayId: 'd_demo1', target: 'home', scans: 0, active: true, createdAt: nowIso() },
      ],
      notifications: [],
      automationRules: [
        { id: 'a1', key: 'nieuwe_klant_welkomstmail', name: 'Nieuwe klant → welkomstmail', active: true,
          channel: 'email', description: 'Stuurt automatisch een welkomstmail na registratie en meldt de nieuwe klant in de admin.' },
        { id: 'a2', key: 'nieuwe_order_bevestiging', name: 'Nieuwe bestelling → orderbevestiging klant', active: true,
          channel: 'email', description: 'Stuurt de orderbevestiging naar de klant.' },
        { id: 'a3', key: 'nieuwe_order_intern', name: 'Nieuwe bestelling → interne melding', active: true,
          channel: 'email', description: 'Stuurt een interne melding naar Mobile Express B.V.' },
        { id: 'a4', key: 'herhaalbestelling_signaal', name: 'Klant bestelt lang niet → verkoopkans', active: true,
          channel: 'admin', description: 'Signaleert klanten die langer dan de ingestelde periode niet hebben besteld.' },
      ],
      auditLogs: [],
      counters: { order: 1000 },
    };
  }

  async _audit(action, detail) {
    const db = await this._load();
    db.auditLogs.unshift({ id: uid('log'), action, detail, at: nowIso(), actor: this._session()?.email || 'systeem' });
    db.auditLogs = db.auditLogs.slice(0, 500);
    this._save();
  }

  async _notify(type, to, subject, body, meta = {}) {
    const db = await this._load();
    db.notifications.unshift({ id: uid('n'), type, to, subject, body, meta, status: 'in_wachtrij', at: nowIso() });
    this._save();
    /* In productie verstuurt de backend deze berichten (of een n8n-workflow via
       de webhook). Hier worden ze vastgelegd zodat ze zichtbaar zijn in admin. */
  }

  _session() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
  _setSession(s) { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); }

  /* ---- auth ---- */
  async register(payload) {
    const db = await this._load();
    const email = String(payload.email || '').trim().toLowerCase();
    if (db.users.some((u) => u.email === email)) throw new AppError('Er bestaat al een account met dit e-mailadres.', 'emailBestaat');

    const { salt, hash } = await hashPassword(payload.password);
    const companyId = uid('co');
    const customerId = uid('cus');

    db.companies.push({
      id: companyId, name: payload.companyName, kvk: payload.kvk || null, vatNumber: payload.vatNumber || null,
      invoiceEmail: (payload.invoiceEmail || email).toLowerCase(),
      phone: payload.phone || null,
      address: { street: payload.street, postcode: payload.postcode, city: payload.city, country: payload.country || 'Nederland' },
      invoiceAddressSameAsDelivery: true,
      createdAt: nowIso(),
    });
    db.customers.push({
      id: customerId, companyId, number: `K-${db.customers.length + 1001}`,
      active: true, displayId: payload.displayCode ? (db.displays.find((d) => d.code === payload.displayCode)?.id || null) : null,
      priceListId: null, createdAt: nowIso(), lastOrderAt: null,
    });
    const user = {
      id: uid('u'), email, role: 'klant', customerId, companyId,
      contactName: payload.contactName, phone: payload.phone || null,
      salt, hash, active: true, createdAt: nowIso(),
      consent: { terms: true, privacy: true, at: nowIso() },
    };
    db.users.push(user);

    /* Koppel de klant automatisch aan het display uit de QR-link. */
    const cust = db.customers.find((c) => c.id === customerId);
    if (cust?.displayId) {
      const d = db.displays.find((x) => x.id === cust.displayId);
      if (d) d.customerId = customerId;
    }
    this._save();

    await this._notify('email', email, 'Welkom bij GRABNGO',
      'Uw zakelijke account is aangemaakt. U kunt direct bestellen in de GRABNGO-app.', { automation: 'nieuwe_klant_welkomstmail' });
    await this._notify('admin', 'Mobile Express B.V.', 'Nieuwe klantregistratie',
      `${payload.companyName} heeft een account aangemaakt.`, { customerId });
    await this._audit('klant.registratie', `${payload.companyName} (${email})`);

    return this.login(email, payload.password);
  }

  async login(email, password) {
    const db = await this._load();
    const user = db.users.find((u) => u.email === String(email).trim().toLowerCase());
    if (!user || !user.active) throw new AppError('Dit e-mailadres en wachtwoord horen niet bij elkaar.', 'inloggen');
    const { hash } = await hashPassword(password, user.salt);
    if (hash !== user.hash) throw new AppError('Dit e-mailadres en wachtwoord horen niet bij elkaar.', 'inloggen');
    const session = { userId: user.id, email: user.email, role: user.role, token: uid('tok'), at: nowIso() };
    this._setSession(session);
    await this._audit('auth.login', user.email);
    return this.me();
  }

  async logout() { await this._audit('auth.logout', this._session()?.email); this._setSession(null); }

  async me() {
    const s = this._session();
    if (!s) return null;
    const db = await this._load();
    const user = db.users.find((u) => u.id === s.userId);
    if (!user) { this._setSession(null); return null; }
    const company = db.companies.find((c) => c.id === user.companyId) || null;
    const customer = db.customers.find((c) => c.id === user.customerId) || null;
    const display = customer?.displayId ? db.displays.find((d) => d.id === customer.displayId) : null;
    const location = display?.locationId ? db.locations.find((l) => l.id === display.locationId) : null;
    const { salt, hash, ...safe } = user;
    return { user: safe, company, customer, display: display ? { ...display, location } : null };
  }

  async updatePassword(current, next) {
    const db = await this._load();
    const s = this._session();
    const user = db.users.find((u) => u.id === s?.userId);
    if (!user) throw new AppError('U bent niet meer ingelogd. Log opnieuw in.', 'geenToegang');
    const { hash } = await hashPassword(current, user.salt);
    if (hash !== user.hash) throw new AppError('Uw huidige wachtwoord klopt niet.', 'inloggen');
    const fresh = await hashPassword(next);
    user.salt = fresh.salt; user.hash = fresh.hash;
    this._save();
    await this._audit('auth.wachtwoord_gewijzigd', user.email);
  }

  async updateProfile(patch) {
    const db = await this._load();
    const s = this._session();
    const user = db.users.find((u) => u.id === s?.userId);
    if (!user) throw new AppError('U bent niet meer ingelogd. Log opnieuw in.', 'geenToegang');
    const company = db.companies.find((c) => c.id === user.companyId);
    if (patch.contactName !== undefined) user.contactName = patch.contactName;
    if (patch.phone !== undefined) { user.phone = patch.phone; if (company) company.phone = patch.phone; }
    if (company) {
      ['name', 'kvk', 'vatNumber', 'invoiceEmail'].forEach((k) => { if (patch[k] !== undefined) company[k] = patch[k]; });
      if (patch.address) company.address = { ...company.address, ...patch.address };
      if (patch.invoiceAddress !== undefined) company.invoiceAddress = patch.invoiceAddress;
      if (patch.invoiceAddressSameAsDelivery !== undefined) company.invoiceAddressSameAsDelivery = patch.invoiceAddressSameAsDelivery;
    }
    this._save();
    await this._audit('klant.gegevens_gewijzigd', company?.name);
    return this.me();
  }

  /* ---- catalogus ---- */
  async categories() {
    const db = await this._load();
    return db.categories.filter((c) => c.active).sort((a, b) => a.order - b.order);
  }

  async products({ categoryId = null, q = '', includeInactive = false } = {}) {
    const db = await this._load();
    const term = q.trim().toLowerCase();
    return db.products
      .filter((p) => includeInactive || p.active)
      .filter((p) => !categoryId || p.categoryId === categoryId)
      .filter((p) => !term || [p.name, p.sku, p.ean, p.variant].some((v) => String(v ?? '').toLowerCase().includes(term)))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  async product(id) {
    const db = await this._load();
    const p = db.products.find((x) => x.id === id);
    if (!p) throw new AppError('Dit product bestaat niet (meer).', 'onbekend');
    return p;
  }

  async settings() { const db = await this._load(); return db.settings; }
  async displayInfo() { const db = await this._load(); return db.displayInfo; }

  /* ---- orders ---- */
  async orders() {
    const db = await this._load();
    const me = await this.me();
    if (!me) return [];
    if (!me.customer) return [];
    return db.orders.filter((o) => o.customerId === me.customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async order(id) {
    const db = await this._load();
    const me = await this.me();
    const o = db.orders.find((x) => x.id === id || x.number === id);
    if (!o || (me && me.user.role === 'klant' && o.customerId !== me.customer.id))
      throw new AppError('Deze bestelling kon niet worden gevonden.', 'onbekend');
    return o;
  }

  async createOrder({ items, deliveryAddress, invoice, note, idempotencyKey }) {
    const db = await this._load();
    const me = await this.me();
    if (!me) throw new AppError('U bent niet meer ingelogd. Log opnieuw in om de bestelling te plaatsen.', 'geenToegang');
    if (!items?.length) throw new AppError('Uw winkelmandje is leeg.', 'legeMand');

    /* Voorkomt dubbele orders bij netwerkproblemen / dubbel tikken. */
    const existing = db.orders.find((o) => o.idempotencyKey && o.idempotencyKey === idempotencyKey);
    if (existing) return existing;

    /* Prijzen worden serverzijde opnieuw bepaald — nooit uit de client. */
    const lines = items.map((it) => {
      const p = db.products.find((x) => x.id === it.productId);
      if (!p || !p.active) throw new AppError('Eén van de producten in uw mandje is niet meer beschikbaar. Ververs uw winkelmandje.', 'onbekend');
      const unit = p.purchasePriceExVat;
      return {
        productId: p.id, sku: p.sku, ean: p.ean, name: p.name, variant: p.variant,
        image: p.image, qty: it.qty, unitPriceExVat: unit,
        lineTotalExVat: Math.round(unit * it.qty * 100) / 100, rrpIncVat: p.rrpIncVat,
      };
    });

    const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotalExVat, 0) * 100) / 100;
    const shipping = db.settings.shippingCostExVat ?? 0;
    const vatRate = db.settings.vatRate ?? CONFIG.vatRateFallback;
    const vat = Math.round((subtotal + shipping) * vatRate * 100) / 100;
    const total = Math.round((subtotal + shipping + vat) * 100) / 100;

    db.counters.order += 1;
    const number = `GNG-${new Date().getFullYear()}-${db.counters.order}`;
    const order = {
      id: uid('o'), number, customerId: me.customer.id, companyId: me.company.id,
      companyName: me.company.name, contactName: me.user.contactName, email: me.user.email,
      invoiceEmail: invoice?.invoiceEmail || me.company.invoiceEmail,
      deliveryAddress: deliveryAddress || me.company.address,
      displayId: me.customer.displayId || null,
      note: note || null, items: lines,
      subtotalExVat: subtotal, shippingExVat: shipping, vatRate, vatAmount: vat, totalIncVat: total,
      status: 'nieuw', statusHistory: [{ status: 'nieuw', at: nowIso() }],
      idempotencyKey: idempotencyKey || uid('idem'), createdAt: nowIso(),
      source: me.customer.displayId ? 'app_display' : 'app',
    };
    db.orders.unshift(order);
    const cust = db.customers.find((c) => c.id === me.customer.id);
    if (cust) cust.lastOrderAt = order.createdAt;
    this._save();

    await this._notify('email', order.email, `Orderbevestiging ${order.number}`,
      `Bedankt voor uw bestelling. Wij verwerken order ${order.number}.`, { orderId: order.id, automation: 'nieuwe_order_bevestiging' });
    await this._notify('admin', 'Mobile Express B.V.', `Nieuwe bestelling ${order.number}`,
      `${order.companyName} heeft ${lines.length} regel(s) besteld voor ${total.toFixed(2)} incl. btw.`, { orderId: order.id });
    await this._audit('order.aangemaakt', `${order.number} — ${order.companyName}`);
    return order;
  }

  /* ---- displays / QR ---- */
  async displayByCode(code) {
    const db = await this._load();
    const d = db.displays.find((x) => x.code === String(code).toUpperCase() && x.active);
    if (!d) return null;
    const q = db.qrLinks.find((x) => x.code === d.code);
    if (q) { q.scans += 1; this._save(); }
    return { ...d, location: db.locations.find((l) => l.id === d.locationId) || null };
  }

  async linkCustomerToDisplay(code) {
    const db = await this._load();
    const me = await this.me();
    if (!me) throw new AppError('Log eerst in om een display te koppelen.', 'geenToegang');
    const d = db.displays.find((x) => x.code === String(code).toUpperCase());
    if (!d) throw new AppError('Deze displaycode is niet bekend. Controleer de code op de achterzijde van het display.', 'onbekend');
    d.customerId = me.customer.id;
    const cust = db.customers.find((c) => c.id === me.customer.id);
    if (cust) cust.displayId = d.id;
    this._save();
    await this._audit('display.gekoppeld', `${d.code} → ${me.company.name}`);
    return this.me();
  }

  /* ---- admin ----
     In productie draait beheer op de server met rolgebaseerde toegang (RBAC)
     en een strikte scheiding tussen klant- en adminrollen. In deze
     voorbeeldversie wordt dezelfde rol-check lokaal uitgevoerd zodat de
     schermen beoordeeld kunnen worden. */
  async hasAdmin() {
    const db = await this._load();
    return db.users.some((u) => u.role === 'admin');
  }

  async adminBootstrap(email, password) {
    const db = await this._load();
    if (db.users.some((u) => u.role === 'admin')) throw new AppError('Er is al een beheerder ingesteld.', 'geenToegang');
    const { salt, hash } = await hashPassword(password);
    db.users.push({
      id: uid('u'), email: String(email).trim().toLowerCase(), role: 'admin',
      customerId: null, companyId: null, contactName: 'Beheerder',
      salt, hash, active: true, createdAt: nowIso(),
    });
    this._save();
    await this._audit('admin.aangemaakt', email);
    return this.login(email, password);
  }

  async requireAdmin() {
    const me = await this.me();
    if (!me || me.user.role !== 'admin') throw new AppError('U heeft geen toegang tot de adminomgeving.', 'geenToegang');
    return me;
  }

  async adminRaw() { await this.requireAdmin(); return this._load(); }
  async adminSave(mutator) {
    await this.requireAdmin();
    const db = await this._load();
    const out = await mutator(db);
    this._save();
    return out;
  }
  async resetCatalog() {
    const db = await this._load();
    const res = await fetch(CONFIG.catalogUrl, { cache: 'no-store' });
    const cat = await res.json();
    db.products = cat.products; db.categories = cat.categories;
    db.settings = { ...db.settings, ...cat.settings };
    this._save();
    await this._audit('catalogus.opnieuw_geladen', `versie ${cat.version}`);
  }
}

/* ==========================================================================
   RestAdapter — echte backend. Endpoints: docs/05-api.md
   ========================================================================== */
class RestAdapter {
  constructor(base) { this.base = base.replace(/\/$/, ''); }
  _token() { try { return JSON.parse(localStorage.getItem(SESSION_KEY))?.token; } catch { return null; } }
  async _req(path, { method = 'GET', body, headers = {} } = {}) {
    let res;
    try {
      res = await fetch(this.base + path, {
        method,
        headers: { 'Content-Type': 'application/json', ...(this._token() ? { Authorization: `Bearer ${this._token()}` } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new AppError('We konden geen verbinding maken. Controleer uw internetverbinding.', 'netwerk');
    }
    if (res.status === 401) { localStorage.removeItem(SESSION_KEY); throw new AppError('Uw sessie is verlopen. Log opnieuw in.', 'geenToegang'); }
    if (!res.ok) {
      let msg = 'Er ging iets mis. Probeer het opnieuw.';
      try { const j = await res.json(); if (j?.message) msg = j.message; } catch { /* laat standaardtekst staan */ }
      throw new AppError(msg, 'onbekend');
    }
    return res.status === 204 ? null : res.json();
  }
  async register(p) { const r = await this._req('/auth/register', { method: 'POST', body: p }); localStorage.setItem(SESSION_KEY, JSON.stringify(r.session)); return r.profile; }
  async login(email, password) { const r = await this._req('/auth/login', { method: 'POST', body: { email, password } }); localStorage.setItem(SESSION_KEY, JSON.stringify(r.session)); return r.profile; }
  async logout() { try { await this._req('/auth/logout', { method: 'POST' }); } finally { localStorage.removeItem(SESSION_KEY); } }
  async me() { if (!this._token()) return null; try { return await this._req('/auth/me'); } catch { return null; } }
  updatePassword(current, next) { return this._req('/auth/password', { method: 'PUT', body: { current, next } }); }
  updateProfile(patch) { return this._req('/customers/me', { method: 'PATCH', body: patch }); }
  categories() { return this._req('/categories'); }
  products({ categoryId, q, includeInactive } = {}) {
    const s = new URLSearchParams();
    if (categoryId) s.set('category', categoryId);
    if (q) s.set('q', q);
    if (includeInactive) s.set('includeInactive', '1');
    return this._req(`/products${s.toString() ? `?${s}` : ''}`);
  }
  product(id) { return this._req(`/products/${encodeURIComponent(id)}`); }
  settings() { return this._req('/settings'); }
  displayInfo() { return this._req('/displays/info'); }
  orders() { return this._req('/orders'); }
  order(id) { return this._req(`/orders/${encodeURIComponent(id)}`); }
  createOrder(payload) {
    return this._req('/orders', { method: 'POST', body: payload, headers: { 'Idempotency-Key': payload.idempotencyKey } });
  }
  displayByCode(code) { return this._req(`/displays/code/${encodeURIComponent(code)}`).catch(() => null); }
  linkCustomerToDisplay(code) { return this._req('/customers/me/display', { method: 'PUT', body: { code } }); }
  hasAdmin() { return this._req('/admin/status').then((r) => !!r.hasAdmin).catch(() => true); }
  adminBootstrap() { throw new AppError('Beheerders worden in productie door Mobile Express B.V. aangemaakt.', 'geenToegang'); }
  requireAdmin() { return this._req('/admin/me'); }
  adminRaw() { return this._req('/admin/export'); }
  adminSave() { throw new AppError('Beheerwijzigingen lopen in productie via de admin-API.', 'onbekend'); }
  resetCatalog() { return this._req('/admin/catalog/reload', { method: 'POST' }); }
}

export const api = CONFIG.backend === 'rest' && CONFIG.apiBaseUrl
  ? new RestAdapter(CONFIG.apiBaseUrl)
  : new LocalAdapter();

export const isLocalBackend = !(CONFIG.backend === 'rest' && CONFIG.apiBaseUrl);
