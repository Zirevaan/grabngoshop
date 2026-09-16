# 6. Testplan

## 6.1 Reeds geautomatiseerd getest (Chromium, 390×844 en 1440×900)
| Flow | Resultaat |
|---|---|
| Startscherm laadt, logo en USP zichtbaar | ✅ |
| Registratie nieuwe zakelijke klant (met validatie en akkoordvinkje) | ✅ |
| Automatisch inloggen na registratie, welkomstmail + adminmelding klaargezet | ✅ |
| Catalogus toont 17 producten uit de backend, zoeken en categoriefilter | ✅ |
| Productdetail met foto, SKU, EAN, inkoop- en adviesprijs | ✅ |
| Toevoegen aan mandje, aantallen wijzigen, verwijderen | ✅ |
| Totalen: subtotaal excl. btw + 21% btw = totaal incl. btw | ✅ (€ 8,91 → € 1,87 → € 10,78) |
| Bestelling plaatsen, uniek ordernummer (GNG-2026-1001) | ✅ |
| Orderbevestiging + orderhistorie | ✅ |
| Opnieuw bestellen zet de volledige order terug in het mandje | ✅ |
| QR-deeplink `/app/?display=GNG-DEMO-01` herkent het display | ✅ |
| Admin: inloggen en alle 12 modules openen | ✅ |
| Admin: producteditor openen (incl. foto-upload) | ✅ |
| Console- en JavaScript-fouten | ✅ geen |

## 6.2 Nog uit te voeren vóór livegang
1. **Apparaten**: iPhone (Safari/WebView) en Android (Chrome/WebView), klein scherm (360 px) en tablet.
2. **Netwerk**: bestellen met slechte verbinding — controleren dat er géén dubbele order ontstaat
   (idempotentiesleutel) en dat de foutmelding menselijk is.
3. **E-mail**: orderbevestiging, welkomstmail en interne melding bij de echte e-mailprovider.
4. **Rollen**: een klantaccount mag de adminomgeving niet kunnen openen; een admin ziet geen klantmandje.
5. **Gegevens**: prijswijziging in admin → direct zichtbaar in de app; product op inactief →
   verdwijnt uit de catalogus terwijl oude orders ongewijzigd blijven.
6. **QR**: elke displaycode leidt naar de juiste locatie en koppeling.
7. **Pilot**: kleine groep zakelijke klanten laat de volledige flow doorlopen vóór brede uitrol.
