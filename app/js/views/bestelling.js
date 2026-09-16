/* Orderdetail. */
import { api } from '../api.js';
import { reorder } from '../store.js';
import { navigate } from '../router.js';
import { appbar, productImage, toast } from '../ui.js';
import { euro, datum, escapeHtml, statusKleur, T } from '../format.js';

export default async function bestelling({ params }) {
  const o = await api.order(params.id);
  return {
    html: `
    ${appbar({ title: o.number, back: true })}
    <div class="screen">
      <div class="stack">
        <div class="card">
          <div class="row-between">
            <div>
              <div class="section-title">Status</div>
              <div style="margin-top:6px"><span class="tag ${statusKleur(o.status)}">${T.orderStatus[o.status] || o.status}</span></div>
            </div>
            <div style="text-align:right">
              <div class="section-title">Besteld op</div>
              <div style="font-size:13.5px;margin-top:6px">${datum(o.createdAt, true)}</div>
            </div>
          </div>
        </div>

        <div class="card card--pad-0">
          <div style="padding:16px 16px 4px"><div class="card__title">Producten</div></div>
          ${o.items.map((i) => `<div class="cartline">
            <div class="cartline__media">${productImage({ image: i.image, name: i.name })}</div>
            <div class="grow">
              <div style="font-size:13.5px;font-weight:700">${escapeHtml(i.name.replace(/^GrabNGo\s*/i, ''))}</div>
              <div style="font-size:12px;color:var(--text-muted)">SKU ${escapeHtml(i.sku)} · ${i.qty} × ${euro(i.unitPriceExVat)}</div>
            </div>
            <strong style="font-size:13.5px">${euro(i.lineTotalExVat)}</strong>
          </div>`).join('')}
          <div style="padding:14px 16px 18px">
            <div class="totals">
              <div class="totals__row"><span>Subtotaal excl. btw</span><span>${euro(o.subtotalExVat)}</span></div>
              <div class="totals__row"><span>Verzendkosten excl. btw</span><span>${euro(o.shippingExVat)}</span></div>
              <div class="totals__row"><span>Btw ${(o.vatRate * 100).toFixed(0)}%</span><span>${euro(o.vatAmount)}</span></div>
              <div class="totals__row totals__row--grand"><span>Totaal incl. btw</span><span>${euro(o.totalIncVat)}</span></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card__title" style="margin-bottom:10px">Gegevens</div>
          <div class="kv"><span class="kv__k">Bedrijf</span><span class="kv__v">${escapeHtml(o.companyName)}</span></div>
          <div class="kv"><span class="kv__k">Contactpersoon</span><span class="kv__v">${escapeHtml(o.contactName || '—')}</span></div>
          <div class="kv"><span class="kv__k">Afleveradres</span><span class="kv__v">${escapeHtml([o.deliveryAddress?.street, o.deliveryAddress?.postcode, o.deliveryAddress?.city].filter(Boolean).join(', ') || '—')}</span></div>
          <div class="kv"><span class="kv__k">Factuur-e-mail</span><span class="kv__v">${escapeHtml(o.invoiceEmail || o.email)}</span></div>
          ${o.note ? `<div class="kv"><span class="kv__k">Opmerking</span><span class="kv__v" style="max-width:60%">${escapeHtml(o.note)}</span></div>` : ''}
        </div>

        <button class="btn btn--primary btn--block" id="opnieuw">Opnieuw bestellen</button>
      </div>
    </div>`,
    mount(root) {
      root.querySelector('#opnieuw').addEventListener('click', async (e) => {
        e.target.disabled = true; e.target.textContent = 'Bezig…';
        const n = await reorder(o);
        toast(n ? 'Bestelling staat in uw mandje' : 'Deze producten zijn niet meer beschikbaar');
        navigate('/mand');
      });
    },
  };
}
