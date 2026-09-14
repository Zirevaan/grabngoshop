/* QR-/displayflow. Een QR-link op de achterzijde van een GRABNGO-display
   verwijst naar /app/?display=CODE of /app/#/qr/CODE. */
import { api } from '../api.js';
import { state, setPendingDisplay, refreshProfile, isLoggedIn } from '../store.js';
import { navigate } from '../router.js';
import { appbar, notice, toast, icon } from '../ui.js';
import { escapeHtml } from '../format.js';

export default async function qr({ params }) {
  const code = (params.code || state.pendingDisplayCode || '').toUpperCase();
  const display = code ? await api.displayByCode(code) : null;
  if (code) setPendingDisplay(code);

  return {
    html: `
    ${appbar({ title: 'Bestellen via QR-code', back: true })}
    <div class="screen screen--plain">
      <div class="stack">
        <div class="card center">
          <div style="width:56px;height:56px;margin:0 auto 12px;color:var(--gng-red)">${icon.qr}</div>
          ${code
            ? (display
              ? `<h2>Display herkend</h2>
                 <p style="font-size:13.5px;color:var(--text-muted);margin-top:6px">
                   ${escapeHtml(display.name || display.code)}<br>Code ${escapeHtml(display.code)}
                   ${display.location?.name ? `<br>${escapeHtml(display.location.name)}` : ''}</p>`
              : `<h2>Code niet herkend</h2>
                 <p style="font-size:13.5px;color:var(--text-muted);margin-top:6px">De code <strong>${escapeHtml(code)}</strong> is niet bekend. Controleer de code op de achterzijde van uw display.</p>`)
            : `<h2>Scan de QR-code op uw display</h2>
               <p style="font-size:13.5px;color:var(--text-muted);margin-top:6px">Of vul hieronder de displaycode in die op de achterzijde van het GRABNGO-display staat.</p>`}
        </div>

        <form id="f" class="card stack">
          <label class="field">
            <span class="field__label">Displaycode</span>
            <input class="input" name="code" value="${escapeHtml(code)}" placeholder="Bijvoorbeeld GNG-DEMO-01" autocapitalize="characters">
          </label>
          <button class="btn btn--dark btn--block" type="submit">Code controleren</button>
        </form>

        ${display && isLoggedIn()
          ? `<button class="btn btn--primary btn--block" id="koppel">Dit display aan mijn account koppelen</button>`
          : ''}
        ${display && !isLoggedIn()
          ? `<div class="stack">
              <button class="btn btn--primary btn--block" data-to="/registreren">Account aanmaken voor dit display</button>
              <button class="btn btn--outline btn--block" data-to="/login">Ik heb al een account</button>
             </div>`
          : ''}

        ${notice('info', '<div>Elk GRABNGO-display heeft een eigen QR-code. Mobile Express B.V. koppelt de code aan uw locatie, zodat bestellingen automatisch bij het juiste display horen. <strong>Definitieve displaycodes per locatie: NOG AAN TE LEVEREN.</strong></div>')}
      </div>
    </div>`,
    mount(root) {
      root.querySelector('#f').addEventListener('submit', (e) => {
        e.preventDefault();
        const c = new FormData(e.target).get('code').trim().toUpperCase();
        if (c) navigate(`/qr/${encodeURIComponent(c)}`);
      });
      root.querySelector('#koppel')?.addEventListener('click', async (e) => {
        e.target.disabled = true; e.target.textContent = 'Bezig…';
        try {
          await api.linkCustomerToDisplay(code);
          await refreshProfile();
          setPendingDisplay(null);
          toast('Display gekoppeld aan uw account');
          navigate('/home');
        } catch (ex) {
          e.target.disabled = false; e.target.textContent = 'Dit display aan mijn account koppelen';
          toast(ex.message);
        }
      });
    },
  };
}
