/* Startscherm — logo, korte zakelijke introductie, inloggen, account aanmaken
   en bestellen via QR-code. */
import { CONFIG } from '../config.js';
import { logo, icon } from '../ui.js';
import { state } from '../store.js';

export default async function welkom() {
  const display = state.pendingDisplayCode;
  return {
    html: `
    <section class="hero">
      ${logo('light', 'hero__logo')}
      <div class="hero__usp">${CONFIG.usp}</div>
      <p class="hero__text">Het zakelijke bestelportaal van Mobile Express B.V. Bekijk het GRABNGO-assortiment,
        bestel voor uw winkel of locatie en herhaal eerdere bestellingen met één druk op de knop.</p>
    </section>

    <div class="screen screen--plain" style="padding-top:24px">
      ${display ? `<div class="notice notice--info" style="margin-bottom:16px">
        <div><strong>Display ${display} herkend.</strong><br>Na het inloggen of registreren koppelen we uw account aan dit display.</div></div>` : ''}

      <div class="stack">
        <button class="btn btn--primary btn--block" data-to="/login">Inloggen</button>
        <button class="btn btn--outline btn--block" data-to="/registreren">Account aanmaken</button>
        <button class="btn btn--ghost btn--block" data-to="/qr" style="display:flex;gap:8px">
          <span style="width:20px;height:20px;display:inline-flex">${icon.qr}</span> Bestellen via QR-code
        </button>
      </div>

      <div class="divider"></div>

      <div class="stack-sm">
        <div class="section-title">Voor zakelijke klanten</div>
        <div class="card">
          <div class="stack-sm" style="font-size:13.5px;color:var(--text-muted)">
            <div class="row"><span class="status-dot" style="background:var(--gng-red)"></span><span>Inkoopprijzen excl. btw én adviesprijzen incl. btw</span></div>
            <div class="row"><span class="status-dot" style="background:var(--gng-red)"></span><span>Bestellen op rekening, factuur per e-mail</span></div>
            <div class="row"><span class="status-dot" style="background:var(--gng-red)"></span><span>Eerdere bestellingen in één actie herhalen</span></div>
            <div class="row"><span class="status-dot" style="background:var(--gng-red)"></span><span>Gekoppeld aan uw GRABNGO-display of locatie</span></div>
          </div>
        </div>
      </div>

      <p class="center" style="font-size:11.5px;color:var(--text-soft);margin-top:28px">
        GRABNGO is een merk van Mobile Express B.V.<br>
        <a data-to="/info/voorwaarden" style="text-decoration:underline">Algemene voorwaarden</a> ·
        <a data-to="/info/privacy" style="text-decoration:underline">Privacybeleid</a>
      </p>
    </div>`,
  };
}
