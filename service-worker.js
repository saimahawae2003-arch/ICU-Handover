const CACHE_NAME = 'icu-handover-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const isHtmlRequest =
    req.mode === 'navigate' ||
    (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'));

  // หน้า HTML หลัก: พยายามโหลดจากเน็ตก่อนเสมอ เพื่อให้เห็นเวอร์ชันล่าสุดทันที
  // ถ้าออฟไลน์/เน็ตหลุด ค่อย fallback ไปใช้ของที่แคชไว้
  if (isHtmlRequest) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return response;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // ไฟล์อื่นๆ (ไอคอน, manifest ฯลฯ) ที่ไม่ค่อยเปลี่ยน: ใช้แคชก่อนเพื่อความเร็ว
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req)
          .then((response) => {
            if (req.method === 'GET' && response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return response;
          })
          .catch(() => cached)
      );
    })
  );
});
