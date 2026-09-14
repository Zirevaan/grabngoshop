# 3. API-overzicht

Basis: `https://api.grabngoshop.nl/v1` · JSON · authenticatie via `Authorization: Bearer <token>`.
De mobiele app praat uitsluitend via `app/js/api.js`; omschakelen van de demo-backend naar de
echte API gebeurt in `app/js/config.js` (`backend: 'rest'`, `apiBaseUrl: '…'`).

## 3.1 Authenticatie
| Methode | Endpoint | Omschrijving |
|---|---|---|
| POST | `/auth/register` | Registratie zakelijke klant → `{ session, profile }` |
| POST | `/auth/login` | Inloggen → `{ session, profile }` |
| POST | `/auth/logout` | Sessie beëindigen |
| GET | `/auth/me` | Profiel: user, company, customer, display |
| PUT | `/auth/password` | Wachtwoord wijzigen |
| POST | `/auth/password/forgot` | Wachtwoord vergeten (reset-mail) |

## 3.2 Klant
| Methode | Endpoint | Omschrijving |
|---|---|---|
| PATCH | `/customers/me` | Bedrijfs-, factuur- en contactgegevens bijwerken |
| PUT | `/customers/me/display` | Display koppelen op basis van code |
| GET | `/customers/me/export` | AVG: kopie van eigen gegevens |
| DELETE | `/customers/me` | AVG: verwijderverzoek indienen |

## 3.3 Catalogus
| Methode | Endpoint | Omschrijving |
|---|---|---|
| GET | `/categories` | Actieve categorieën |
| GET | `/products?category=&q=&page=` | Producten incl. de prijs die voor deze klant geldt |
| GET | `/products/:id` | Productdetail |
| GET | `/settings` | Btw, verzendkosten, support, juridische URL's |

## 3.4 Orders
| Methode | Endpoint | Omschrijving |
|---|---|---|
| GET | `/orders` | Orderhistorie van de ingelogde klant |
| GET | `/orders/:id` | Orderdetail |
| POST | `/orders` | Order plaatsen. Vereist header `Idempotency-Key`; de server berekent alle prijzen opnieuw |
| POST | `/orders/:id/reorder` | Regels van een eerdere order teruggeven voor het mandje |

## 3.5 Displays / QR
| Methode | Endpoint | Omschrijving |
|---|---|---|
| GET | `/displays/code/:code` | Display opzoeken via QR-code (telt de scan mee) |
| GET | `/displays/info` | Algemene displayinformatie (schappen, kenmerken) |

## 3.6 Admin (rol `admin`)
| Methode | Endpoint | Omschrijving |
|---|---|---|
| GET | `/admin/stats` | Dashboardcijfers |
| GET/POST/PATCH | `/admin/customers[/:id]` | Klantbeheer, activeren/deactiveren, display koppelen |
| GET/PATCH | `/admin/orders[/:id]` | Orders filteren, status aanpassen, opnieuw verwerken |
| GET | `/admin/orders/export.csv` | Orderexport |
| GET/POST/PATCH/DELETE | `/admin/products[/:id]` | Productbeheer |
| POST | `/admin/products/:id/image` | Productfoto uploaden (wordt één-op-één opgeslagen) |
| GET/POST/PATCH | `/admin/categories[/:id]` | Categoriebeheer |
| GET/POST/PATCH | `/admin/prices[/:id]` | Prijzen, staffels, acties, klantprijzen |
| GET/POST/PATCH | `/admin/displays[/:id]`, `/admin/locations[/:id]` | Display- en locatiebeheer |
| GET/PATCH | `/admin/automations[/:id]` | Automatiseringsregels |
| GET | `/admin/notifications` | Verzonden/klaargezette berichten |
| GET/PUT | `/admin/settings` | Instellingen |
| GET | `/admin/export` | Volledige export/back-up |

## 3.7 Webhooks (voor n8n of andere systemen)
| Gebeurtenis | Payload |
|---|---|
| `order.created` | order incl. regels, klant en display |
| `order.status_changed` | order_id, oude en nieuwe status |
| `customer.registered` | klant- en bedrijfsgegevens |
| `customer.inactive` | klanten zonder bestelling binnen de ingestelde periode |

## 3.8 Foutafhandeling
De API geeft `{ "message": "menselijke Nederlandse tekst", "code": "machineleesbaar" }`.
De app toont uitsluitend `message` — nooit een technische foutcode aan de klant.
