# 2. Databasemodel (ERD)

Relationeel model (PostgreSQL of MySQL). Geen dubbele opslag van bedrijfs-, prijs- of productgegevens.

```
Users ──┐
        │ 1        n
        ├──────── Customers ───────n──── Orders ────n──── OrderItems
        │            │                      │
Companies ───────────┘                      │
   │                                        │
   ├── Addresses (levering/factuur)         │
   └── Contacts                             │
                                            │
Categories ──n── Products ──n── ProductImages
                    │
                    └──n── Prices (klantspecifiek · staffel · actie · geldigheid)

Locations ──n── Displays ──n── QRLinks
                   │
                   └──n── CustomerDisplayLinks ──── Customers

Notifications · AutomationRules · AuditLogs · AppSettings
```

## 2.1 Tabellen

| Tabel | Belangrijkste velden |
|-------|----------------------|
| **Users** | id, email (uniek), password_hash, role (`klant`/`admin`), customer_id, company_id, contact_name, phone, active, consent_terms_at, consent_privacy_at, created_at |
| **Companies** | id, name, kvk, vat_number, invoice_email, phone, created_at |
| **Addresses** | id, company_id, type (`levering`/`factuur`), street, postcode, city, country |
| **Contacts** | id, company_id, name, email, phone, role |
| **Customers** | id, company_id, customer_number, price_list_id, active, last_order_at, created_at |
| **Categories** | id, name, sort_order, active |
| **Products** | id, sku, ean, name, variant, category_id, description, description_status, active, display_qty_per_shelf, popular, sort_order, data_flag |
| **ProductImages** | id, product_id, url, sort_order, status (`aangeleverd`/`placeholder`/`te_bevestigen`), note |
| **Prices** | id, product_id, customer_id (nullable), min_qty (staffel), purchase_price_ex_vat, rrp_inc_vat, valid_from, valid_to, campaign_label |
| **Orders** | id, order_number (uniek), customer_id, company_id, status, subtotal_ex_vat, shipping_ex_vat, vat_rate, vat_amount, total_inc_vat, delivery_address_json, invoice_email, note, display_id, source, idempotency_key (uniek), created_at |
| **OrderItems** | id, order_id, product_id, sku, ean, name, variant, qty, unit_price_ex_vat, line_total_ex_vat, rrp_inc_vat |
| **Displays** | id, code (uniek), name, location_id, customer_id, assortment_json, active, note, created_at |
| **Locations** | id, name, street, postcode, city, country, active |
| **CustomerDisplayLinks** | id, customer_id, display_id, linked_at, linked_by |
| **QRLinks** | id, code, display_id, target (`home`/`registratie`/`assortiment`), scans, active |
| **Notifications** | id, type (`email`/`push`/`admin`), to, subject, body, meta_json, status, sent_at |
| **AutomationRules** | id, key, name, channel, active, config_json |
| **AuditLogs** | id, actor_user_id, action, detail, ip, created_at |
| **AppSettings** | key, value_json (btw, verzendkosten, support, juridische URL's, e-mailadressen) |

## 2.2 Belangrijke regels

- **Prijzen staan nooit in de mobiele app.** Een order neemt de prijs over die de server op het
  moment van bestellen berekent, en bewaart die in `OrderItems` (historisch correct).
- **Producten worden nooit hard verwijderd** in de normale werkwijze: `active = false` haalt ze uit
  de catalogus, oude orders blijven ongewijzigd doordat naam, SKU en prijs in `OrderItems` staan.
- **`Orders.idempotency_key`** is uniek: bij een netwerkfout of dubbele tik ontstaat géén tweede order.
- **SKU is niet gegarandeerd uniek** in de aangeleverde brochure (SKU 37011 staat bij twee varianten).
  Daarom is `Products.id` de sleutel en niet de SKU. Zie `docs/05-nog-aan-te-leveren.md`.
