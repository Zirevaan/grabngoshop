/* Orderbevestiging na het plaatsen van een bestelling. */
import { api } from '../api.js';
import { appbar } from '../ui.js';
import { euro, datum, escapeHtml } from '../format.js';

export default async function bevestiging({ params }) {
  const o = await api.order(params.id);
  return {
    html: `
    ${appbar({ title: 'Bestelling geplaatst' })}
    <div class="screen">
      <div class="card center" style="border-color:var(--ok);background:var(--ok-bg)">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--ok);color:#fff;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
        </div>
        <h2 style="color:var(--ok)">Bedankt voor uw bestelling</h2>
        <p style="font-size:13.5px;color:var(--ok);margin-top:6px">Ordernummer <strong>${escapeHtml(o.number)}</strong></p>
      </div>

      <div class="stack" style="margin-top:16px">
        <div class="card">
          <div class="kv"><span class="kv__k">Geplaatst op</span><span class="kv__v">${datum(o.createdAt, true)}</span></div>
          <div class="kv"><span class="kv__k">Bedrijf</span><span class="kv__v">${escapeHtml(o.companyName)}</span></div>
          <div class="kv"><span class="kv__k">Bevestiging naar</span><span class="kv__v">${escapeHtml(o.email)}</span></div>
          <div class="kv"><span class="kv__k">Factuur naar</span><span class="kv__v">${escapeHtml(o.invoiceEmail || o.email)}</span></div>
          <div class="kv"><span class="kv__k">Totaal incl. btw</span><span class="kv__v">${euro(o.totalIncVat)}</span></div>
        </div>
        <div class="notice notice--info"><div>U ontvangt een orderbevestiging per e-mail. Mobile Express B.V. neemt de bestelling in behandeling en werkt de status bij in uw orderhistorie.</div></div>
        <button class="btn btn--dark btn--block" data-to="/bestelling/${escapeHtml(o.id)}">Bestelling bekijken</button>
        <button class="btn btn--outline btn--block" data-to="/home">Terug naar home</button>
      </div>
    </div>`,
  };
}
