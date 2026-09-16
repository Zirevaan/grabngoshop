/* Inloggen. */
import { api } from '../api.js';
import { refreshProfile, state } from '../store.js';
import { navigate } from '../router.js';
import { appbar, field, toast } from '../ui.js';

export default async function login({ query }) {
  return {
    html: `
    ${appbar({ title: 'Inloggen', back: true })}
    <div class="screen screen--plain">
      <div class="stack">
        <p style="color:var(--text-muted);font-size:14px">Log in met het e-mailadres van uw zakelijke account.</p>
        <form id="f" class="stack" novalidate>
          ${field({ name: 'email', label: 'E-mailadres', type: 'email', required: true, autocomplete: 'username' })}
          ${field({ name: 'password', label: 'Wachtwoord', type: 'password', required: true, autocomplete: 'current-password' })}
          <div id="err"></div>
          <button class="btn btn--primary btn--block" type="submit">Inloggen</button>
        </form>
        <button class="btn btn--ghost btn--block" data-to="/registreren">Nog geen account? Registreer uw bedrijf</button>
      </div>
    </div>`,
    mount(root) {
      const form = root.querySelector('#f');
      const err = root.querySelector('#err');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type=submit]');
        const fd = new FormData(form);
        err.innerHTML = '';
        btn.disabled = true; btn.textContent = 'Bezig met inloggen…';
        try {
          await api.login(fd.get('email'), fd.get('password'));
          await refreshProfile();
          if (state.pendingDisplayCode) {
            try { await api.linkCustomerToDisplay(state.pendingDisplayCode); await refreshProfile(); } catch { /* koppeling later mogelijk via Account */ }
          }
          toast('Welkom terug.');
          navigate(query.next || '/home', { replace: true });
        } catch (ex) {
          err.innerHTML = `<div class="notice notice--error">${ex.message}</div>`;
          btn.disabled = false; btn.textContent = 'Inloggen';
        }
      });
    },
  };
}
