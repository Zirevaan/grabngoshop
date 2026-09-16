/* ==========================================================================
   GRABNGO Admin — beheeromgeving voor Mobile Express B.V.
   Modules: Dashboard, Klanten, Orders, Producten, Categorieën, Prijzen,
   Displays, Locaties, Automatiseringen, E-mail/notificaties, Rapportages en
   Instellingen.
   ========================================================================== */
import { api, isLocalBackend } from '/app/js/api.js';
import { euro, datum, datumKort, escapeHtml, statusKleur, T, dagenGeleden } from '/app/js/format.js';
import { secties } from './secties.js';

const root = () => document.getElementById('root');
export const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export const MENU = [
  { group: 'Overzicht', items: [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'rapportages', label: 'Rapportages' },
  ]},
  { group: 'Verkoop', items: [
    { id: 'orders', label: 'Orders' },
    { id: 'klanten', label: 'Klanten' },
  ]},
  { group: 'Assortiment', items: [
    { id: 'producten', label: 'Producten' },
    { id: 'categorieen', label: 'Categorieën' },
    { id: 'prijzen', label: 'Prijzen' },
  ]},
  { group: 'Displays', items: [
    { id: 'displays', label: 'Displays & QR' },
    { id: 'locaties', label: 'Locaties' },
  ]},
  { group: 'Systeem', items: [
    { id: 'automatiseringen', label: 'Automatiseringen' },
    { id: 'notificaties', label: 'E-mail & notificaties' },
    { id: 'instellingen', label: 'Instellingen' },
  ]},
];

/* ---------------- hulpmiddelen die de secties gebruiken ---------------- */
export const helpers = { euro, datum, datumKort, escapeHtml, statusKleur, T, dagenGeleden };

export function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = h('<div class="toast"></div>'); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('is-visible');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

export function modal(title, bodyHtml, footHtml = '') {
  const bd = h(`<div class="modal-bd"><div class="modal">
    <div class="modal__head"><strong>${escapeHtml(title)}</strong>
      <button class="btn btn--ghost btn--sm" data-close>Sluiten</button></div>
    <div class="modal__body">${bodyHtml}</div>
    ${footHtml ? `<div class="modal__foot">${footHtml}</div>` : ''}
  </div></div>`);
  bd.addEventListener('click', (e) => { if (e.target === bd || e.target.closest('[data-close]')) bd.remove(); });
  document.body.appendChild(bd);
  return bd;
}

export const refresh = () => renderApp(location.hash.replace('#', '') || 'dashboard');

/* ---------------- inloggen ---------------- */
async function renderLogin() {
  const heeftAdmin = await api.hasAdmin();
  root().innerHTML = `
    <div class="login-wrap">
      <div class="login-card">
        <img src="/assets/brand/grabngo-logo-black.png" alt="GRABNGO">
        <h2>${heeftAdmin ? 'Adminomgeving' : 'Beheerder instellen'}</h2>
        <p style="font-size:13px;color:var(--text-muted);margin:6px 0 18px">
          ${heeftAdmin ? 'Log in met uw beheerdersaccount van Mobile Express B.V.'
                       : 'Er is nog geen beheerder. Stel hieronder het eerste beheerdersaccount in.'}</p>
        <form id="f" class="stack">
          <label class="field"><span class="field__label">E-mailadres</span>
            <input class="input" name="email" type="email" required autocomplete="username"></label>
          <label class="field"><span class="field__label">Wachtwoord</span>
            <input class="input" name="password" type="password" required autocomplete="current-password"></label>
          <div id="err"></div>
          <button class="btn btn--dark btn--block" type="submit">${heeftAdmin ? 'Inloggen' : 'Beheerder aanmaken'}</button>
        </form>
        ${isLocalBackend ? `<p style="font-size:11.5px;color:var(--text-soft);margin-top:16px">
          Voorbeeldversie: gegevens staan lokaal op dit apparaat. In productie draait beheer op de server
          met rolgebaseerde toegang.</p>` : ''}
      </div>
    </div>`;
  root().querySelector('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const err = root().querySelector('#err');
    err.innerHTML = '';
    try {
      if (heeftAdmin) {
        const me = await api.login(fd.email, fd.password);
        if (me.user.role !== 'admin') { await api.logout(); throw new Error('U heeft geen toegang tot de adminomgeving.'); }
      } else {
        if ((fd.password || '').length < 10) throw new Error('Kies een wachtwoord van minimaal 10 tekens.');
        await api.adminBootstrap(fd.email, fd.password);
      }
      start();
    } catch (ex) {
      err.innerHTML = `<div class="notice notice--error">${ex.message}</div>`;
    }
  });
}

/* ---------------- app-frame ---------------- */
async function renderApp(sectieId) {
  const sectie = secties[sectieId] ? sectieId : 'dashboard';
  const db = await api.adminRaw();

  root().innerHTML = `
    <div class="admin">
      <aside class="sidebar">
        <div class="sidebar__brand"><img src="/assets/brand/grabngo-logo.png" alt="GRABNGO"><span>Admin</span></div>
        <nav class="sidebar__nav">
          ${MENU.map((g) => `<div class="sidebar__group">${g.group}</div>
            ${g.items.map((i) => `<button class="sidebar__link ${i.id === sectie ? 'is-active' : ''}" data-sectie="${i.id}">${i.label}</button>`).join('')}`).join('')}
        </nav>
        <div class="sidebar__foot">
          Mobile Express B.V.<br>
          <button class="btn btn--ghost btn--sm" id="uit" style="padding:6px 0;color:#c5c5cd">Uitloggen</button>
        </div>
      </aside>
      <div class="mobile-nav">
        <img src="/assets/brand/grabngo-logo.png" alt="GRABNGO">
        <select id="msel">${MENU.flatMap((g) => g.items).map((i) => `<option value="${i.id}" ${i.id === sectie ? 'selected' : ''}>${i.label}</option>`).join('')}</select>
      </div>
      <main class="content" id="content"></main>
    </div>`;

  const content = root().querySelector('#content');
  content.innerHTML = await secties[sectie].render(db, helpers);
  await secties[sectie].mount?.(content, db, { api, modal, toast, refresh, helpers, h });

  root().querySelectorAll('[data-sectie]').forEach((b) =>
    b.addEventListener('click', () => { location.hash = b.dataset.sectie; }));
  root().querySelector('#msel')?.addEventListener('change', (e) => { location.hash = e.target.value; });
  root().querySelector('#uit').addEventListener('click', async () => { await api.logout(); start(); });
}

/* ---------------- start ---------------- */
async function start() {
  const me = await api.me();
  if (!me || me.user.role !== 'admin') { renderLogin(); return; }
  await renderApp(location.hash.replace('#', '') || 'dashboard');
}
window.addEventListener('hashchange', async () => {
  const me = await api.me();
  if (me?.user.role === 'admin') renderApp(location.hash.replace('#', '') || 'dashboard');
});
start();
