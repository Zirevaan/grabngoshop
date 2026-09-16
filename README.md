# GRABNGO — B2B-bestelapp

Zakelijk bestelportaal van **Mobile Express B.V.** voor winkeliers, retailers, tankstations,
supermarkten, koffiecorners, zorglocaties en andere zakelijke klanten.

| Onderdeel | URL | Omschrijving |
|---|---|---|
| Klantapp | `/app/` | Mobile-first app: registreren, bestellen, orderhistorie, QR/display |
| Adminomgeving | `/admin/` | Beheer voor Mobile Express B.V. (12 modules) |
| Bestaande site | `/` | Het huidige bestelportaal blijft ongewijzigd werken |
| Documentatie | `docs/` | Sitemap, ERD, API, architectuur, planning, openstaande punten |

## Snel bekijken

Open **`https://grabngoshop.nl/app/`** op een telefoon en kies "Zet op beginscherm" om de app
als echte app te openen (volledig scherm, eigen icoon).

Lokaal:

```bash
python3 -m http.server 8099
# app:   http://localhost:8099/app/
# admin: http://localhost:8099/admin/
```

De eerste keer dat u de adminomgeving opent, stelt u zelf het beheerdersaccount in.

## Wat werkt er nu

**Klantapp** — startscherm, registratie zakelijke klant, inloggen, home met laatste bestelling en
snel opnieuw bestellen, catalogus met zoeken en categorieën, productdetail met SKU/EAN/inkoop- en
adviesprijs, winkelmandje met btw-berekening, bestelling controleren en plaatsen (uniek ordernummer,
geen dubbele orders bij netwerkproblemen), orderbevestiging, orderhistorie, opnieuw bestellen,
accountbeheer, QR-/displaykoppeling en juridische pagina's.

**Admin** — dashboard, orders (filteren, status, CSV-export), klanten (incl. display koppelen),
producten (toevoegen/wijzigen/deactiveren, foto uploaden), categorieën, prijzen, displays & QR,
locaties, automatiseringen, e-mail/notificaties, rapportages en instellingen met logboek.

## Architectuur in het kort

De app bevat **geen** prijzen of productgegevens. Alles loopt via één API-laag
(`app/js/api.js`) met twee uitwisselbare adapters:

- `LocalAdapter` — ingebouwde demo-backend voor de visuele review op een echte telefoon;
- `RestAdapter` — de echte backend/API (endpoints in `docs/03-api.md`).

Omschakelen naar productie in `app/js/config.js`:

```js
backend: 'rest',
apiBaseUrl: 'https://api.grabngoshop.nl/v1',
```

Nieuwe producten, prijswijzigingen en foto's komen uit de backend en verschijnen **zonder nieuwe
app-release** in de app. Verpakken tot iOS-/Android-/Samsung-build gebeurt met Capacitor —
zie `docs/04-architectuur-en-planning.md`.

## Merk en productgegevens

- Het aangeleverde GRABNGO-logo wordt **ongewijzigd** gebruikt (`assets/brand/`).
- Productfoto's worden **één-op-één** getoond; er wordt niets bijgesneden, hertekend of gegenereerd.
- Productgegevens komen uitsluitend uit de aangeleverde brochure (`data/catalog.json`).
- De Micro-USB 1m Black (SKU 16876) is **uitgesloten** van de catalogus.
- Ontbrekende informatie is nergens ingevuld, maar gemarkeerd als **NOG AAN TE LEVEREN** —
  het volledige overzicht staat in `docs/05-nog-aan-te-leveren.md`.
