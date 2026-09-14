/* Productcatalogus met categorieën en zoeken. */
import { api } from '../api.js';
import { addToCart } from '../store.js';
import { navigate } from '../router.js';
import { appbar, productCard, empty, icon, toast } from '../ui.js';
import { escapeHtml } from '../format.js';

export default async function producten({ query }) {
  const actieveCat = query.categorie || null;
  const zoek = query.q || '';
  const [cats, items] = await Promise.all([
    api.categories(),
    api.products({ categoryId: actieveCat, q: zoek }),
  ]);

  return {
    html: `
    ${appbar({ title: 'Producten' })}
    <div class="screen screen--flush">
      <div style="padding:12px 16px 4px">
        <label class="field">
          <span class="sr-only">Zoeken</span>
          <input class="input" id="zoek" type="search" placeholder="Zoek op naam, SKU of EAN" value="${escapeHtml(zoek)}" autocomplete="off">
        </label>
      </div>
      <div class="chips">
        <button class="chip ${!actieveCat ? 'is-active' : ''}" data-cat="">Alles</button>
        ${cats.map((c) => `<button class="chip ${actieveCat === c.id ? 'is-active' : ''}" data-cat="${c.id}">${escapeHtml(c.name)}</button>`).join('')}
      </div>
      <div style="padding:8px 16px 0">
        ${items.length
          ? `<p style="font-size:12.5px;color:var(--text-soft);margin-bottom:10px">${items.length} product${items.length === 1 ? '' : 'en'} · prijzen zijn inkoopprijzen excl. btw</p>
             <div class="product-grid">${items.map(productCard).join('')}</div>`
          : empty('Geen producten gevonden', 'Pas uw zoekopdracht of categorie aan.')}
      </div>
    </div>`,
    mount(root) {
      const zoekveld = root.querySelector('#zoek');
      let t;
      zoekveld.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const p = new URLSearchParams();
          if (actieveCat) p.set('categorie', actieveCat);
          if (zoekveld.value.trim()) p.set('q', zoekveld.value.trim());
          navigate(`/producten${p.toString() ? `?${p}` : ''}`, { replace: true });
        }, 350);
      });
      root.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-cat]');
        if (chip) {
          const p = new URLSearchParams();
          if (chip.dataset.cat) p.set('categorie', chip.dataset.cat);
          if (zoek) p.set('q', zoek);
          navigate(`/producten${p.toString() ? `?${p}` : ''}`);
          return;
        }
        const add = e.target.closest('[data-add]');
        if (add) { addToCart(add.dataset.add, 1); toast('Toegevoegd aan winkelmandje'); return; }
        const card = e.target.closest('[data-product]');
        if (card) navigate(`/product/${card.dataset.product}`);
      });
    },
  };
}
