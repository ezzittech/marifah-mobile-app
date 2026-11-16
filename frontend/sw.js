// App-shell cache. API responses are NEVER cached (they contain private student data).
const CACHE = 'marifah-shell-v1';
const SHELL = [
  './', 'index.html', 'config.js', 'manifest.json', 'icons/icon.svg',
  'css/main.css', 'css/components.css', 'css/screens.css',
  'js/app.js', 'js/api.js', 'js/auth.js', 'js/i18n.js', 'js/ui.js', 'js/mock.js',
  'js/screens/login.js', 'js/screens/home.js', 'js/screens/finance.js',
  'js/screens/academic.js', 'js/screens/profile.js', 'js/screens/password.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) return; // go straight to network
  if (url.origin !== location.origin) return;                          // fonts etc: browser cache
  // network-first so updates arrive quickly; fall back to cache when offline
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
