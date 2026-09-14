/* Home — welkom, recente bestelling, snel opnieuw bestellen, populaire
   producten, categorieën en display-informatie. */
import { api } from '../api.js';
import { state, addToCart, reorder } from '../store.js';
import { navigate } from '../router.js';
import { appbar, productCard, icon, toast } from '../ui.js';
import { euro, datum, escapeHtml, statusKleur, T } from '../format.js';

export default async function home() {
  const [cats, populair, orders] = await Promise.all([
    api.categories(),
    api.products().then((ps) => ps.filter((p) => p.popular).slice(0, 6)),
    api.orders(),
  ]);
  const laatste = orders[0] || null;
  const p = state.profile;

  return {
    html: `
    ${appbar({ subtitle: 'Zakelijk bestellen', right: `<button class="appbar__btn" data-to="/qr">${'<span style="width:15px;height:15px;display:inline-flex">' + icon.qr + '</span>'} QR</button>` })}
    <div class="screen">
      <div class="stack">
        <div>
          <h1>Welkom bij GRABNGO</h1>
          <p style="color:var(--text-muted);font-size:14px;margin-top:4px">${escapeHtml(p?.company?.name || '')}</p>
        </div>

        ${p?.display ? `<div class="card" style="border-color:var(--gng-black)">
          <div class="row-between">
            <div>
              <div class="section-title">Uw display</div>
              <div style="font-weight:700;margin-top:4px">${escapeHtml(p.display.name || p.display.code)}</div>
              <div style="font-size:12.5px;color:var(--text-muted)">Code ${escapeHtml(p.display.code)}${p.display.location?.name ? ` · ${escapeHtml(p.display.location.name)}` : ''}</div>
            </div>
            <span style="width:26px;height:26px;color:var(--gng-red)">${icon.qr}</span>
          </div>
        </div>` : ''}

        ${laatste ? `<div class="card">
          <div class="card__head">
            <div class="card__title">Laatste bestelling</div>
            <span class="tag ${statusKleur(laatste.status)}">${T.orderStatus[laatste.status] || laatste.status}</span>
          </div>
          <div class="row-between" style="font-size:13.5px;color:var(--text-muted)">
            <span>${escapeHtml(laatste.number)}</span><span>${datum(laatste.createdAt)}</span>
          </div>
          <div class="row-between" style="margin-top:6px">
            <span style="font-size:13.5px;color:var(--text-muted)">${laatste.items.length} product(en)</span>
            <strong>${euro(laatste.totalIncVat)}</strong>
          </div>
          <div class="row" style="margin-top:14px;gap:8px">
            <button class="btn btn--dark btn--sm grow" data-reorder="${escapeHtml(laatste.id)}">Opnieuw bestellen</button>
            <button class="btn btn--outline btn--sm" data-to="/bestelling/${escapeHtml(laatste.id)}">Bekijken</button>
          </div>
        </div>` : `<div class="card center">
          <div style="width:40px;height:40px;margin:0 auto 10px;color:var(--text-soft)">${icon.box}</div>
          <div style="font-weight:700">Nog geen bestellingen</div>
          <p style="font-size:13px;color:var(--text-muted);margin:6px 0 14px">Bekijk het assortiment en plaats uw eerste zakelijke bestelling.</p>
          <button class="btn btn--primary btn--sm btn--block" data-to="/producten">Naar de producten</button>
        </div>`}

        <div>
          <div class="row-between" style="margin-bottom:10px">
            <div class="section-title">Categorieën</div>
            <button class="btn btn--ghost btn--sm" data-to="/producten">Alles bekijken</button>
          </div>
          <div class="list">
            ${cats.map((c) => `<button class="list__item" data-to="/producten?categorie=${c.id}">
              <span class="grow"><span class="list__title">${escapeHtml(c.name)}</span></span>
              <span class="list__chev">${icon.chev}</span>
            </button>`).join('')}
          </div>
        </div>

        ${populair.length ? `<div>
          <div class="row-between" style="margin-bottom:10px">
            <div class="section-title">Veelbestelde producten</div>
          </div>
          <div class="product-grid">${populair.map(productCard).join('')}</div>
        </div>` : ''}
      </div>
    </div>`,
    mount(root) {
      root.addEventListener('click', async (e) => {
        const add = e.target.closest('[data-add]');
        if (add) { addToCart(add.dataset.add, 1); toast('Toegevoegd aan winkelmandje'); return; }
        const card = e.target.closest('[data-product]');
        if (card) { navigate(`/product/${card.dataset.product}`); return; }
        const ro = e.target.closest('[data-reorder]');
        if (ro) {
          ro.disabled = true; ro.textContent = 'Bezig…';
          const order = await api.order(ro.dataset.reorder);
          await reorder(order);
          toast('Vorige bestelling staat in uw mandje');
          navigate('/mand');
        }
      });
    },
  };
}
