/* ==========================================================================
   GRABNGO Admin — schermen per module.
   Iedere sectie levert render(db, h) en optioneel mount(el, db, ctx).
   ========================================================================== */
import { euro, datum, datumKort, escapeHtml, statusKleur, T, dagenGeleden } from '/app/js/format.js';

/* ---------------- generieke bouwstenen ---------------- */
const top = (titel, sub, acties = '') => `
  <div class="topbar"><div><h1>${escapeHtml(titel)}</h1><p>${escapeHtml(sub)}</p></div>
  <div class="toolbar">${acties}</div></div>`;

const panel = (titel, body, acties = '', flush = false) => `
  <section class="panel">
    <div class="panel__head"><div class="panel__title">${escapeHtml(titel)}</div><div class="toolbar">${acties}</div></div>
    <div class="panel__body ${flush ? 'panel__body--flush' : ''}">${body}</div>
  </section>`;

const tabel = (kop, rijen) => `<div class="table-wrap"><table>
  <thead><tr>${kop.map((k) => `<th class="${k.right ? 't-right' : ''}">${escapeHtml(k.label ?? k)}</th>`).join('')}</tr></thead>
  <tbody>${rijen || `<tr><td colspan="${kop.length}" style="color:var(--text-soft);padding:26px;text-align:center">Nog geen gegevens.</td></tr>`}</tbody>
</table></div>`;

const veld = (naam, label, value = '', type = 'text', extra = '') => `
  <label class="field"><span class="field__label">${escapeHtml(label)}</span>
    <input class="input" name="${naam}" type="${type}" value="${escapeHtml(value ?? '')}" ${extra}></label>`;

const klantNaam = (db, customerId) => {
  const c = db.customers.find((x) => x.id === customerId);
  return db.companies.find((x) => x.id === c?.companyId)?.name || '—';
};

const omzetVan = (orders) => orders.filter((o) => o.status !== 'geannuleerd')
  .reduce((s, o) => s + o.subtotalExVat, 0);

/* ==========================================================================
   Dashboard
   ========================================================================== */
const dashboard = {
  async render(db) {
    const orders = db.orders;
    const maand = orders.filter((o) => new Date(o.createdAt) >= new Date(Date.now() - 30 * 86400000));
    const nieuweKlanten = db.customers.filter((c) => new Date(c.createdAt) >= new Date(Date.now() - 30 * 86400000));
    const openstaand = orders.filter((o) => ['nieuw', 'in_behandeling'].includes(o.status));
    const drempel = db.settings.reorderReminderDays ?? 60;

    const verkoopkansen = db.customers.filter((c) => {
      const d = dagenGeleden(c.lastOrderAt || c.createdAt);
      return d !== null && d >= drempel;
    });

    const bestsellers = Object.values(orders.flatMap((o) => o.items).reduce((acc, i) => {
      acc[i.sku] = acc[i.sku] || { sku: i.sku, name: i.name, qty: 0, omzet: 0 };
      acc[i.sku].qty += i.qty; acc[i.sku].omzet += i.lineTotalExVat;
      return acc;
    }, {})).sort((a, b) => b.qty - a.qty).slice(0, 5);

    const ontbrekend = db.products.filter((p) => !p.description || !p.image).length;
    const fotoTeBevestigen = db.products.filter((p) => p.imageStatus === 'TE_BEVESTIGEN').length;
    const conflicten = db.products.filter((p) => p.dataFlag).length;

    return `
    ${top('Dashboard', 'Overzicht van klanten, orders en assortiment.')}
    <div class="kpis">
      <div class="kpi"><div class="kpi__label">Orders (30 dagen)</div><div class="kpi__value">${maand.length}</div><div class="kpi__sub">${orders.length} totaal</div></div>
      <div class="kpi"><div class="kpi__label">Omzet excl. btw (30 d.)</div><div class="kpi__value">${euro(omzetVan(maand))}</div><div class="kpi__sub">${euro(omzetVan(orders))} totaal</div></div>
      <div class="kpi"><div class="kpi__label">Openstaande orders</div><div class="kpi__value">${openstaand.length}</div><div class="kpi__sub">Nieuw of in behandeling</div></div>
      <div class="kpi"><div class="kpi__label">Nieuwe klanten (30 d.)</div><div class="kpi__value">${nieuweKlanten.length}</div><div class="kpi__sub">${db.customers.length} klanten totaal</div></div>
      <div class="kpi"><div class="kpi__label">Verkoopkansen</div><div class="kpi__value">${verkoopkansen.length}</div><div class="kpi__sub">Geen order in ${drempel} dagen</div></div>
      <div class="kpi"><div class="kpi__label">Actieve displays</div><div class="kpi__value">${db.displays.filter((d) => d.active).length}</div><div class="kpi__sub">${db.displays.filter((d) => d.customerId).length} gekoppeld aan een klant</div></div>
    </div>

    ${(ontbrekend || conflicten || fotoTeBevestigen) ? `<div class="notice notice--warn" style="margin-bottom:20px"><div>
      <strong>Openstaande productgegevens.</strong><br>
      ${ontbrekend ? `${ontbrekend} product(en) missen een definitieve omschrijving of foto.<br>` : ''}
      ${fotoTeBevestigen ? `${fotoTeBevestigen} product(en) gebruiken tijdelijk een foto die voor meerdere SKU's is aangeleverd en bevestigd moet worden.<br>` : ''}
      ${conflicten ? `${conflicten} product(en) hebben een catalogusgegeven dat door Mobile Express B.V. bevestigd moet worden.` : ''}
    </div></div>` : ''}

    ${panel('Recentste orders', tabel(
      ['Order', 'Klant', 'Datum', 'Status', { label: 'Totaal excl. btw', right: true }],
      db.orders.slice(0, 8).map((o) => `<tr>
        <td><strong>${escapeHtml(o.number)}</strong></td>
        <td>${escapeHtml(o.companyName)}</td>
        <td>${datumKort(o.createdAt)}</td>
        <td><span class="tag ${statusKleur(o.status)}">${T.orderStatus[o.status] || o.status}</span></td>
        <td class="t-right t-num">${euro(o.subtotalExVat)}</td></tr>`).join('')
    ), '<button class="btn btn--outline btn--sm" data-ga="orders">Alle orders</button>', true)}

    ${panel('Bestsellers', tabel(
      ['SKU', 'Product', { label: 'Aantal', right: true }, { label: 'Omzet excl. btw', right: true }],
      bestsellers.map((b) => `<tr><td>${escapeHtml(b.sku)}</td><td>${escapeHtml(b.name)}</td>
        <td class="t-right t-num">${b.qty}</td><td class="t-right t-num">${euro(b.omzet)}</td></tr>`).join('')
    ), '', true)}

    ${panel('Mogelijke herhaalbestellingen', tabel(
      ['Klant', 'Laatste order', { label: 'Dagen geleden', right: true }],
      verkoopkansen.slice(0, 10).map((c) => `<tr>
        <td>${escapeHtml(klantNaam(db, c.id))}</td>
        <td>${c.lastOrderAt ? datumKort(c.lastOrderAt) : 'Nog nooit besteld'}</td>
        <td class="t-right t-num">${dagenGeleden(c.lastOrderAt || c.createdAt)}</td></tr>`).join('')
    ), '', true)}`;
  },
  mount(el) {
    el.querySelectorAll('[data-ga]').forEach((b) => b.addEventListener('click', () => { location.hash = b.dataset.ga; }));
  },
};

/* ==========================================================================
   Orders
   ========================================================================== */
const orders = {
  async render(db) {
    const st = db.settings.orderStatuses;
    return `
    ${top('Orders', 'Filteren, openen, status aanpassen en exporteren.',
      `<select class="select" id="fstatus"><option value="">Alle statussen</option>
        ${st.map((s) => `<option value="${s}">${T.orderStatus[s]}</option>`).join('')}</select>
       <input class="input" id="fzoek" placeholder="Zoek op ordernummer of klant">
       <button class="btn btn--outline btn--sm" id="export">Exporteren (CSV)</button>`)}
    ${panel('Alle orders', `<div id="rows">${orders.rows(db, '', '')}</div>`, '', true)}`;
  },
  rows(db, status, q) {
    const t = q.toLowerCase();
    const list = db.orders
      .filter((o) => !status || o.status === status)
      .filter((o) => !t || o.number.toLowerCase().includes(t) || o.companyName.toLowerCase().includes(t));
    return tabel(
      ['Order', 'Klant', 'Datum', 'Regels', { label: 'Excl. btw', right: true }, { label: 'Incl. btw', right: true }, 'Status', ''],
      list.map((o) => `<tr>
        <td><strong>${escapeHtml(o.number)}</strong></td>
        <td>${escapeHtml(o.companyName)}</td>
        <td>${datumKort(o.createdAt)}</td>
        <td class="t-num">${o.items.length}</td>
        <td class="t-right t-num">${euro(o.subtotalExVat)}</td>
        <td class="t-right t-num">${euro(o.totalIncVat)}</td>
        <td><span class="tag ${statusKleur(o.status)}">${T.orderStatus[o.status] || o.status}</span></td>
        <td class="t-right"><button class="btn btn--outline btn--sm" data-order="${escapeHtml(o.id)}">Openen</button></td>
      </tr>`).join('')
    );
  },
  mount(el, db, ctx) {
    const herteken = () => {
      el.querySelector('#rows').innerHTML = orders.rows(db, el.querySelector('#fstatus').value, el.querySelector('#fzoek').value);
    };
    el.querySelector('#fstatus').addEventListener('change', herteken);
    el.querySelector('#fzoek').addEventListener('input', herteken);

    el.querySelector('#export').addEventListener('click', () => {
      const kop = ['ordernummer', 'datum', 'klant', 'status', 'sku', 'product', 'aantal', 'stukprijs_excl_btw', 'regeltotaal_excl_btw'];
      const regels = db.orders.flatMap((o) => o.items.map((i) => [
        o.number, o.createdAt, o.companyName, o.status, i.sku, i.name, i.qty,
        i.unitPriceExVat.toFixed(2), i.lineTotalExVat.toFixed(2),
      ]));
      const csv = [kop, ...regels].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      a.download = `grabngo-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      ctx.toast('Export gestart');
    });

    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-order]');
      if (!b) return;
      const o = db.orders.find((x) => x.id === b.dataset.order);
      const m = ctx.modal(`Order ${o.number}`, `
        <div class="admin-form" style="margin-bottom:18px">
          <div><div class="field__label">Klant</div><div>${escapeHtml(o.companyName)}</div></div>
          <div><div class="field__label">Contactpersoon</div><div>${escapeHtml(o.contactName || '—')}</div></div>
          <div><div class="field__label">Geplaatst op</div><div>${datum(o.createdAt, true)}</div></div>
          <div><div class="field__label">Factuur-e-mail</div><div>${escapeHtml(o.invoiceEmail || o.email)}</div></div>
          <div class="field--full"><div class="field__label">Afleveradres</div>
            <div>${escapeHtml([o.deliveryAddress?.street, `${o.deliveryAddress?.postcode || ''} ${o.deliveryAddress?.city || ''}`, o.deliveryAddress?.country].filter((x) => String(x).trim()).join(', '))}</div></div>
          ${o.note ? `<div class="field--full"><div class="field__label">Opmerking klant</div><div>${escapeHtml(o.note)}</div></div>` : ''}
        </div>
        ${tabel(['SKU', 'Product', { label: 'Aantal', right: true }, { label: 'Stukprijs', right: true }, { label: 'Totaal', right: true }],
          o.items.map((i) => `<tr><td>${escapeHtml(i.sku)}</td><td>${escapeHtml(i.name)}</td>
            <td class="t-right t-num">${i.qty}</td><td class="t-right t-num">${euro(i.unitPriceExVat)}</td>
            <td class="t-right t-num">${euro(i.lineTotalExVat)}</td></tr>`).join(''))}
        <div style="margin-top:16px;display:flex;justify-content:flex-end">
          <div style="min-width:280px">
            <div class="totals">
              <div class="totals__row"><span>Subtotaal excl. btw</span><span>${euro(o.subtotalExVat)}</span></div>
              <div class="totals__row"><span>Verzendkosten</span><span>${euro(o.shippingExVat)}</span></div>
              <div class="totals__row"><span>Btw ${(o.vatRate * 100).toFixed(0)}%</span><span>${euro(o.vatAmount)}</span></div>
              <div class="totals__row totals__row--grand"><span>Totaal incl. btw</span><span>${euro(o.totalIncVat)}</span></div>
            </div>
          </div>
        </div>
        <div style="margin-top:20px">
          <label class="field" style="max-width:280px"><span class="field__label">Status aanpassen</span>
            <select class="select" id="status">${db.settings.orderStatuses.map((s) =>
              `<option value="${s}" ${s === o.status ? 'selected' : ''}>${T.orderStatus[s]}</option>`).join('')}</select></label>
          <div style="font-size:12px;color:var(--text-soft);margin-top:8px">
            Statuswijzigingen worden gelogd en kunnen een notificatie naar de klant sturen (zie Automatiseringen).</div>
        </div>`,
        '<button class="btn btn--primary btn--sm" id="opslaan">Opslaan</button>');

      m.querySelector('#opslaan').addEventListener('click', async () => {
        const nieuw = m.querySelector('#status').value;
        await ctx.api.adminSave((d) => {
          const order = d.orders.find((x) => x.id === o.id);
          if (order.status !== nieuw) {
            order.status = nieuw;
            order.statusHistory.push({ status: nieuw, at: new Date().toISOString() });
            d.notifications.unshift({ id: `n_${Date.now()}`, type: 'email', to: order.email,
              subject: `Status van uw bestelling ${order.number}`, body: `De status is gewijzigd naar: ${T.orderStatus[nieuw]}.`,
              meta: { orderId: order.id }, status: 'in_wachtrij', at: new Date().toISOString() });
            d.auditLogs.unshift({ id: `log_${Date.now()}`, action: 'order.status_gewijzigd',
              detail: `${order.number} → ${nieuw}`, at: new Date().toISOString(), actor: 'admin' });
          }
        });
        m.remove(); ctx.toast('Order bijgewerkt'); ctx.refresh();
      });
    });
  },
};

/* ==========================================================================
   Klanten
   ========================================================================== */
const klanten = {
  async render(db) {
    return `
    ${top('Klanten', 'Zoeken, bekijken, wijzigen, activeren en koppelen aan een display.',
      '<input class="input" id="fzoek" placeholder="Zoek op bedrijf, klantnummer of e-mail">')}
    ${panel('Alle klanten', `<div id="rows">${klanten.rows(db, '')}</div>`, '', true)}`;
  },
  rows(db, q) {
    const t = q.toLowerCase();
    const list = db.customers.map((c) => {
      const co = db.companies.find((x) => x.id === c.companyId) || {};
      const u = db.users.find((x) => x.customerId === c.id) || {};
      const orders = db.orders.filter((o) => o.customerId === c.id);
      return { c, co, u, orders };
    }).filter(({ c, co, u }) => !t || [co.name, c.number, u.email].some((v) => String(v ?? '').toLowerCase().includes(t)));

    return tabel(
      ['Klantnr.', 'Bedrijf', 'Contact', 'Display', 'Orders', { label: 'Omzet excl. btw', right: true }, 'Laatste order', 'Status', ''],
      list.map(({ c, co, u, orders }) => {
        const d = db.displays.find((x) => x.id === c.displayId);
        return `<tr>
          <td>${escapeHtml(c.number)}</td>
          <td><strong>${escapeHtml(co.name || '—')}</strong><br><span style="color:var(--text-soft);font-size:12px">${escapeHtml(co.address?.city || '')}</span></td>
          <td>${escapeHtml(u.contactName || '—')}<br><span style="color:var(--text-soft);font-size:12px">${escapeHtml(u.email || '')}</span></td>
          <td>${d ? escapeHtml(d.code) : '<span style="color:var(--text-soft)">—</span>'}</td>
          <td class="t-num">${orders.length}</td>
          <td class="t-right t-num">${euro(omzetVan(orders))}</td>
          <td>${c.lastOrderAt ? datumKort(c.lastOrderAt) : '—'}</td>
          <td>${c.active ? '<span class="tag tag--ok">Actief</span>' : '<span class="tag tag--neutral">Inactief</span>'}</td>
          <td class="t-right"><button class="btn btn--outline btn--sm" data-klant="${escapeHtml(c.id)}">Openen</button></td>
        </tr>`;
      }).join('')
    );
  },
  mount(el, db, ctx) {
    el.querySelector('#fzoek').addEventListener('input', (e) => {
      el.querySelector('#rows').innerHTML = klanten.rows(db, e.target.value);
    });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-klant]');
      if (!b) return;
      const c = db.customers.find((x) => x.id === b.dataset.klant);
      const co = db.companies.find((x) => x.id === c.companyId) || {};
      const u = db.users.find((x) => x.customerId === c.id) || {};
      const orders = db.orders.filter((o) => o.customerId === c.id);

      const m = ctx.modal(co.name || 'Klant', `
        <div class="admin-form">
          ${veld('name', 'Bedrijfsnaam', co.name)}
          ${veld('contactName', 'Contactpersoon', u.contactName)}
          ${veld('email', 'E-mailadres (inloggen)', u.email, 'email', 'disabled')}
          ${veld('invoiceEmail', 'Factuur e-mailadres', co.invoiceEmail, 'email')}
          ${veld('phone', 'Telefoonnummer', co.phone || u.phone)}
          ${veld('kvk', 'KvK-nummer', co.kvk)}
          ${veld('vatNumber', 'BTW-nummer', co.vatNumber)}
          ${veld('street', 'Adres', co.address?.street)}
          ${veld('postcode', 'Postcode', co.address?.postcode)}
          ${veld('city', 'Plaats', co.address?.city)}
          ${veld('country', 'Land', co.address?.country)}
          <label class="field"><span class="field__label">Gekoppeld display</span>
            <select class="select" name="displayId"><option value="">Geen</option>
              ${db.displays.map((d) => `<option value="${d.id}" ${d.id === c.displayId ? 'selected' : ''}>${escapeHtml(d.code)} — ${escapeHtml(d.name)}</option>`).join('')}
            </select></label>
          <label class="field"><span class="field__label">Status</span>
            <select class="select" name="active">
              <option value="1" ${c.active ? 'selected' : ''}>Actief</option>
              <option value="0" ${!c.active ? 'selected' : ''}>Inactief</option></select></label>
        </div>
        <div style="margin-top:22px">
          <div class="panel__title" style="margin-bottom:10px">Orderhistorie (${orders.length})</div>
          ${tabel(['Order', 'Datum', 'Status', { label: 'Excl. btw', right: true }],
            orders.map((o) => `<tr><td>${escapeHtml(o.number)}</td><td>${datumKort(o.createdAt)}</td>
              <td><span class="tag ${statusKleur(o.status)}">${T.orderStatus[o.status]}</span></td>
              <td class="t-right t-num">${euro(o.subtotalExVat)}</td></tr>`).join(''))}
        </div>`,
        '<button class="btn btn--primary btn--sm" id="opslaan">Opslaan</button>');

      m.querySelector('#opslaan').addEventListener('click', async () => {
        const g = (n) => m.querySelector(`[name="${n}"]`).value.trim();
        await ctx.api.adminSave((d) => {
          const cc = d.customers.find((x) => x.id === c.id);
          const cco = d.companies.find((x) => x.id === c.companyId);
          const uu = d.users.find((x) => x.customerId === c.id);
          if (cco) {
            cco.name = g('name'); cco.invoiceEmail = g('invoiceEmail'); cco.phone = g('phone');
            cco.kvk = g('kvk') || null; cco.vatNumber = g('vatNumber') || null;
            cco.address = { street: g('street'), postcode: g('postcode'), city: g('city'), country: g('country') };
          }
          if (uu) { uu.contactName = g('contactName'); uu.phone = g('phone'); }
          cc.active = m.querySelector('[name="active"]').value === '1';
          const nieuwDisplay = m.querySelector('[name="displayId"]').value || null;
          if (cc.displayId !== nieuwDisplay) {
            d.displays.forEach((dd) => { if (dd.customerId === cc.id) dd.customerId = null; });
            cc.displayId = nieuwDisplay;
            const dd = d.displays.find((x) => x.id === nieuwDisplay);
            if (dd) dd.customerId = cc.id;
          }
          d.auditLogs.unshift({ id: `log_${Date.now()}`, action: 'klant.gewijzigd', detail: cco?.name, at: new Date().toISOString(), actor: 'admin' });
        });
        m.remove(); ctx.toast('Klant opgeslagen'); ctx.refresh();
      });
    });
  },
};

/* ==========================================================================
   Producten
   ========================================================================== */
const producten = {
  async render(db) {
    return `
    ${top('Producten', 'Toevoegen, wijzigen, activeren en foto’s koppelen. Wijzigingen zijn direct zichtbaar in de app — zonder nieuwe app-release.',
      `<input class="input" id="fzoek" placeholder="Zoek op naam, SKU of EAN">
       <button class="btn btn--outline btn--sm" id="hersteld">Catalogus opnieuw laden</button>
       <button class="btn btn--outline btn--sm" id="exportjson">Exporteren (JSON)</button>
       <button class="btn btn--dark btn--sm" id="nieuw">Nieuw product</button>`)}
    ${db.excludedProducts?.length ? `<div class="notice notice--warn" style="margin-bottom:18px"><div>
      <strong>Uitgesloten product.</strong> ${db.excludedProducts.map((p) => `${escapeHtml(p.name)} (SKU ${escapeHtml(p.sku)})`).join(', ')} —
      ${escapeHtml(db.excludedProducts[0].reason)}</div></div>` : ''}
    ${panel('Assortiment', `<div id="rows">${producten.rows(db, '')}</div>`, '', true)}`;
  },
  rows(db, q) {
    const t = q.toLowerCase();
    const list = db.products.filter((p) => !t || [p.name, p.sku, p.ean].some((v) => String(v ?? '').toLowerCase().includes(t)));
    return tabel(
      ['Foto', 'Product', 'SKU', 'EAN', 'Categorie', { label: 'Inkoop excl.', right: true }, { label: 'Advies incl.', right: true }, { label: 'Per verdieping', right: true }, 'Status', ''],
      list.map((p) => `<tr>
        <td>${p.image ? `<img class="thumb" src="${escapeHtml(p.image)}" alt="">` : '<div class="thumb"></div>'}</td>
        <td><strong>${escapeHtml(p.name)}</strong>
          ${!p.description ? '<br><span class="tag tag--warn" style="margin-top:4px">Omschrijving NOG AAN TE LEVEREN</span>' : ''}
          ${p.imageStatus === 'TE_BEVESTIGEN' ? '<br><span class="tag tag--warn" style="margin-top:4px">Foto te bevestigen</span>' : ''}
          ${p.dataFlag ? '<br><span class="tag tag--red" style="margin-top:4px">Gegeven te bevestigen</span>' : ''}</td>
        <td class="t-num">${escapeHtml(p.sku)}</td>
        <td class="t-num">${p.ean ? escapeHtml(p.ean) : '—'}</td>
        <td>${escapeHtml(db.categories.find((c) => c.id === p.categoryId)?.name || '—')}</td>
        <td class="t-right t-num">${euro(p.purchasePriceExVat)}</td>
        <td class="t-right t-num">${euro(p.rrpIncVat)}</td>
        <td class="t-right t-num">${p.displayQtyPerShelf ?? '—'}</td>
        <td>${p.active ? '<span class="tag tag--ok">Actief</span>' : '<span class="tag tag--neutral">Inactief</span>'}</td>
        <td class="t-right"><button class="btn btn--outline btn--sm" data-prod="${escapeHtml(p.id)}">Wijzigen</button></td>
      </tr>`).join('')
    );
  },
  mount(el, db, ctx) {
    el.querySelector('#fzoek').addEventListener('input', (e) => {
      el.querySelector('#rows').innerHTML = producten.rows(db, e.target.value);
    });

    el.querySelector('#exportjson').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify({ version: (db.meta?.catalogVersion || 1), products: db.products, categories: db.categories }, null, 2)], { type: 'application/json' }));
      a.download = 'grabngo-catalogus.json';
      a.click();
      ctx.toast('Catalogus geëxporteerd');
    });

    el.querySelector('#hersteld').addEventListener('click', async () => {
      if (!confirm('De catalogus wordt opnieuw geladen uit het aangeleverde catalogusbestand. Handmatige wijzigingen aan producten gaan verloren. Doorgaan?')) return;
      await ctx.api.resetCatalog(); ctx.toast('Catalogus opnieuw geladen'); ctx.refresh();
    });

    const editor = (p) => {
      const nieuw = !p;
      p = p || { id: '', sku: '', ean: '', name: '', variant: '', categoryId: db.categories[0]?.id,
        description: null, image: null, purchasePriceExVat: 0, rrpIncVat: 0, displayQtyPerShelf: null, active: true, popular: false };

      const m = ctx.modal(nieuw ? 'Nieuw product' : p.name, `
        <div class="admin-form">
          ${veld('name', 'Productnaam *', p.name)}
          ${veld('variant', 'Variant / korte aanduiding', p.variant)}
          ${veld('sku', 'SKU *', p.sku)}
          ${veld('ean', 'EAN', p.ean)}
          <label class="field"><span class="field__label">Categorie</span>
            <select class="select" name="categoryId">${db.categories.map((c) =>
              `<option value="${c.id}" ${c.id === p.categoryId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}</select></label>
          ${veld('purchasePriceExVat', 'Inkoopprijs excl. btw *', p.purchasePriceExVat, 'number', 'step="0.01" min="0"')}
          ${veld('rrpIncVat', 'Adviesprijs incl. btw', p.rrpIncVat, 'number', 'step="0.01" min="0"')}
          ${veld('displayQtyPerShelf', 'Aantal per displayverdieping', p.displayQtyPerShelf ?? '', 'number', 'min="0"')}
          <label class="field"><span class="field__label">Beschikbaarheid</span>
            <select class="select" name="active"><option value="1" ${p.active ? 'selected' : ''}>Actief in de app</option>
              <option value="0" ${!p.active ? 'selected' : ''}>Niet actief (verdwijnt uit de catalogus, oude orders blijven ongewijzigd)</option></select></label>
          <label class="field"><span class="field__label">Tonen bij ‘veelbesteld’</span>
            <select class="select" name="popular"><option value="1" ${p.popular ? 'selected' : ''}>Ja</option>
              <option value="0" ${!p.popular ? 'selected' : ''}>Nee</option></select></label>
          <label class="field field--full"><span class="field__label">Officiële omschrijving</span>
            <textarea class="textarea" name="description" placeholder="Laat leeg zolang de definitieve tekst nog niet is aangeleverd">${escapeHtml(p.description || '')}</textarea>
            <span class="field__hint">Leeg = de app toont ‘NOG AAN TE LEVEREN’. Verzin hier geen productinformatie.</span></label>
          <div class="field field--full">
            <span class="field__label">Productfoto</span>
            <div style="display:flex;gap:14px;align-items:center;margin-top:6px">
              <div id="preview" style="width:80px;height:80px;border:1px solid var(--border);border-radius:8px;background:#f5f5f6;display:flex;align-items:center;justify-content:center;overflow:hidden">
                ${p.image ? `<img src="${escapeHtml(p.image)}" style="width:100%;height:100%;object-fit:contain;padding:4px">` : '<span style="font-size:10px;color:var(--text-soft);text-align:center">Geen foto</span>'}</div>
              <div>
                <input type="file" id="foto" accept="image/*">
                <div class="field__hint" style="margin-top:6px">De aangeleverde GRABNGO-foto wordt één-op-één gebruikt; er wordt niets bijgesneden of aangepast.</div>
                ${p.image ? '<button class="btn btn--ghost btn--sm" id="fotoweg" style="padding-left:0;color:#b03030">Foto verwijderen</button>' : ''}
              </div>
            </div>
          </div>
          ${p.dataFlag ? `<div class="field--full"><div class="notice notice--warn"><div><strong>Te bevestigen.</strong><br>${escapeHtml(p.dataFlag)}</div></div></div>` : ''}
        </div>`,
        `${nieuw ? '' : '<button class="btn btn--danger btn--sm" id="verwijder">Verwijderen</button>'}
         <button class="btn btn--primary btn--sm" id="opslaan">Opslaan</button>`);

      let nieuweFoto = p.image;
      m.querySelector('#foto').addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          nieuweFoto = r.result;
          m.querySelector('#preview').innerHTML = `<img src="${nieuweFoto}" style="width:100%;height:100%;object-fit:contain;padding:4px">`;
        };
        r.readAsDataURL(f);
      });
      m.querySelector('#fotoweg')?.addEventListener('click', () => {
        nieuweFoto = null;
        m.querySelector('#preview').innerHTML = '<span style="font-size:10px;color:var(--text-soft)">Geen foto</span>';
      });

      m.querySelector('#verwijder')?.addEventListener('click', async () => {
        if (!confirm('Dit product definitief verwijderen? Zet het liever op ‘niet actief’ zodat oude orders herkenbaar blijven.')) return;
        await ctx.api.adminSave((d) => { d.products = d.products.filter((x) => x.id !== p.id); });
        m.remove(); ctx.toast('Product verwijderd'); ctx.refresh();
      });

      m.querySelector('#opslaan').addEventListener('click', async () => {
        const g = (n) => m.querySelector(`[name="${n}"]`).value.trim();
        if (!g('name') || !g('sku')) { ctx.toast('Productnaam en SKU zijn verplicht'); return; }
        const data = {
          name: g('name'), variant: g('variant') || null, sku: g('sku'), ean: g('ean') || null,
          categoryId: g('categoryId'),
          description: g('description') || null,
          descriptionStatus: g('description') ? 'AANGELEVERD' : 'NOG_AAN_TE_LEVEREN',
          image: nieuweFoto, imageStatus: nieuweFoto ? 'AANGELEVERD' : 'NOG_AAN_TE_LEVEREN',
          purchasePriceExVat: Number(g('purchasePriceExVat')) || 0,
          rrpIncVat: Number(g('rrpIncVat')) || null,
          displayQtyPerShelf: g('displayQtyPerShelf') ? Number(g('displayQtyPerShelf')) : null,
          active: m.querySelector('[name="active"]').value === '1',
          popular: m.querySelector('[name="popular"]').value === '1',
        };
        await ctx.api.adminSave((d) => {
          if (nieuw) {
            d.products.push({ id: `p_${Date.now().toString(36)}`, order: d.products.length + 1, dataFlag: null, ...data });
          } else {
            Object.assign(d.products.find((x) => x.id === p.id), data);
          }
          d.auditLogs.unshift({ id: `log_${Date.now()}`, action: nieuw ? 'product.toegevoegd' : 'product.gewijzigd',
            detail: `${data.name} (${data.sku})`, at: new Date().toISOString(), actor: 'admin' });
        });
        m.remove(); ctx.toast('Product opgeslagen'); ctx.refresh();
      });
    };

    el.querySelector('#nieuw').addEventListener('click', () => editor(null));
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-prod]');
      if (b) editor(db.products.find((x) => x.id === b.dataset.prod));
    });
  },
};

/* ==========================================================================
   Categorieën
   ========================================================================== */
const categorieen = {
  async render(db) {
    return `
    ${top('Categorieën', 'Volgorde en zichtbaarheid van de categorieën in de app.',
      '<button class="btn btn--dark btn--sm" id="nieuw">Nieuwe categorie</button>')}
    ${panel('Categorieën', tabel(['Naam', 'Code', { label: 'Producten', right: true }, 'Volgorde', 'Status', ''],
      db.categories.map((c) => `<tr>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td class="t-num">${escapeHtml(c.id)}</td>
        <td class="t-right t-num">${db.products.filter((p) => p.categoryId === c.id).length}</td>
        <td class="t-num">${c.order}</td>
        <td>${c.active ? '<span class="tag tag--ok">Zichtbaar</span>' : '<span class="tag tag--neutral">Verborgen</span>'}</td>
        <td class="t-right"><button class="btn btn--outline btn--sm" data-cat="${escapeHtml(c.id)}">Wijzigen</button></td>
      </tr>`).join('')), '', true)}`;
  },
  mount(el, db, ctx) {
    const editor = (c) => {
      const nieuw = !c;
      c = c || { id: '', name: '', order: db.categories.length + 1, active: true };
      const m = ctx.modal(nieuw ? 'Nieuwe categorie' : c.name, `
        <div class="admin-form">
          ${veld('name', 'Naam', c.name)}
          ${veld('id', 'Code (uniek, kleine letters)', c.id, 'text', nieuw ? '' : 'disabled')}
          ${veld('order', 'Volgorde', c.order, 'number', 'min="1"')}
          <label class="field"><span class="field__label">Status</span>
            <select class="select" name="active"><option value="1" ${c.active ? 'selected' : ''}>Zichtbaar</option>
            <option value="0" ${!c.active ? 'selected' : ''}>Verborgen</option></select></label>
        </div>`, '<button class="btn btn--primary btn--sm" id="opslaan">Opslaan</button>');
      m.querySelector('#opslaan').addEventListener('click', async () => {
        const g = (n) => m.querySelector(`[name="${n}"]`).value.trim();
        const id = nieuw ? g('id').toLowerCase().replace(/[^a-z0-9-]/g, '') : c.id;
        if (!g('name') || !id) { ctx.toast('Naam en code zijn verplicht'); return; }
        await ctx.api.adminSave((d) => {
          const data = { id, name: g('name'), order: Number(g('order')) || 1, active: m.querySelector('[name="active"]').value === '1' };
          if (nieuw) d.categories.push(data);
          else Object.assign(d.categories.find((x) => x.id === c.id), data);
        });
        m.remove(); ctx.toast('Categorie opgeslagen'); ctx.refresh();
      });
    };
    el.querySelector('#nieuw').addEventListener('click', () => editor(null));
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (b) editor(db.categories.find((x) => x.id === b.dataset.cat));
    });
  },
};

/* ==========================================================================
   Prijzen
   ========================================================================== */
const prijzen = {
  async render(db) {
    const marge = (p) => {
      if (!p.rrpIncVat || !p.purchasePriceExVat) return null;
      const rrpEx = p.rrpIncVat / (1 + (db.settings.vatRate ?? 0.21));
      return ((rrpEx - p.purchasePriceExVat) / rrpEx) * 100;
    };
    return `
    ${top('Prijzen', 'Inkoopprijzen en adviesprijzen. Prijzen komen altijd uit de backend — nooit uit de app zelf.',
      '<button class="btn btn--dark btn--sm" id="opslaan">Wijzigingen opslaan</button>')}
    <div class="notice notice--info" style="margin-bottom:18px"><div>
      De architectuur is voorbereid op klantspecifieke prijzen, tijdelijke prijzen, acties en staffelprijzen
      (tabel <strong>Prices</strong> met geldigheidsperiode en optionele klant/staffel). Die prijsvormen worden
      geactiveerd zodra Mobile Express B.V. de gewenste regels aanlevert.</div></div>
    ${panel('Prijslijst', tabel(
      ['SKU', 'Product', { label: 'Inkoop excl. btw', right: true }, { label: 'Advies incl. btw', right: true }, { label: 'Marge retailer', right: true }],
      db.products.map((p) => `<tr>
        <td class="t-num">${escapeHtml(p.sku)}</td>
        <td>${escapeHtml(p.name)}</td>
        <td class="t-right"><input class="input t-right" style="width:110px;padding:7px 10px" type="number" step="0.01" min="0" value="${p.purchasePriceExVat}" data-prijs="${escapeHtml(p.id)}" data-veld="purchasePriceExVat"></td>
        <td class="t-right"><input class="input t-right" style="width:110px;padding:7px 10px" type="number" step="0.01" min="0" value="${p.rrpIncVat ?? ''}" data-prijs="${escapeHtml(p.id)}" data-veld="rrpIncVat"></td>
        <td class="t-right t-num">${marge(p) === null ? '—' : `${marge(p).toFixed(0)}%`}</td>
      </tr>`).join('')), '', true)}`;
  },
  mount(el, db, ctx) {
    el.querySelector('#opslaan').addEventListener('click', async () => {
      const wijzigingen = [...el.querySelectorAll('[data-prijs]')];
      await ctx.api.adminSave((d) => {
        wijzigingen.forEach((inp) => {
          const p = d.products.find((x) => x.id === inp.dataset.prijs);
          if (!p) return;
          const v = inp.value === '' ? null : Number(inp.value);
          if (p[inp.dataset.veld] !== v) p[inp.dataset.veld] = v;
        });
        d.auditLogs.unshift({ id: `log_${Date.now()}`, action: 'prijzen.gewijzigd', detail: `${wijzigingen.length} velden gecontroleerd`, at: new Date().toISOString(), actor: 'admin' });
      });
      ctx.toast('Prijzen opgeslagen'); ctx.refresh();
    });
  },
};

/* ==========================================================================
   Displays & QR
   ========================================================================== */
const displays = {
  async render(db) {
    return `
    ${top('Displays & QR', 'Displays beheren, aan klanten koppelen en QR-links genereren.',
      '<button class="btn btn--dark btn--sm" id="nieuw">Nieuw display</button>')}
    ${panel('Displays', tabel(['Code', 'Naam', 'Locatie', 'Klant', 'QR-link', 'Scans', 'Status', ''],
      db.displays.map((d) => {
        const q = db.qrLinks.find((x) => x.code === d.code);
        const url = `${location.origin}/app/?display=${encodeURIComponent(d.code)}`;
        return `<tr>
          <td><strong>${escapeHtml(d.code)}</strong></td>
          <td>${escapeHtml(d.name)}</td>
          <td>${escapeHtml(db.locations.find((l) => l.id === d.locationId)?.name || '—')}</td>
          <td>${d.customerId ? escapeHtml(klantNaam(db, d.customerId)) : '<span style="color:var(--text-soft)">Niet gekoppeld</span>'}</td>
          <td><code style="font-size:11.5px">${escapeHtml(url)}</code>
              <button class="btn btn--ghost btn--sm" data-kopieer="${escapeHtml(url)}" style="padding:2px 6px">Kopiëren</button></td>
          <td class="t-num">${q?.scans ?? 0}</td>
          <td>${d.active ? '<span class="tag tag--ok">Actief</span>' : '<span class="tag tag--neutral">Inactief</span>'}</td>
          <td class="t-right"><button class="btn btn--outline btn--sm" data-display="${escapeHtml(d.id)}">Wijzigen</button></td>
        </tr>`;
      }).join('')), '', true)}
    <div class="notice notice--warn"><div><strong>NOG AAN TE LEVEREN.</strong> De definitieve displaycodes, locaties en het
      gewenste QR-doel per display (registratie, login of een voorgeselecteerd assortiment) worden door Mobile Express B.V. bepaald.</div></div>`;
  },
  mount(el, db, ctx) {
    el.addEventListener('click', async (e) => {
      const kop = e.target.closest('[data-kopieer]');
      if (kop) { await navigator.clipboard?.writeText(kop.dataset.kopieer).catch(() => {}); ctx.toast('QR-link gekopieerd'); return; }
      const b = e.target.closest('[data-display]');
      if (b) editor(db.displays.find((x) => x.id === b.dataset.display));
    });

    const editor = (d) => {
      const nieuw = !d;
      d = d || { id: '', code: '', name: '', locationId: db.locations[0]?.id || '', customerId: null, active: true, note: null };
      const m = ctx.modal(nieuw ? 'Nieuw display' : d.code, `
        <div class="admin-form">
          ${veld('code', 'Displaycode *', d.code, 'text', 'placeholder="Bijvoorbeeld GNG-0001"')}
          ${veld('name', 'Naam', d.name)}
          <label class="field"><span class="field__label">Locatie</span>
            <select class="select" name="locationId"><option value="">Geen</option>
              ${db.locations.map((l) => `<option value="${l.id}" ${l.id === d.locationId ? 'selected' : ''}>${escapeHtml(l.name)}</option>`).join('')}</select></label>
          <label class="field"><span class="field__label">Gekoppelde klant</span>
            <select class="select" name="customerId"><option value="">Niet gekoppeld</option>
              ${db.customers.map((c) => `<option value="${c.id}" ${c.id === d.customerId ? 'selected' : ''}>${escapeHtml(klantNaam(db, c.id))}</option>`).join('')}</select></label>
          <label class="field"><span class="field__label">Status</span>
            <select class="select" name="active"><option value="1" ${d.active ? 'selected' : ''}>Actief</option>
              <option value="0" ${!d.active ? 'selected' : ''}>Inactief</option></select></label>
          <label class="field field--full"><span class="field__label">Interne notitie</span>
            <textarea class="textarea" name="note">${escapeHtml(d.note || '')}</textarea></label>
        </div>`, '<button class="btn btn--primary btn--sm" id="opslaan">Opslaan</button>');

      m.querySelector('#opslaan').addEventListener('click', async () => {
        const g = (n) => m.querySelector(`[name="${n}"]`).value.trim();
        const code = g('code').toUpperCase();
        if (!code) { ctx.toast('Een displaycode is verplicht'); return; }
        await ctx.api.adminSave((db2) => {
          const data = { code, name: g('name') || code, locationId: g('locationId') || null,
            customerId: g('customerId') || null, active: m.querySelector('[name="active"]').value === '1',
            note: g('note') || null };
          if (nieuw) {
            const id = `d_${Date.now().toString(36)}`;
            db2.displays.push({ id, createdAt: new Date().toISOString(), assortment: null, ...data });
            db2.qrLinks.push({ id: `q_${Date.now().toString(36)}`, code, displayId: id, target: 'home', scans: 0, active: true, createdAt: new Date().toISOString() });
          } else {
            Object.assign(db2.displays.find((x) => x.id === d.id), data);
          }
          if (data.customerId) {
            const c = db2.customers.find((x) => x.id === data.customerId);
            if (c) c.displayId = nieuw ? db2.displays.at(-1).id : d.id;
          }
        });
        m.remove(); ctx.toast('Display opgeslagen'); ctx.refresh();
      });
    };
    el.querySelector('#nieuw').addEventListener('click', () => editor(null));
  },
};

/* ==========================================================================
   Locaties
   ========================================================================== */
const locaties = {
  async render(db) {
    return `
    ${top('Locaties', 'Winkels, tankstations en bedrijfslocaties waar GRABNGO-displays staan.',
      '<button class="btn btn--dark btn--sm" id="nieuw">Nieuwe locatie</button>')}
    ${panel('Locaties', tabel(['Naam', 'Adres', 'Plaats', 'Displays', 'Status', ''],
      db.locations.map((l) => `<tr>
        <td><strong>${escapeHtml(l.name)}</strong></td>
        <td>${escapeHtml(l.street || '—')}</td>
        <td>${escapeHtml([l.postcode, l.city].filter(Boolean).join(' ') || '—')}</td>
        <td class="t-num">${db.displays.filter((d) => d.locationId === l.id).length}</td>
        <td>${l.active ? '<span class="tag tag--ok">Actief</span>' : '<span class="tag tag--neutral">Inactief</span>'}</td>
        <td class="t-right"><button class="btn btn--outline btn--sm" data-loc="${escapeHtml(l.id)}">Wijzigen</button></td>
      </tr>`).join('')), '', true)}`;
  },
  mount(el, db, ctx) {
    const editor = (l) => {
      const nieuw = !l;
      l = l || { id: '', name: '', street: '', postcode: '', city: '', country: 'Nederland', active: true };
      const m = ctx.modal(nieuw ? 'Nieuwe locatie' : l.name, `
        <div class="admin-form">
          ${veld('name', 'Naam *', l.name)}
          ${veld('street', 'Adres', l.street)}
          ${veld('postcode', 'Postcode', l.postcode)}
          ${veld('city', 'Plaats', l.city)}
          ${veld('country', 'Land', l.country)}
          <label class="field"><span class="field__label">Status</span>
            <select class="select" name="active"><option value="1" ${l.active ? 'selected' : ''}>Actief</option>
              <option value="0" ${!l.active ? 'selected' : ''}>Inactief</option></select></label>
        </div>`, '<button class="btn btn--primary btn--sm" id="opslaan">Opslaan</button>');
      m.querySelector('#opslaan').addEventListener('click', async () => {
        const g = (n) => m.querySelector(`[name="${n}"]`).value.trim();
        if (!g('name')) { ctx.toast('Een naam is verplicht'); return; }
        await ctx.api.adminSave((d) => {
          const data = { name: g('name'), street: g('street') || null, postcode: g('postcode') || null,
            city: g('city') || null, country: g('country') || null, active: m.querySelector('[name="active"]').value === '1' };
          if (nieuw) d.locations.push({ id: `l_${Date.now().toString(36)}`, ...data });
          else Object.assign(d.locations.find((x) => x.id === l.id), data);
        });
        m.remove(); ctx.toast('Locatie opgeslagen'); ctx.refresh();
      });
    };
    el.querySelector('#nieuw').addEventListener('click', () => editor(null));
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-loc]');
      if (b) editor(db.locations.find((x) => x.id === b.dataset.loc));
    });
  },
};

/* ==========================================================================
   Automatiseringen
   ========================================================================== */
const automatiseringen = {
  async render(db) {
    return `
    ${top('Automatiseringen', 'Regels voor welkomstmails, orderbevestigingen, interne meldingen en verkoopkansen.')}
    ${panel('Regels', tabel(['Regel', 'Kanaal', 'Wat gebeurt er', 'Status', ''],
      db.automationRules.map((a) => `<tr>
        <td><strong>${escapeHtml(a.name)}</strong><br><span style="font-size:11.5px;color:var(--text-soft)">${escapeHtml(a.key)}</span></td>
        <td>${a.channel === 'email' ? 'E-mail' : 'Adminmelding'}</td>
        <td style="max-width:420px">${escapeHtml(a.description)}</td>
        <td>${a.active ? '<span class="tag tag--ok">Aan</span>' : '<span class="tag tag--neutral">Uit</span>'}</td>
        <td class="t-right"><button class="btn btn--outline btn--sm" data-aan="${escapeHtml(a.id)}">${a.active ? 'Uitzetten' : 'Aanzetten'}</button></td>
      </tr>`).join('')), '', true)}

    ${panel('Signalering herhaalbestellingen', `
      <div class="admin-form">
        ${veld('reorderReminderDays', 'Klant signaleren na (dagen zonder bestelling)', db.settings.reorderReminderDays, 'number', 'min="7"')}
      </div>
      <div style="margin-top:14px"><button class="btn btn--dark btn--sm" id="opslaan">Opslaan</button></div>`)}

    ${panel('Koppeling met n8n of andere systemen', `
      <p style="font-size:13.5px;color:var(--text-muted);line-height:1.7">
        De backend publiceert webhooks zodat automatiseringen later kunnen worden toegevoegd zonder de app opnieuw te bouwen:</p>
      <div class="table-wrap" style="margin-top:12px">${tabel(['Gebeurtenis', 'Webhook'],
        [['order.created', 'POST {n8n-url}/grabngo/order-created'],
         ['order.status_changed', 'POST {n8n-url}/grabngo/order-status'],
         ['customer.registered', 'POST {n8n-url}/grabngo/customer-registered'],
         ['customer.inactive', 'POST {n8n-url}/grabngo/customer-inactive']]
          .map(([a, b]) => `<tr><td><code>${a}</code></td><td><code>${escapeHtml(b)}</code></td></tr>`).join(''))}</div>
      <div class="notice notice--warn" style="margin-top:14px"><div><strong>NOG AAN TE LEVEREN.</strong>
        De n8n-URL's, de gewenste e-mailteksten en de ontvangers van interne meldingen worden door Mobile Express B.V. aangeleverd.</div></div>`)}`;
  },
  mount(el, db, ctx) {
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-aan]');
      if (!b) return;
      await ctx.api.adminSave((d) => {
        const a = d.automationRules.find((x) => x.id === b.dataset.aan);
        a.active = !a.active;
      });
      ctx.toast('Automatisering bijgewerkt'); ctx.refresh();
    });
    el.querySelector('#opslaan').addEventListener('click', async () => {
      const v = Number(el.querySelector('[name="reorderReminderDays"]').value) || 60;
      await ctx.api.adminSave((d) => { d.settings.reorderReminderDays = v; });
      ctx.toast('Opgeslagen'); ctx.refresh();
    });
  },
};

/* ==========================================================================
   E-mail & notificaties
   ========================================================================== */
const notificaties = {
  async render(db) {
    return `
    ${top('E-mail & notificaties', 'Alle berichten die de app heeft klaargezet voor de klant en voor Mobile Express B.V.')}
    <div class="notice notice--info" style="margin-bottom:18px"><div>
      In productie verstuurt de backend deze berichten via de e-mailprovider van Mobile Express B.V.
      In deze voorbeeldversie worden ze alleen vastgelegd zodat u de inhoud en de momenten kunt beoordelen.
      <strong>Afzenderadres en e-mailprovider: NOG AAN TE LEVEREN.</strong></div></div>
    ${panel('Berichten', tabel(['Moment', 'Type', 'Aan', 'Onderwerp', 'Status'],
      db.notifications.slice(0, 100).map((n) => `<tr>
        <td>${datum(n.at, true)}</td>
        <td>${n.type === 'email' ? 'E-mail' : 'Adminmelding'}</td>
        <td>${escapeHtml(n.to)}</td>
        <td>${escapeHtml(n.subject)}<br><span style="font-size:11.5px;color:var(--text-soft)">${escapeHtml(n.body)}</span></td>
        <td><span class="tag tag--neutral">${escapeHtml(n.status)}</span></td>
      </tr>`).join('')), '', true)}`;
  },
};

/* ==========================================================================
   Rapportages
   ========================================================================== */
const rapportages = {
  async render(db) {
    const perMaand = {};
    db.orders.filter((o) => o.status !== 'geannuleerd').forEach((o) => {
      const k = o.createdAt.slice(0, 7);
      perMaand[k] = perMaand[k] || { omzet: 0, orders: 0 };
      perMaand[k].omzet += o.subtotalExVat; perMaand[k].orders += 1;
    });
    const perCat = db.categories.map((c) => {
      const skus = db.products.filter((p) => p.categoryId === c.id).map((p) => p.sku);
      const items = db.orders.flatMap((o) => o.items).filter((i) => skus.includes(i.sku));
      return { naam: c.name, aantal: items.reduce((s, i) => s + i.qty, 0), omzet: items.reduce((s, i) => s + i.lineTotalExVat, 0) };
    }).sort((a, b) => b.omzet - a.omzet);

    return `
    ${top('Rapportages', 'Omzet per maand, per categorie en per klant.')}
    ${panel('Omzet per maand (excl. btw)', tabel(['Maand', { label: 'Orders', right: true }, { label: 'Omzet', right: true }],
      Object.entries(perMaand).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) =>
        `<tr><td>${k}</td><td class="t-right t-num">${v.orders}</td><td class="t-right t-num">${euro(v.omzet)}</td></tr>`).join('')), '', true)}
    ${panel('Omzet per categorie (excl. btw)', tabel(['Categorie', { label: 'Stuks', right: true }, { label: 'Omzet', right: true }],
      perCat.map((c) => `<tr><td>${escapeHtml(c.naam)}</td><td class="t-right t-num">${c.aantal}</td><td class="t-right t-num">${euro(c.omzet)}</td></tr>`).join('')), '', true)}
    ${panel('Omzet per klant (excl. btw)', tabel(['Klant', { label: 'Orders', right: true }, { label: 'Omzet', right: true }, 'Laatste order'],
      db.customers.map((c) => {
        const os = db.orders.filter((o) => o.customerId === c.id);
        return { naam: klantNaam(db, c.id), orders: os.length, omzet: omzetVan(os), laatste: c.lastOrderAt };
      }).sort((a, b) => b.omzet - a.omzet).map((r) =>
        `<tr><td>${escapeHtml(r.naam)}</td><td class="t-right t-num">${r.orders}</td>
         <td class="t-right t-num">${euro(r.omzet)}</td><td>${r.laatste ? datumKort(r.laatste) : '—'}</td></tr>`).join('')), '', true)}`;
  },
};

/* ==========================================================================
   Instellingen
   ========================================================================== */
const instellingen = {
  async render(db) {
    const s = db.settings;
    return `
    ${top('Instellingen', 'Bedrijfsgegevens, btw, verzendkosten, juridische links en logboek.')}
    ${panel('Algemeen', `<div class="admin-form">
        ${veld('companyName', 'Bedrijfsnaam', s.companyName)}
        ${veld('vatRate', 'Btw-tarief (bijv. 0.21)', s.vatRate, 'number', 'step="0.01" min="0" max="1"')}
        ${veld('shippingCostExVat', 'Verzendkosten excl. btw', s.shippingCostExVat ?? '', 'number', 'step="0.01" min="0" placeholder="NOG AAN TE LEVEREN"')}
        ${veld('shippingFreeFromExVat', 'Gratis verzending vanaf (excl. btw)', s.shippingFreeFromExVat ?? '', 'number', 'step="0.01" min="0" placeholder="NOG AAN TE LEVEREN"')}
        ${veld('minOrderValueExVat', 'Minimale orderwaarde excl. btw', s.minOrderValueExVat ?? '', 'number', 'step="0.01" min="0" placeholder="NOG AAN TE LEVEREN"')}
        ${veld('orderEmailInternal', 'Interne ordermeldingen naar', s.orderEmailInternal ?? '', 'email', 'placeholder="NOG AAN TE LEVEREN"')}
        ${veld('supportEmail', 'Support e-mailadres', s.supportEmail ?? '', 'email', 'placeholder="NOG AAN TE LEVEREN"')}
        ${veld('supportPhone', 'Support telefoonnummer', s.supportPhone ?? '', 'text', 'placeholder="NOG AAN TE LEVEREN"')}
        ${veld('termsUrl', 'URL algemene voorwaarden', s.termsUrl ?? '', 'url', 'placeholder="NOG AAN TE LEVEREN"')}
        ${veld('privacyUrl', 'URL privacybeleid', s.privacyUrl ?? '', 'url', 'placeholder="NOG AAN TE LEVEREN"')}
      </div>
      <div style="margin-top:16px"><button class="btn btn--dark btn--sm" id="opslaan">Instellingen opslaan</button></div>`)}

    ${panel('Logboek (adminacties)', tabel(['Moment', 'Actie', 'Details', 'Door'],
      db.auditLogs.slice(0, 60).map((l) => `<tr><td>${datum(l.at, true)}</td><td><code>${escapeHtml(l.action)}</code></td>
        <td>${escapeHtml(l.detail || '')}</td><td>${escapeHtml(l.actor || '')}</td></tr>`).join('')), '', true)}

    ${panel('Gegevens & back-up', `
      <p style="font-size:13.5px;color:var(--text-muted)">Exporteer alle gegevens van deze omgeving als JSON-back-up.</p>
      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn--outline btn--sm" id="backup">Back-up downloaden</button>
        <button class="btn btn--danger btn--sm" id="wis">Demo-gegevens wissen</button>
      </div>`)}`;
  },
  mount(el, db, ctx) {
    el.querySelector('#opslaan').addEventListener('click', async () => {
      const g = (n) => el.querySelector(`[name="${n}"]`).value.trim();
      const getal = (n) => (g(n) === '' ? null : Number(g(n)));
      await ctx.api.adminSave((d) => {
        Object.assign(d.settings, {
          companyName: g('companyName'),
          vatRate: Number(g('vatRate')) || 0.21,
          shippingCostExVat: getal('shippingCostExVat'),
          shippingFreeFromExVat: getal('shippingFreeFromExVat'),
          minOrderValueExVat: getal('minOrderValueExVat'),
          orderEmailInternal: g('orderEmailInternal') || null,
          supportEmail: g('supportEmail') || null,
          supportPhone: g('supportPhone') || null,
          termsUrl: g('termsUrl') || null,
          privacyUrl: g('privacyUrl') || null,
        });
        d.auditLogs.unshift({ id: `log_${Date.now()}`, action: 'instellingen.gewijzigd', detail: '', at: new Date().toISOString(), actor: 'admin' });
      });
      ctx.toast('Instellingen opgeslagen'); ctx.refresh();
    });
    el.querySelector('#backup').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
      a.download = `grabngo-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    });
    el.querySelector('#wis').addEventListener('click', () => {
      if (!confirm('Alle demo-gegevens op dit apparaat wissen (klanten, orders, instellingen)? Dit kan niet ongedaan worden gemaakt.')) return;
      localStorage.removeItem('gng.db.v2'); localStorage.removeItem('gng.session.v2'); localStorage.removeItem('gng.cart.v2');
      location.reload();
    });
  },
};

export const secties = {
  dashboard, orders, klanten, producten, categorieen, prijzen,
  displays, locaties, automatiseringen, notificaties, rapportages, instellingen,
};
