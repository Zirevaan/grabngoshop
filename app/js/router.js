/* Eenvoudige hash-router. Hash-routing werkt zowel op het web als in een
   Capacitor/WebView-wrapper (iOS, Android, Samsung) zonder serverconfiguratie. */
const routes = [];
let notFound = null;
let current = null;

export const route = (pattern, handler) => {
  const keys = [];
  const rx = new RegExp('^' + pattern.replace(/:([A-Za-z0-9_]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ rx, keys, handler, pattern });
};
export const setNotFound = (fn) => { notFound = fn; };

export function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/welkom';
  const [path, query = ''] = raw.split('?');
  return { path: path.replace(/\/+$/, '') || '/', query: Object.fromEntries(new URLSearchParams(query)) };
}

export function navigate(to, { replace = false } = {}) {
  const url = `#${to}`;
  if (replace) location.replace(url); else location.hash = to;
}
export const back = () => (history.length > 1 ? history.back() : navigate('/home'));

export async function resolve() {
  const { path, query } = parseHash();
  for (const r of routes) {
    const m = path.match(r.rx);
    if (m) {
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      current = { path, params, query, pattern: r.pattern };
      await r.handler({ params, query, path });
      window.scrollTo(0, 0);
      return;
    }
  }
  if (notFound) await notFound({ path });
}

export const currentRoute = () => current;
export const startRouter = () => { window.addEventListener('hashchange', resolve); return resolve(); };
