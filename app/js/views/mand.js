/* Winkelmandje — aantallen wijzigen, verwijderen, totalen excl./incl. btw. */
import { cartDetails, setQty, removeFromCart, clearCart } from '../store.js';
import { navigate } from '../router.js';
import { appbar, productImage, stepper, empty, notice, toast } from '../ui.js';
import { euro, escapeHtml } from '../format.js';

export default async function mand() {
  const c = await cartDetails();

  if (!c.lines.length) {
    return {
      html: `${appbar({ title: 'Winkelmandje' })}
      <div class="screen">${empty('Uw winkelmandje is leeg', 'Voeg producten toe uit het assortiment.',
        '<button class="btn btn--primary" data-to="/producten">Naar de producten</button>')}</div>`,
    };
  }

  return {
    html: `
    ${appbar({ title: 'Winkelmandje', right: '<button class="appbar__btn" id="leeg">Leegmaken</button>' })}
    <div class="screen" style="padding-bottom:calc(var(--nav-h) + 110px)">
      <div class="stack">
        <div class="card card--pad-0">
          ${c.lines.map((l) => `<div class="cartline" data-line="${escapeHtml(l.productId)}">
            <div class="cartline__media">${productImage(l.product)}</div>
            <div class="grow">
              <div style="font-size:13.5px;font-weight:700;line-height:1.35">${escapeHtml(l.product.name.replace(/^GrabNGo\s*/i, ''))}</div>
              <div style="font-size:12px;color:var(--text-muted)">SKU ${escapeHtml(l.product.sku)} · ${euro(l.product.purchasePriceExVat)} p/st excl. btw</div>
              <div class="row-between" style="margin-top:10px">
                ${stepper(l.qty)}
                <strong style="font-size:15px">${euro(l.lineTotalExVat)}</strong>
              </div>
              <button class="btn btn--ghost btn--sm" data-remove="${escapeHtml(l.productId)}" style="padding-left:0;color:#b03030">Verwijderen</button>
            </div>
          </div>`).join('')}
        </div>

        <div class="card">
          <div class="totals">
            <div class="totals__row"><span>Subtotaal excl. btw</span><span>${euro(c.subtotalExVat)}</span></div>
            <div class="totals__row"><span>Verzendkosten excl. btw</span><span>${c.shippingUnknown ? 'Nog te bepalen' : euro(c.shippingExVat)}</span></div>
            <div class="totals__row"><span>Btw ${(c.vatRate * 100).toFixed(0)}%</span><span>${euro(c.vatAmount)}</span></div>
            <div class="totals__row totals__row--grand"><span>Totaal incl. btw</span><span>${euro(c.totalIncVat)}</span></div>
          </div>
        </div>

        ${c.shippingUnknown ? notice('warn', '<div><strong>Verzendkosten NOG AAN TE LEVEREN.</strong><br>Zodra Mobile Express B.V. de verzend- en leveringsvoorwaarden instelt, worden deze automatisch in het totaal meegenomen.</div>') : ''}
      </div>
    </div>

    <div class="actionbar">
      <div class="actionbar__inner">
        <div class="grow">
          <div class="price-label">Totaal incl. btw</div>
          <div style="font-size:18px;font-weight:800">${euro(c.totalIncVat)}</div>
        </div>
        <button class="btn btn--primary" id="verder">Bestelling controleren</button>
      </div>
    </div>`,
    mount(root) {
      document.body.classList.add('has-actionbar');
      root.addEventListener('click', (e) => {
        const step = e.target.closest('[data-step]');
        if (step) {
          const line = step.closest('[data-line]');
          const input = line.querySelector('.stepper input');
          setQty(line.dataset.line, (parseInt(input.value, 10) || 0) + Number(step.dataset.step));
          window.dispatchEvent(new Event('gng:rerender'));
          return;
        }
        const rem = e.target.closest('[data-remove]');
        if (rem) { removeFromCart(rem.dataset.remove); toast('Product verwijderd'); window.dispatchEvent(new Event('gng:rerender')); return; }
        if (e.target.closest('#leeg')) { clearCart(); window.dispatchEvent(new Event('gng:rerender')); return; }
        if (e.target.closest('#verder')) navigate('/bestellen');
      });
      root.addEventListener('change', (e) => {
        if (!e.target.matches('.stepper input')) return;
        const line = e.target.closest('[data-line]');
        setQty(line.dataset.line, parseInt(e.target.value, 10) || 0);
        window.dispatchEvent(new Event('gng:rerender'));
      });
      window.addEventListener('hashchange', () => document.body.classList.remove('has-actionbar'), { once: true });
    },
  };
}
