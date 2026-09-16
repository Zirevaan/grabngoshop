/* Account — bedrijfsgegevens, factuurgegevens, contactgegevens, wachtwoord,
   orderhistorie, display koppelen, privacy/voorwaarden en uitloggen. */
import { api } from '../api.js';
import { state, refreshProfile, clearCart } from '../store.js';
import { navigate } from '../router.js';
import { appbar, field, icon, toast, notice } from '../ui.js';
import { escapeHtml } from '../format.js';

const overzicht = (p) => `
  ${appbar({ title: 'Account' })}
  <div class="screen">
    <div class="stack">
      <div class="card">
        <div style="font-weight:800;font-size:17px">${escapeHtml(p.company?.name || '')}</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:2px">${escapeHtml(p.user.contactName || '')} · ${escapeHtml(p.user.email)}</div>
        ${p.customer?.number ? `<div style="font-size:12px;color:var(--text-soft);margin-top:6px">Klantnummer ${escapeHtml(p.customer.number)}</div>` : ''}
      </div>

      <div class="list">
        <button class="list__item" data-to="/account/bedrijf"><span class="grow"><span class="list__title">Bedrijfsgegevens</span><br><span class="list__sub">Naam, KvK, btw-nummer en adres</span></span><span class="list__chev">${icon.chev}</span></button>
        <button class="list__item" data-to="/account/factuur"><span class="grow"><span class="list__title">Factuurgegevens</span><br><span class="list__sub">Factuur-e-mailadres</span></span><span class="list__chev">${icon.chev}</span></button>
        <button class="list__item" data-to="/account/contact"><span class="grow"><span class="list__title">Contactgegevens</span><br><span class="list__sub">Contactpersoon en telefoonnummer</span></span><span class="list__chev">${icon.chev}</span></button>
        <button class="list__item" data-to="/account/wachtwoord"><span class="grow"><span class="list__title">Wachtwoord wijzigen</span></span><span class="list__chev">${icon.chev}</span></button>
      </div>

      <div class="list">
        <button class="list__item" data-to="/bestellingen"><span class="grow"><span class="list__title">Orderhistorie</span><br><span class="list__sub">Bestellingen bekijken en opnieuw bestellen</span></span><span class="list__chev">${icon.chev}</span></button>
        <button class="list__item" data-to="/qr"><span class="grow"><span class="list__title">Display koppelen</span><br><span class="list__sub">${p.display ? `Gekoppeld aan ${escapeHtml(p.display.code)}` : 'Nog geen display gekoppeld'}</span></span><span class="list__chev">${icon.chev}</span></button>
      </div>

      <div class="list">
        <button class="list__item" data-to="/info/voorwaarden"><span class="grow"><span class="list__title">Algemene voorwaarden</span></span><span class="list__chev">${icon.chev}</span></button>
        <button class="list__item" data-to="/info/privacy"><span class="grow"><span class="list__title">Privacybeleid</span></span><span class="list__chev">${icon.chev}</span></button>
        <button class="list__item" data-to="/info/gegevens"><span class="grow"><span class="list__title">Mijn gegevens (AVG)</span><br><span class="list__sub">Inzage, wijzigen of verwijderen aanvragen</span></span><span class="list__chev">${icon.chev}</span></button>
        <button class="list__item" data-to="/info/contact"><span class="grow"><span class="list__title">Contact & support</span></span><span class="list__chev">${icon.chev}</span></button>
      </div>

      <button class="btn btn--danger btn--block" id="uitloggen">Uitloggen</button>
      <p class="center" style="font-size:11.5px;color:var(--text-soft)">GRABNGO — Mobile Express B.V.<br>App-versie ${escapeHtml(window.GNG?.version || '')}</p>
    </div>
  </div>`;

const formScherm = (titel, inner) => `
  ${appbar({ title: titel, back: true })}
  <div class="screen">
    <form id="f" class="stack">${inner}
      <div id="err"></div>
      <button class="btn btn--primary btn--block" type="submit">Opslaan</button>
    </form>
  </div>`;

export default async function account({ params }) {
  const p = state.profile;
  const sectie = params.sectie || null;
  const a = p.company?.address || {};

  if (!sectie) {
    return {
      html: overzicht(p),
      mount(root) {
        root.querySelector('#uitloggen').addEventListener('click', async () => {
          await api.logout(); clearCart(); await refreshProfile();
          toast('U bent uitgelogd'); navigate('/welkom', { replace: true });
        });
      },
    };
  }

  const schermen = {
    bedrijf: {
      titel: 'Bedrijfsgegevens',
      html: `<div class="card stack">
        ${field({ name: 'name', label: 'Bedrijfsnaam', value: p.company?.name, required: true })}
        <div class="form-grid">
          ${field({ name: 'kvk', label: 'KvK-nummer', value: p.company?.kvk || '' })}
          ${field({ name: 'vatNumber', label: 'BTW-nummer', value: p.company?.vatNumber || '' })}
        </div>
        ${field({ name: 'street', label: 'Adres', value: a.street, required: true })}
        <div class="form-grid">
          ${field({ name: 'postcode', label: 'Postcode', value: a.postcode, required: true })}
          ${field({ name: 'city', label: 'Plaats', value: a.city, required: true })}
        </div>
        ${field({ name: 'country', label: 'Land', value: a.country || 'Nederland', required: true })}
      </div>`,
      patch: (fd) => ({ name: fd.name, kvk: fd.kvk || null, vatNumber: fd.vatNumber || null,
        address: { street: fd.street, postcode: fd.postcode, city: fd.city, country: fd.country } }),
    },
    factuur: {
      titel: 'Factuurgegevens',
      html: `<div class="card stack">
        ${field({ name: 'invoiceEmail', label: 'Factuur e-mailadres', type: 'email', value: p.company?.invoiceEmail || p.user.email, required: true })}
        <p class="field__hint">Facturen van Mobile Express B.V. worden naar dit adres gestuurd.</p>
      </div>
      ${notice('info', '<div>Betaal- en facturatievoorwaarden worden door Mobile Express B.V. bepaald. <strong>NOG AAN TE LEVEREN.</strong></div>')}`,
      patch: (fd) => ({ invoiceEmail: fd.invoiceEmail }),
    },
    contact: {
      titel: 'Contactgegevens',
      html: `<div class="card stack">
        ${field({ name: 'contactName', label: 'Contactpersoon', value: p.user.contactName, required: true })}
        ${field({ name: 'phone', label: 'Telefoonnummer', type: 'tel', value: p.user.phone || '', required: true })}
      </div>`,
      patch: (fd) => ({ contactName: fd.contactName, phone: fd.phone }),
    },
    wachtwoord: {
      titel: 'Wachtwoord wijzigen',
      html: `<div class="card stack">
        ${field({ name: 'current', label: 'Huidig wachtwoord', type: 'password', required: true, autocomplete: 'current-password' })}
        ${field({ name: 'next', label: 'Nieuw wachtwoord', type: 'password', required: true, hint: 'Minimaal 8 tekens', autocomplete: 'new-password' })}
        ${field({ name: 'next2', label: 'Herhaal nieuw wachtwoord', type: 'password', required: true, autocomplete: 'new-password' })}
      </div>`,
      wachtwoord: true,
    },
  };

  const s = schermen[sectie];
  if (!s) { navigate('/account', { replace: true }); return; }

  return {
    html: formScherm(s.titel, s.html),
    mount(root) {
      const form = root.querySelector('#f');
      const err = root.querySelector('#err');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(form));
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true; btn.textContent = 'Opslaan…'; err.innerHTML = '';
        try {
          if (s.wachtwoord) {
            if ((fd.next || '').length < 8) throw new Error('Kies een nieuw wachtwoord van minimaal 8 tekens.');
            if (fd.next !== fd.next2) throw new Error('De twee nieuwe wachtwoorden zijn niet gelijk.');
            await api.updatePassword(fd.current, fd.next);
          } else {
            await api.updateProfile(s.patch(fd));
          }
          await refreshProfile();
          toast('Uw gegevens zijn opgeslagen');
          navigate('/account');
        } catch (ex) {
          err.innerHTML = `<div class="notice notice--error">${ex.message}</div>`;
          btn.disabled = false; btn.textContent = 'Opslaan';
        }
      });
    },
  };
}
