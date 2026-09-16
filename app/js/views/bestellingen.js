/* Orderhistorie met status en 'opnieuw bestellen'. */
import { api } from '../api.js';
import { reorder } from '../store.js';
import { navigate } from '../router.js';
import { appbar, empty, toast, icon } from '../ui.js';
import { euro, datum, escapeHtml, statusKleur, T } from '../format.js';

export default async function bestellingen() {
  const orders = await api.orders();
  if (!orders.length) {
    return {
      html: `${appbar({ title: 'Bestellingen' })}
      <div class="screen">${empty('Nog geen bestellingen', 'Zodra u een bestelling plaatst, vindt u deze hier terug.',
        '<button class="btn btn--primary" data-to="/producten">Naar de producten</button>')}</div>`,
    };
  }
  return {
    html: `
    ${appbar({ title: 'Bestellingen' })}
    <div class="screen">
      <div class="stack">
        ${orders.map((o) => `<div class="card" data-order="${escapeHtml(o.id)}">
          <div class="row-between">
            <div>
              <div style="font-weight:700">${escapeHtml(o.number)}</div>
              <div style="font-size:12.5px;color:var(--text-muted)">${datum(o.createdAt)} · ${o.items.length} regel${o.items.length === 1 ? '' : 's'}</div>
            </div>
            <span class="tag ${statusKleur(o.status)}">${T.orderStatus[o.status] || o.status}</span>
          </div>
          <div class="row-between" style="margin-top:12px">
            <span style="font-size:13px;color:var(--text-muted)">Totaal incl. btw</span>
            <strong>${euro(o.totalIncVat)}</strong>
          </div>
          <div class="row" style="margin-top:14px;gap:8px">
            <button class="btn btn--dark btn--sm grow" data-reorder="${escapeHtml(o.id)}">Opnieuw bestellen</button>
            <button class="btn btn--outline btn--sm" data-open="${escapeHtml(o.id)}">Details ${'<span style="width:14px;height:14px;display:inline-flex">' + icon.chev + '</span>'}</button>
          </div>
        </div>`).join('')}
      </div>
    </div>`,
    mount(root) {
      root.addEventListener('click', async (e) => {
        const ro = e.target.closest('[data-reorder]');
        if (ro) {
          ro.disabled = true; ro.textContent = 'Bezig…';
          const order = await api.order(ro.dataset.reorder);
          const n = await reorder(order);
          toast(n ? 'Bestelling staat in uw mandje' : 'Deze producten zijn niet meer beschikbaar');
          navigate('/mand');
          return;
        }
        const open = e.target.closest('[data-open]');
        if (open) navigate(`/bestelling/${open.dataset.open}`);
      });
    },
  };
}
