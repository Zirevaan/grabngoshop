/* Formattering en menselijke Nederlandse teksten (geen technische foutcodes). */
import { CONFIG } from './config.js';

export const euro = (n) =>
  (typeof n === 'number' && isFinite(n))
    ? new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.currency }).format(n)
    : '—';

export const num = (n) => new Intl.NumberFormat(CONFIG.locale).format(n ?? 0);

export const datum = (iso, withTime = false) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const opts = withTime
    ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat(CONFIG.locale, opts).format(d);
};

export const datumKort = (iso) => iso
  ? new Intl.DateTimeFormat(CONFIG.locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
  : '—';

export const dagenGeleden = (iso) => {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};

/* Eén centrale vertaaltabel. V1 is Nederlands; een tweede taal kan hier later
   naast worden gezet zonder de schermen aan te passen. */
export const T = {
  orderStatus: {
    nieuw: 'Nieuw',
    in_behandeling: 'In behandeling',
    verzonden: 'Verzonden',
    geleverd: 'Geleverd',
    geannuleerd: 'Geannuleerd',
  },
  fouten: {
    netwerk: 'We konden de gegevens nu niet ophalen. Controleer uw internetverbinding en probeer het opnieuw.',
    onbekend: 'Er ging iets mis. Probeer het opnieuw of neem contact op met Mobile Express B.V.',
    inloggen: 'Dit e-mailadres en wachtwoord horen niet bij elkaar. Probeer het opnieuw.',
    emailBestaat: 'Er bestaat al een account met dit e-mailadres. Log in of vraag een nieuw wachtwoord aan.',
    geenToegang: 'U heeft geen toegang tot dit onderdeel.',
    legeMand: 'Uw winkelmandje is leeg.',
  },
};

export const statusKleur = (s) => ({
  nieuw: 'tag--info',
  in_behandeling: 'tag--warn',
  verzonden: 'tag--info',
  geleverd: 'tag--ok',
  geannuleerd: 'tag--neutral',
}[s] || 'tag--neutral');

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
