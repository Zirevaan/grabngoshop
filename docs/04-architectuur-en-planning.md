# 4. Technische architectuur en planning

## 4.1 Architectuur

```
┌──────────────────────────────────────────────────────────────┐
│  Mobiele app (iOS · Android · Samsung)                        │
│  Mobile-first UI, component-based, volledig Nederlands        │
│  Geen prijzen of productdata in de app zelf                   │
└──────────────┬───────────────────────────────────────────────┘
               │  HTTPS / JSON  (app/js/api.js — één API-laag)
┌──────────────▼───────────────────────────────────────────────┐
│  Backend / API                                                │
│  Authenticatie · rollen (klant/admin) · validatie · prijslogica│
│  Orderverwerking · idempotentie · webhooks · e-mail            │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
┌──────────────▼─────────────┐   ┌─────────────▼───────────────┐
│  Relationele database      │   │  Admin dashboard (web)      │
│  (zie docs/02-database)    │   │  12 modules, rolgebaseerd    │
└────────────────────────────┘   └─────────────────────────────┘
                                        │
                               ┌────────▼─────────┐
                               │  n8n (optioneel) │  via webhooks
                               └──────────────────┘
```

### Huidige stand in deze repository
- **Klantapp**: `/app/` — mobile-first PWA, installeerbaar op iOS en Android, werkt offline
  voor de app-shell. Hash-routing, zodat dezelfde code in een native WebView-wrapper draait.
- **Adminomgeving**: `/admin/` — 12 modules, dezelfde API-laag als de app.
- **API-laag**: `app/js/api.js` met twee uitwisselbare adapters:
  - `LocalAdapter` — ingebouwde demo-backend (browseropslag) voor de **visuele review op telefoon**;
  - `RestAdapter` — de echte backend; omzetten kost één regel in `app/js/config.js`.
- **Catalogus**: `data/catalog.json` wordt bij het starten geladen en daarna in de backend beheerd.
  Producten toevoegen, wijzigen of deactiveren vergt **geen nieuwe app-release**.

### Van PWA naar app-stores
De app is gebouwd als PWA en wordt met **Capacitor** verpakt tot een native iOS- en Android-build
(Samsung Galaxy Store gebruikt hetzelfde Android-artefact). Er is geen herbouw nodig:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init GRABNGO nl.mobileexpress.grabngo --web-dir=.
npx cap add ios && npx cap add android
npx cap sync
```
`server.url` in `capacitor.config` wijst naar de productie-URL, of de webbestanden worden
meegeleverd in de build. Push-notificaties komen via `@capacitor/push-notifications`.

### Beveiliging en AVG
| Onderwerp | Invulling |
|---|---|
| Wachtwoorden | PBKDF2-SHA256 (120.000 iteraties) met salt; in productie server-side (Argon2id of een authenticatieprovider) |
| Sessies | Bearer-token; verlopen sessies leiden tot opnieuw inloggen |
| Rollen | Strikte scheiding `klant` / `admin`; elke adminroute controleert de rol |
| Transport | Uitsluitend HTTPS; security-headers staan in `vercel.json` |
| Validatie | Client valideert voor gebruiksgemak, **server valideert altijd opnieuw** (ook prijzen) |
| Logging | `AuditLogs` legt adminacties vast (wie, wat, wanneer) |
| AVG | Inzage/wijzigen in Account, verwijderverzoek via `/info/gegevens`; juridische teksten door Mobile Express B.V. |
| Back-up | Export/back-up in Admin → Instellingen; in productie dagelijkse databaseback-up |

> De ingebouwde demo-backend slaat gegevens **lokaal in de browser** op. Dat is bewust: het maakt de
> visuele review mogelijk zonder productiegegevens. Voor echte klantgegevens is de stap naar de
> server-backend (`backend: 'rest'`) noodzakelijk.

## 4.2 Planning per fase

| Fase | Inhoud | Status |
|---|---|---|
| 1 | Concept: sitemap, schermen, user flows, ERD, API, architectuur | **Gereed** — `docs/` |
| 2 | Visuele eerste versie met placeholders, te bekijken op telefoon | **Gereed** — `/app/` |
| 3 | Feedback verwerken: schermen, navigatie, kleuren, typografie | Wacht op beoordeling opdrachtgever |
| 4 | Werkende MVP: database, backend, login, catalogus, mandje, orders, account | App + API-laag gereed; **server-backend te bouwen** |
| 5 | Admin: klanten, producten, orders, displays, prijzen | **Gereed** — `/admin/` |
| 6 | Echte producten: definitieve foto's en omschrijvingen koppelen | Wacht op aanlevering |
| 7 | Automatisering: e-mail, notificaties, eventueel n8n | Regels + webhooks voorbereid; verzending via backend |
| 8 | Testen: alle flows op iOS en Android, pilot met kleine groep klanten | Te plannen |
| 9 | Release: productiebuilds en store-assets | Iconen gereed; overige assets te maken |
| 10 | Livegang met de officiële accounts van Mobile Express B.V. | Te plannen |

## 4.3 Store-gereedheid

| Onderdeel | Status |
|---|---|
| App-icoon 192/512/maskable/1024 | Gereed (`app/icons/`) — gemaakt met het aangeleverde logo, ongewijzigd |
| Splash/thema | Gereed (zwart `#0d0d0d`, wit logo) |
| Manifest (naam, scope, oriëntatie, taal) | Gereed |
| Privacy policy-URL | **NOG AAN TE LEVEREN** |
| Support-/contactgegevens | **NOG AAN TE LEVEREN** |
| Store-teksten en screenshots | Te maken na goedkeuring visuele stijl |
| Apple / Google Play / Samsung-accounts | **NOG AAN TE LEVEREN** |
| Crash- en foutmonitoring | Te koppelen bij de productiebuild |

Betaling: v1 is bedoeld voor zakelijke orderplaatsing van fysieke producten op rekening. Er wordt
bewust géén in-app-purchase gebruikt; online betaalmethoden (iDEAL/SEPA) kunnen later via de
backend worden toegevoegd.
