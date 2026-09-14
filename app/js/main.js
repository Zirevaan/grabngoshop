/* App-bootstrap: router, bottom navigation en schermregistratie. */
import { CONFIG } from './config.js';
import { initStore, state, onChange, cartCount, isLoggedIn } from './store.js';
import { route, setNotFound, startRouter, navigate, resolve, parseHash, back } from './router.js';
import { icon, spinner, h, qs, notice } from './ui.js';
import { isLocalBackend } from './api.js';

import welkom from './views/welkom.js';
import login from './views/login.js';
import registreren from './views/registreren.js';
import home from './views/home.js';
import producten from './views/producten.js';
import productDetail from './views/product.js';
import mand from './views/mand.js';
import bestellen from './views/bestellen.js';
import bevestiging from './views/bevestiging.js';
import bestellingen from './views/bestellingen.js';
import bestelling from './views/bestelling.js';
import account from './views/account.js';
import qr from './views/qr.js';
import infoPagina from './views/info.js';

const view = () => qs('#view');

/* ---------- bottom navigation ---------- */
const NAV = [
  { to: '/home', label: 'Home', ic: 'home', match: ['/home'] },
  { to: '/producten', label: 'Producten', ic: 'grid', match: ['/producten', '/product'] },
  { to: '/bestellingen', label: 'Bestellingen', ic: 'orders', match: ['/bestellingen', '/bestelling'] },
  { to: '/account', label: 'Account', ic: 'user', match: ['/account'] },
  { to: '/mand', label: 'Mandje', ic: 'cart', match: ['/mand', '/bestellen'] },
];

function renderNav() {
  const nav = qs('#bottomnav');
  const { path } = parseHash();
  const hidden = ['/welkom', '/login', '/registreren'].some((p) => path.startsWith(p));
  nav.hidden = hidden;
  if (hidden) return;
  const count = cartCount();
  nav.innerHTML = NAV.map((n) => {
    const active = n.match.some((m) => path === m || path.startsWith(m + '/'));
    return `<button class="bottomnav__item ${active ? 'is-active' : ''}" data-to="${n.to}">
      ${icon[n.ic]}<span>${n.label}</span>
      ${n.ic === 'cart' && count ? `<span class="badge">${count > 99 ? '99+' : count}</span>` : ''}
    </button>`;
  }).join('');
}

/* ---------- schermwissel ---------- */
async function render(fn, ctx) {
  view().innerHTML = spinner();
  try {
    const out = await fn(ctx);
    if (out === undefined) return;                 // scherm heeft zelf genavigeerd
    if (typeof out === 'string') view().innerHTML = out;
    else { view().innerHTML = out.html; await out.mount?.(view(), ctx); }
  } catch (err) {
    console.error(err);
    view().innerHTML = `<div class="screen">${notice('error', `<div><strong>Er ging iets mis.</strong><br>${err?.message || 'Probeer het later opnieuw.'}</div>`)}
      <div style="margin-top:16px"><button class="btn btn--outline btn--block" onclick="location.reload()">Opnieuw proberen</button></div></div>`;
  }
  renderNav();
}

/* Schermen die inloggen vereisen. */
const guarded = (fn) => async (ctx) => {
  if (!isLoggedIn()) { navigate(`/login?next=${encodeURIComponent(ctx.path)}`, { replace: true }); return; }
  return render(fn, ctx);
};
const open = (fn) => (ctx) => render(fn, ctx);

route('/welkom', open(welkom));
route('/login', open(login));
route('/registreren', open(registreren));
route('/home', guarded(home));
route('/producten', guarded(producten));
route('/product/:id', guarded(productDetail));
route('/mand', guarded(mand));
route('/bestellen', guarded(bestellen));
route('/bevestiging/:id', guarded(bevestiging));
route('/bestellingen', guarded(bestellingen));
route('/bestelling/:id', guarded(bestelling));
route('/account', guarded(account));
route('/account/:sectie', guarded(account));
route('/qr', open(qr));
route('/qr/:code', open(qr));
route('/info/:pagina', open(infoPagina));
route('/', () => navigate(isLoggedIn() ? '/home' : '/welkom', { replace: true }));
setNotFound(() => navigate(isLoggedIn() ? '/home' : '/welkom', { replace: true }));

/* ---------- globale gebeurtenissen ---------- */
document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-to]');
  if (nav) { navigate(nav.dataset.to); return; }
  if (e.target.closest('[data-back]')) { back(); }
});
onChange(renderNav);

/* ---------- start ---------- */
(async function start() {
  try {
    await initStore();
  } catch (err) {
    document.body.innerHTML = `<div class="screen">${notice('error', '<div><strong>De app kon niet starten.</strong><br>Controleer uw internetverbinding en probeer het opnieuw.</div>')}</div>`;
    return;
  }
  /* QR-deeplink buiten de hash om: /app/?display=GNG-XXXX */
  const q = new URLSearchParams(location.search);
  if (q.get('display') && !location.hash.startsWith('#/qr')) {
    navigate(`/qr/${encodeURIComponent(q.get('display'))}`, { replace: true });
  }
  if (isLocalBackend) {
    const bar = h('<div class="preview-bar">Voorbeeldversie · gegevens staan lokaal op dit toestel</div>');
    document.getElementById('app').prepend(bar);
  }
  await startRouter();
  document.getElementById('boot')?.remove();
})();

/* Herteken het huidige scherm wanneer een view daarom vraagt. */
window.addEventListener('gng:rerender', () => resolve());
window.GNG = { version: CONFIG.version };
