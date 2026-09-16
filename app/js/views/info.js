/* Juridische en informatieve pagina's. De definitieve teksten worden door
   Mobile Express B.V. aangeleverd/goedgekeurd — hier staan geen verzonnen
   juridische claims. */
import { state } from '../store.js';
import { appbar, notice } from '../ui.js';
import { escapeHtml } from '../format.js';

const PAGINAS = {
  voorwaarden: {
    titel: 'Algemene voorwaarden',
    body: `<p>De algemene voorwaarden van Mobile Express B.V. zijn van toepassing op alle zakelijke
      bestellingen via de GRABNGO-app.</p>`,
    ontbreekt: 'De definitieve tekst van de algemene voorwaarden wordt door Mobile Express B.V. aangeleverd en goedgekeurd.',
    settingsKey: 'termsUrl',
  },
  privacy: {
    titel: 'Privacybeleid',
    body: `<p>In het privacybeleid legt Mobile Express B.V. vast welke gegevens worden verwerkt bij
      registratie en bestellen, met welk doel en hoe lang ze worden bewaard.</p>`,
    ontbreekt: 'De definitieve tekst van het privacybeleid wordt door Mobile Express B.V. aangeleverd en goedgekeurd.',
    settingsKey: 'privacyUrl',
  },
  gegevens: {
    titel: 'Mijn gegevens (AVG)',
    body: `<p>U kunt uw gegevens in de app zelf bekijken en wijzigen via Account. Wilt u een
      kopie van uw gegevens ontvangen of uw account laten verwijderen? Dien dan een verzoek in
      bij Mobile Express B.V.</p>
      <p style="margin-top:10px">Bestelgegevens die nodig zijn voor de administratie en facturatie kunnen wettelijk
      bewaard moeten blijven; Mobile Express B.V. bevestigt de exacte bewaartermijnen in het privacybeleid.</p>`,
    ontbreekt: 'Het contactadres voor AVG-verzoeken wordt door Mobile Express B.V. aangeleverd.',
  },
  contact: {
    titel: 'Contact & support',
    body: `<p>Vragen over een bestelling, een display of uw account? Neem contact op met
      Mobile Express B.V.</p>`,
    ontbreekt: 'Zakelijke support- en contactgegevens (e-mailadres en telefoonnummer) worden door Mobile Express B.V. aangeleverd.',
  },
};

export default async function info({ params }) {
  const p = PAGINAS[params.pagina];
  if (!p) return { html: `${appbar({ title: 'Informatie', back: true })}<div class="screen"><p>Deze pagina bestaat niet.</p></div>` };
  const s = state.settings || {};
  const url = p.settingsKey ? s[p.settingsKey] : null;
  const support = params.pagina === 'contact'
    ? [s.supportEmail && `E-mail: ${escapeHtml(s.supportEmail)}`, s.supportPhone && `Telefoon: ${escapeHtml(s.supportPhone)}`].filter(Boolean).join('<br>')
    : '';

  return {
    html: `
    ${appbar({ title: p.titel, back: true })}
    <div class="screen">
      <div class="stack">
        <div class="card" style="font-size:14px;color:var(--text-muted);line-height:1.7">${p.body}
          ${support ? `<div style="margin-top:12px;color:var(--text)">${support}</div>` : ''}
          ${url ? `<div style="margin-top:12px"><a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="text-decoration:underline">Volledige tekst openen</a></div>` : ''}
        </div>
        ${notice('warn', `<div><strong>NOG AAN TE LEVEREN.</strong><br>${p.ontbreekt}</div>`)}
      </div>
    </div>`,
  };
}
