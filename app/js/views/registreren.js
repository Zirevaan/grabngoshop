/* Registratie van een nieuwe zakelijke klant. Zo kort mogelijk, maar met de
   gegevens die nodig zijn voor een zakelijke order en facturatie. */
import { api } from '../api.js';
import { refreshProfile, state } from '../store.js';
import { navigate } from '../router.js';
import { appbar, field, toast } from '../ui.js';

export default async function registreren() {
  return {
    html: `
    ${appbar({ title: 'Account aanmaken', back: true })}
    <div class="screen screen--plain">
      <form id="f" class="stack" novalidate>
        <div class="card stack">
          <div class="section-title">Bedrijfsgegevens</div>
          ${field({ name: 'companyName', label: 'Bedrijfsnaam', required: true, autocomplete: 'organization' })}
          ${field({ name: 'contactName', label: 'Contactpersoon', required: true, autocomplete: 'name' })}
          <div class="form-grid">
            ${field({ name: 'kvk', label: 'KvK-nummer', hint: 'Indien van toepassing' })}
            ${field({ name: 'vatNumber', label: 'BTW-nummer', hint: 'Indien van toepassing' })}
          </div>
        </div>

        <div class="card stack">
          <div class="section-title">Contact & facturatie</div>
          ${field({ name: 'email', label: 'E-mailadres (inloggen)', type: 'email', required: true, autocomplete: 'email' })}
          ${field({ name: 'invoiceEmail', label: 'Factuur e-mailadres', type: 'email', hint: 'Laat leeg om hetzelfde adres te gebruiken' })}
          ${field({ name: 'phone', label: 'Telefoonnummer', type: 'tel', required: true, autocomplete: 'tel' })}
        </div>

        <div class="card stack">
          <div class="section-title">Adres</div>
          ${field({ name: 'street', label: 'Adres', required: true, autocomplete: 'street-address' })}
          <div class="form-grid">
            ${field({ name: 'postcode', label: 'Postcode', required: true, autocomplete: 'postal-code' })}
            ${field({ name: 'city', label: 'Plaats', required: true, autocomplete: 'address-level2' })}
          </div>
          ${field({ name: 'country', label: 'Land', value: 'Nederland', required: true, autocomplete: 'country-name' })}
        </div>

        <div class="card stack">
          <div class="section-title">Beveiliging</div>
          ${field({ name: 'password', label: 'Wachtwoord', type: 'password', required: true, hint: 'Minimaal 8 tekens', autocomplete: 'new-password' })}
          ${field({ name: 'password2', label: 'Herhaal wachtwoord', type: 'password', required: true, autocomplete: 'new-password' })}
        </div>

        ${state.pendingDisplayCode ? `<div class="notice notice--info">
          <div><strong>Display ${state.pendingDisplayCode}</strong><br>Uw account wordt automatisch aan dit display gekoppeld.</div></div>` : ''}

        <label class="checkbox"><input type="checkbox" name="terms" required>
          <span>Ik ga akkoord met de <a data-to="/info/voorwaarden" style="text-decoration:underline">algemene voorwaarden</a>
          en het <a data-to="/info/privacy" style="text-decoration:underline">privacybeleid</a> van Mobile Express B.V.</span></label>

        <div id="err"></div>
        <button class="btn btn--primary btn--block" type="submit">Account aanmaken</button>
        <p style="font-size:12px;color:var(--text-soft);text-align:center">
          Registratie is alleen bedoeld voor zakelijke klanten. Mobile Express B.V. kan uw account controleren voordat u kunt bestellen.</p>
      </form>
    </div>`,
    mount(root) {
      const form = root.querySelector('#f');
      const err = root.querySelector('#err');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = Object.fromEntries(new FormData(form));
        const problems = [];
        if (!fd.companyName?.trim()) problems.push('Vul uw bedrijfsnaam in.');
        if (!fd.contactName?.trim()) problems.push('Vul de naam van de contactpersoon in.');
        if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(fd.email || '')) problems.push('Vul een geldig e-mailadres in.');
        if (fd.invoiceEmail && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(fd.invoiceEmail)) problems.push('Het factuur e-mailadres lijkt niet te kloppen.');
        if (!fd.phone?.trim()) problems.push('Vul uw telefoonnummer in.');
        if (!fd.street?.trim() || !fd.postcode?.trim() || !fd.city?.trim()) problems.push('Vul uw volledige adres in.');
        if ((fd.password || '').length < 8) problems.push('Kies een wachtwoord van minimaal 8 tekens.');
        if (fd.password !== fd.password2) problems.push('De twee wachtwoorden zijn niet gelijk.');
        if (!fd.terms) problems.push('U moet akkoord gaan met de voorwaarden en het privacybeleid.');
        if (problems.length) {
          err.innerHTML = `<div class="notice notice--error"><div>${problems.map((p) => `• ${p}`).join('<br>')}</div></div>`;
          err.scrollIntoView({ block: 'center', behavior: 'smooth' });
          return;
        }
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true; btn.textContent = 'Account wordt aangemaakt…';
        err.innerHTML = '';
        try {
          await api.register({ ...fd, displayCode: state.pendingDisplayCode });
          await refreshProfile();
          toast('Uw account is aangemaakt.');
          navigate('/home', { replace: true });
        } catch (ex) {
          err.innerHTML = `<div class="notice notice--error">${ex.message}</div>`;
          btn.disabled = false; btn.textContent = 'Account aanmaken';
        }
      });
    },
  };
}
