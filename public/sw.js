// 離線快取：導覽（index.html）走 network-first，部署新版後第一次載入就能更新；
// 其餘資源（帶 hash 的 js/css 等）維持 cache-first + 背景更新。首次造訪後即可離線遊玩。
const CACHE = 'pixel-hull-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** 資源帶 content hash，舊版本永遠不會再被引用：依最新 index.html 清掉沒被引用的，避免快取無限成長 */
async function pruneStaleAssets(cache, html) {
  const keys = await cache.keys();
  const stale = keys.filter(
    (req) => req.url.includes('/assets/') && !html.includes(req.url.split('/').pop()),
  );
  await Promise.all(stale.map((req) => cache.delete(req)));
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // 導覽 network-first：拿到新版 index.html 就更新快取並清舊資源；離線才退回快取
      if (event.request.mode === 'navigate') {
        try {
          const res = await fetch(event.request);
          if (res.ok) {
            await cache.put(event.request, res.clone());
            await pruneStaleAssets(cache, await res.clone().text());
          }
          return res;
        } catch (err) {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw err;
        }
      }
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
