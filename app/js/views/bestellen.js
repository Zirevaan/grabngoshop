/* Bestelling controleren en plaatsen: bedrijfsgegevens, afleveradres,
   factuurgegevens en de volledige order vóór bevestiging. */
import { api } from '../api.js';
import { state, cartDetails, clearCart } from '../store.js';
import { navigate } from '../router.js';
import { appbar, notice } from '../ui.js';
import { euro, escapeHtml } from '../format.js';

/* Eén sleutel per bestelpoging voorkomt dubbele orders bij netwerkproblemen. */
const IDEM_KEY = 'gng.idem.v1';
const idem = () => {
  let k = sessionStorage.getItem(IDEM_KEY);
  if (!k) { k = `idem_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`; sessionStorage.setItem(IDEM_KEY, k); }
  return k;
};

export default async function bestellen() {
  const c = await cartDetails();
  if (!c.lines.length) { navigate('/mand', { replace: true }); return; }
  const p = state.profile;
  const a = p.company.address || {};

  const adresBlok = (titel, obj, extra = '') => `<div class="card">
    <div class="card__head"><div class="card__title">${titel}</div>
      <button class="btn btn--ghost btn--sm" data-to="/account/bedrijf">Wijzigen</button></div>
    <div style="font-size:13.5px;color:var(--text-muted);line-height:1.7">
      ${escapeHtml(p.company.name)}<br>
      ${escapeHtml(obj.street || '')}<br>
      ${escapeHtml(obj.postcode || '')} ${escapeHtml(obj.city || '')}<br>
      ${escapeHtml(obj.country || '')}
      ${extra}
    </div></div>`;

  return {
    html: `
    ${appbar({ title: 'Bestelling controleren', back: true })}
    <div class="screen" style="padding-bottom:calc(var(--nav-h) + 110px)">
      <div class="stack">
        ${adresBlok('Afleveradres', a)}
        ${adresBlok('Factuurgegevens', a, `<br><br>Factuur-e-mail: ${escapeHtml(p.company.invoiceEmail || p.user.email)}
          ${p.company.kvk ? `<br>KvK: ${escapeHtml(p.company.kvk)}` : ''}
          ${p.company.vatNumber ? `<br>Btw: ${escapeHtml(p.company.vatNumber)}` : ''}`)}

        ${p.display ? `<div class="card"><div class="card__title" style="margin-bottom:6px">Gekoppeld display</div>
          <div style="font-size:13.5px;color:var(--text-muted)">${escapeHtml(p.display.name || p.display.code)} · code ${escapeHtml(p.display.code)}</div></div>` : ''}

        <div class="card card--pad-0">
          <div style="padding:16px 16px 0"><div class="card__title">Uw bestelling (${c.lines.length} regel${c.lines.length === 1 ? '' : 's'})</div></div>
          <div style="padding:12px 16px 4px">
            ${c.lines.map((l) => `<div class="row-between" style="padding:9px 0;border-bottom:1px dashed var(--border)">
              <div class="grow" style="font-size:13.5px">
                <div style="font-weight:600">${escapeHtml(l.product.name.replace(/^GrabNGo\s*/i, ''))}</div>
                <div style="color:var(--text-muted);font-size:12px">SKU ${escapeHtml(l.product.sku)} · ${l.qty} × ${euro(l.product.purchasePriceExVat)}</div>
              </div>
              <strong style="font-size:13.5px">${euro(l.lineTotalExVat)}</strong>
            </div>`).join('')}
          </div>
          <div style="padding:12px 16px 16px">
            <div class="totals">
              <div class="totals__row"><span>Subtotaal excl. btw</span><span>${euro(c.subtotalExVat)}</span></div>
              <div class="totals__row"><span>Verzendkosten excl. btw</span><span>${c.shippingUnknown ? 'Nog te bepalen' : euro(c.shippingExVat)}</span></div>
              <div class="totals__row"><span>Btw ${(c.vatRate * 100).toFixed(0)}%</span><span>${euro(c.vatAmount)}</span></div>
              <div class="totals__row totals__row--grand"><span>Totaal incl. btw</span><span>${euro(c.totalIncVat)}</span></div>
            </div>
          </div>
        </div>

        <label class="field">
          <span class="field__label">Opmerking bij de bestelling (optioneel)</span>
          <textarea class="textarea" id="note" placeholder="Bijvoorbeeld een afwijkend afleveradres of gewenste leverdatum"></textarea>
        </label>

        ${notice('info', '<div>Deze bestelling wordt op rekening geplaatst. U ontvangt de factuur per e-mail van Mobile Express B.V. <strong>Definitieve betaal- en leveringsvoorwaarden: NOG AAN TE LEVEREN.</strong></div>')}
        <div id="err"></div>
      </div>
    </div>

    <div class="actionbar">
      <div class="actionbar__inner">
        <div class="grow">
          <div class="price-label">Totaal incl. btw</div>
          <div style="font-size:18px;font-weight:800">${euro(c.totalIncVat)}</div>
        </div>
        <button class="btn btn--primary" id="plaats">Bestelling plaatsen</button>
      </div>
    </div>`,
    mount(root) {
      document.body.classList.add('has-actionbar');
      const btn = document.querySelector('#plaats');
      const err = root.querySelector('#err');
      btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = 'Bezig met plaatsen…';
        err.innerHTML = '';
        try {
          const order = await api.createOrder({
            items: c.lines.map((l) => ({ productId: l.productId, qty: l.qty })),
            deliveryAddress: p.company.address,
            invoice: { invoiceEmail: p.company.invoiceEmail || p.user.email },
            note: root.querySelector('#note').value.trim() || null,
            idempotencyKey: idem(),
          });
          sessionStorage.removeItem(IDEM_KEY);
          clearCart();
          document.body.classList.remove('has-actionbar');
          navigate(`/bevestiging/${order.id}`, { replace: true });
        } catch (ex) {
          err.innerHTML = `<div class="notice notice--error">${ex.message}</div>`;
          err.scrollIntoView({ block: 'center', behavior: 'smooth' });
          btn.disabled = false; btn.textContent = 'Bestelling plaatsen';
        }
      });
      window.addEventListener('hashchange', () => document.body.classList.remove('has-actionbar'), { once: true });
    },
  };
}
