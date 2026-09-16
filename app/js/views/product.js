/* Productdetail — echte foto, officiële naam, SKU, EAN, prijzen en
   displayinformatie. Ontbrekende gegevens worden expliciet gemarkeerd. */
import { api } from '../api.js';
import { addToCart } from '../store.js';
import { navigate } from '../router.js';
import { appbar, productImage, stepper, toast, notice } from '../ui.js';
import { euro, escapeHtml } from '../format.js';

export default async function product({ params }) {
  const p = await api.product(params.id);
  const cats = await api.categories();
  const cat = cats.find((c) => c.id === p.categoryId);

  return {
    html: `
    ${appbar({ title: 'Product', back: true })}
    <div class="screen screen--flush" style="padding-bottom:calc(var(--nav-h) + 110px)">
      <div style="background:#fff;border-bottom:1px solid var(--border)">
        <div class="detail-media">${productImage(p)}</div>
      </div>

      <div style="padding:16px">
        <div class="stack">
          <div>
            ${cat ? `<div class="tag tag--neutral">${escapeHtml(cat.name)}</div>` : ''}
            <h1 style="margin-top:8px">${escapeHtml(p.name)}</h1>
            ${p.variant ? `<p style="color:var(--text-muted);margin-top:4px">${escapeHtml(p.variant)}</p>` : ''}
          </div>

          <div class="card">
            <div class="row-between" style="align-items:flex-end">
              <div>
                <div class="price-label">Uw inkoopprijs excl. btw</div>
                <div style="font-size:27px;font-weight:800;letter-spacing:-.02em">${euro(p.purchasePriceExVat)}</div>
              </div>
              ${p.rrpIncVat ? `<div style="text-align:right">
                <div class="price-label">Adviesprijs incl. btw</div>
                <div style="font-size:17px;font-weight:700">${euro(p.rrpIncVat)}</div>
              </div>` : ''}
            </div>
            <p style="font-size:11.5px;color:var(--text-soft);margin-top:10px">
              U bepaalt zelf uw verkoopprijs. De adviesprijs is vrijblijvend.</p>
          </div>

          <div class="card">
            <div class="card__title" style="margin-bottom:10px">Productgegevens</div>
            <div class="kv"><span class="kv__k">SKU</span><span class="kv__v">${escapeHtml(p.sku)}</span></div>
            <div class="kv"><span class="kv__k">EAN</span><span class="kv__v">${p.ean ? escapeHtml(p.ean) : 'Niet beschikbaar'}</span></div>
            ${p.displayQtyPerShelf ? `<div class="kv"><span class="kv__k">Aantal per displayverdieping</span><span class="kv__v">${p.displayQtyPerShelf} stuks</span></div>` : ''}
            <div class="kv"><span class="kv__k">Omschrijving</span><span class="kv__v" style="max-width:60%">${
              p.description ? escapeHtml(p.description) : '<span style="color:var(--warn);font-weight:700">NOG AAN TE LEVEREN</span>'
            }</span></div>
          </div>

          ${p.imageNote ? notice('warn', `<div><strong>Foto te bevestigen.</strong><br>${escapeHtml(p.imageNote)}</div>`) : ''}
          ${p.dataFlag ? notice('warn', `<div><strong>Let op — te bevestigen gegevens.</strong><br>${escapeHtml(p.dataFlag)}</div>`) : ''}
          ${!p.description ? notice('info', '<div>De officiële productomschrijving wordt door Mobile Express B.V. aangeleverd en verschijnt hier zodra deze in de backend staat.</div>') : ''}
        </div>
      </div>
    </div>

    <div class="actionbar">
      <div class="actionbar__inner">
        ${stepper(1, 'id="qty"')}
        <button class="btn btn--primary grow" id="add">Toevoegen</button>
      </div>
    </div>`,
    mount(root) {
      document.body.classList.add('has-actionbar');
      const st = root.querySelector('#qty');
      const input = st.querySelector('input');
      st.addEventListener('click', (e) => {
        const b = e.target.closest('[data-step]');
        if (!b) return;
        input.value = Math.max(1, Math.min(999, (parseInt(input.value, 10) || 1) + Number(b.dataset.step)));
      });
      root.querySelector('#add').addEventListener('click', () => {
        const q = Math.max(1, parseInt(input.value, 10) || 1);
        addToCart(p.id, q);
        toast(`${q}× toegevoegd aan uw mandje`);
        navigate('/producten');
      });
      window.addEventListener('hashchange', () => document.body.classList.remove('has-actionbar'), { once: true });
    },
  };
}
