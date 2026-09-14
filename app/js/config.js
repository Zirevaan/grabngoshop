/* GRABNGO — centrale configuratie.
   Eén plek waar de app wordt omgezet van de ingebouwde demo-backend naar de
   echte productie-API. De mobiele frontend bevat zelf géén prijzen of
   productdata: alles komt via de API-laag binnen (zie js/api.js). */
export const CONFIG = {
  appName: 'GRABNGO',
  appSubtitle: 'Zakelijk bestellen',
  usp: 'Zakelijk bestellen. Simpel geregeld.',
  version: '0.9.0-preview',

  /* 'local'  = ingebouwde demo-backend (localStorage) voor de visuele review.
     'rest'   = echte backend/API. Zet apiBaseUrl en herstart de app. */
  backend: 'local',
  apiBaseUrl: '', // bv. 'https://api.grabngoshop.nl/v1'

  /* Merk-assets. Vervangen zodra Mobile Express B.V. de definitieve
     logobestanden aanlevert — bestandsnamen gelijk houden, dan is er geen
     codewijziging nodig. */
  logoLight: '/assets/brand/grabngo-logo.png',      // wit logo — voor donkere vlakken
  logoDark:  '/assets/brand/grabngo-logo-black.png',// zwart logo — voor lichte vlakken

  catalogUrl: '/data/catalog.json',
  vatRateFallback: 0.21,
  currency: 'EUR',
  locale: 'nl-NL',
  supportUrl: '/app/#/instellingen',
};
