/* Herbruikbare UI-componenten. Alle schermen bouwen hiermee, zodat knoppen,
   kaarten, navigatie en typografie op één plek aanpasbaar blijven. */
import { CONFIG } from './config.js';
import { euro, escapeHtml } from './format.js';

export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

export const icon = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l1.5 4H4.5L6 3Z"/><path d="M4.5 7h15V20a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V7Z"/><path d="M9.5 11h5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.2l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h7.9a1.6 1.6 0 0 0 1.6-1.2L20 8H6"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>',
  chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h7"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
};

export const logo = (variant = 'light', cls = '') =>
  `<img src="${variant === 'light' ? CONFIG.logoLight : CONFIG.logoDark}" alt="GRABNGO" class="${cls}">`;

/* ---- app bar ---- */
export function appbar({ title, subtitle, back = false, right = '' }) {
  return `<header class="appbar">
    ${back ? `<button class="appbar__back" data-back aria-label="Terug">${icon.back}</button>` : ''}
    <div class="grow">
      ${title ? `<div class="appbar__title">${escapeHtml(title)}</div>` : logo('light', 'appbar__logo')}
      ${subtitle ? `<div class="appbar__sub">${escapeHtml(subtitle)}</div>` : ''}
    </div>
    ${right}
  </header>`;
}

/* ---- productafbeelding met duidelijke placeholder ---- */
export function productImage(p, cls = '') {
  if (!p.image) {
    return `<div class="img-placeholder ${cls}">${icon.image}<span>Definitieve productfoto<br>NOG AAN TE LEVEREN</span></div>`;
  }
  const badge = p.imageStatus === 'PLACEHOLDER' ? 'Placeholder'
    : p.imageStatus === 'TE_BEVESTIGEN' ? 'Foto te bevestigen' : '';
  return `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">
    ${badge ? `<span class="placeholder-badge">${badge}</span>` : ''}`;
}

/* ---- productkaart ---- */
export function productCard(p) {
  return `<article class="pcard" data-product="${escapeHtml(p.id)}">
    <div class="pcard__media">${productImage(p)}</div>
    <div class="pcard__body">
      <div class="pcard__name">${escapeHtml(p.name.replace(/^GrabNGo\s*/i, ''))}</div>
      ${p.variant ? `<div class="pcard__variant">${escapeHtml(p.variant)}</div>` : ''}
      <div class="pcard__sku">SKU ${escapeHtml(p.sku)}</div>
      <div class="pcard__prices">
        <div class="price-label">Inkoop excl. btw</div>
        <div class="price-main">${euro(p.purchasePriceExVat)}</div>
        ${p.rrpIncVat ? `<div class="price-rrp">Advies ${euro(p.rrpIncVat)} incl. btw</div>` : ''}
      </div>
    </div>
    <div class="pcard__action">
      <button class="btn btn--dark btn--sm btn--block" data-add="${escapeHtml(p.id)}">Toevoegen</button>
    </div>
  </article>`;
}

/* ---- aantalselector ---- */
export function stepper(value, dataAttr = '') {
  return `<div class="stepper" ${dataAttr}>
    <button type="button" data-step="-1" aria-label="Minder">−</button>
    <input type="number" inputmode="numeric" min="0" max="999" value="${value}" aria-label="Aantal">
    <button type="button" data-step="1" aria-label="Meer">+</button>
  </div>`;
}

export function field({ name, label, type = 'text', value = '', required = false, hint = '', placeholder = '', autocomplete = '' }) {
  return `<label class="field">
    <span class="field__label">${escapeHtml(label)}${required ? ' *' : ''}</span>
    <input class="input" name="${name}" type="${type}" value="${escapeHtml(value ?? '')}"
      ${required ? 'required' : ''} placeholder="${escapeHtml(placeholder)}"
      ${autocomplete ? `autocomplete="${autocomplete}"` : ''}>
    ${hint ? `<span class="field__hint">${escapeHtml(hint)}</span>` : ''}
  </label>`;
}

export const empty = (title, text, action = '') =>
  `<div class="empty">${icon.box}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p>${action ? `<div style="margin-top:20px">${action}</div>` : ''}</div>`;

export const spinner = () => '<div class="spinner" role="status" aria-label="Bezig met laden"></div>';

export const notice = (type, html) => `<div class="notice notice--${type}">${html}</div>`;

/* ---- toast ---- */
let toastEl, toastTimer;
export function toast(message) {
  if (!toastEl) { toastEl = h('<div class="toast" role="status"></div>'); document.body.appendChild(toastEl); }
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
}

/* ---- bottom sheet ---- */
export function sheet(innerHtml) {
  const bd = h(`<div class="sheet-backdrop"><div class="sheet"><div class="sheet__grip"></div>${innerHtml}</div></div>`);
  bd.addEventListener('click', (e) => { if (e.target === bd) bd.remove(); });
  document.body.appendChild(bd);
  return bd;
}
