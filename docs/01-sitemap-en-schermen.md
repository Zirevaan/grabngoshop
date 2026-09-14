# 1. Sitemap, schermenlijst en user flows

## 1.1 Sitemap — klantapp (`/app/`)

```
GRABNGO app
├── /welkom                     Startscherm (logo, USP, inloggen, registreren, QR)
├── /login                      Inloggen
├── /registreren                Registratie nieuwe zakelijke klant
├── /qr  ·  /qr/:code           QR-/displayflow (scannen of code invoeren)
├── /home            (login)    Welkom, laatste bestelling, categorieën, veelbesteld
├── /producten       (login)    Catalogus + zoeken + categoriefilter
│   └── /product/:id (login)    Productdetail
├── /mand            (login)    Winkelmandje
│   └── /bestellen   (login)    Bestelling controleren en plaatsen
│       └── /bevestiging/:id    Orderbevestiging
├── /bestellingen    (login)    Orderhistorie
│   └── /bestelling/:id         Orderdetail + opnieuw bestellen
├── /account         (login)    Accountoverzicht
│   ├── /account/bedrijf        Bedrijfsgegevens
│   ├── /account/factuur        Factuurgegevens
│   ├── /account/contact        Contactgegevens
│   └── /account/wachtwoord     Wachtwoord wijzigen
└── /info/:pagina               Voorwaarden · Privacy · Mijn gegevens (AVG) · Contact
```

Bottom navigation (altijd bereikbaar na inloggen): **Home · Producten · Bestellingen · Account · Mandje**
(met live aantalindicator op het mandje).

## 1.2 Sitemap — adminomgeving (`/admin/`)

```
GRABNGO Admin
├── Overzicht    → Dashboard · Rapportages
├── Verkoop      → Orders · Klanten
├── Assortiment  → Producten · Categorieën · Prijzen
├── Displays     → Displays & QR · Locaties
└── Systeem      → Automatiseringen · E-mail & notificaties · Instellingen
```

## 1.3 Schermenlijst

| # | Scherm | Doel | Belangrijkste elementen |
|---|--------|------|-------------------------|
| 1 | Welkom | Eerste indruk, toegang | Logo, USP, inloggen, registreren, QR |
| 2 | Registratie | Nieuwe zakelijke klant | Bedrijf, contact, adres, facturatie, akkoord |
| 3 | Inloggen | Bestaande klant | E-mail, wachtwoord |
| 4 | Home | Snel opnieuw bestellen | Laatste order, categorieën, veelbestelde producten, display |
| 5 | Producten | Assortiment | Zoeken, categoriechips, productkaarten |
| 6 | Productdetail | Beslissen | Foto, naam, SKU, EAN, inkoop/advies, aantal per verdieping |
| 7 | Winkelmandje | Order samenstellen | Aantallen, verwijderen, subtotaal/btw/totaal |
| 8 | Bestelling controleren | Controle vóór bevestiging | Afleveradres, factuurgegevens, volledige order |
| 9 | Orderbevestiging | Zekerheid | Ordernummer, bevestigingsmail, vervolgacties |
| 10 | Bestellingen | Historie | Ordernummer, datum, status, bedrag, opnieuw bestellen |
| 11 | Orderdetail | Terugkijken | Regels, totalen, gegevens, opnieuw bestellen |
| 12 | Account | Beheer | Bedrijf, factuur, contact, wachtwoord, display, juridisch, uitloggen |
| 13 | QR/display | Koppeling | Code herkennen, koppelen aan account |
| 14 | Info/juridisch | Transparantie | Voorwaarden, privacy, AVG-verzoek, support |
| 15–26 | Admin (12 modules) | Beheer door Mobile Express B.V. | Zie 1.2 |

## 1.4 User flows

**A. Nieuwe klant via QR op het display**
```
QR scannen → /app/?display=GNG-0001 → displaycode herkend
   → Account aanmaken (code wordt onthouden) → account + klant + koppeling display
   → welkomstmail + adminmelding → Home → Producten → Mandje → Controleren
   → Bestellen → ordernummer + orderbevestiging + interne melding
```

**B. Bestaande klant herhaalbestelling**
```
Inloggen → Home ("Laatste bestelling") → Opnieuw bestellen
   → Mandje (aantallen aanpassen) → Controleren → Bestellen → Bevestiging
```

**C. Mobile Express B.V. verwerkt een order**
```
Admin → Dashboard (openstaande orders) → Orders → order openen
   → status naar "In behandeling"/"Verzonden" → notificatie naar klant
   → klant ziet nieuwe status in Bestellingen
```

**D. Nieuw product of prijswijziging (zonder app-release)**
```
Admin → Producten → Nieuw product / Wijzigen → foto koppelen, prijs invullen, activeren
   → klant ziet het product direct in de app (catalogus komt uit de backend)
```
