/* ==========================================================================
   ICU Smart Handover & SBAR System — Service Worker
   ==========================================================================
   ไม่ต้องทำอะไรเพิ่มทุกครั้งที่ deploy เวอร์ชันใหม่ — ไม่มีเลขเวอร์ชันให้ต้องจำเปลี่ยน

   หลักการ: ไฟล์นี้ใช้กลยุทธ์ Network-first ล้วนๆ
     - ตอนออนไลน์ ทุก request จะไปที่เซิร์ฟเวอร์ก่อนเสมอ ได้เนื้อหาล่าสุดชัวร์ 100%
       แล้วค่อยเซฟทับของเก่าในแคชไว้เงียบๆ (key เดียวกัน = เขียนทับอัตโนมัติ ไม่มีของค้าง)
     - ตอนออฟไลน์/เน็ตหลุด ค่อย fallback ไปใช้ของที่แคชไว้ล่าสุด ให้แอปยังเปิดได้
   เพราะฉะนั้นแค่แก้ index.html แล้วอัปขึ้น GitHub/เซิร์ฟเวอร์ตามปกติ ผู้ใช้ที่เปิดแอปใหม่/รีเฟรชหน้า
   จะเจอเวอร์ชันล่าสุดเองทันทีโดยไม่ต้องยุ่งกับไฟล์นี้เลย

   (ไฟล์นี้จะโดนแตะก็ต่อเมื่อผู้ใช้ต้องการแก้พฤติกรรมออฟไลน์เอง เช่น เปลี่ยนกลยุทธ์แคช)
   ========================================================================== */

const CACHE_NAME = 'icu-handover-cache';

/* ---- Activate: เคลียร์แคชเก่าที่หลงเหลือจากไฟล์เวอร์ชันก่อนหน้านี้ (ถ้ามี) แค่ครั้งเดียวตอนติดตั้งใหม่ ---- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---- (ยังรองรับไว้เผื่ออนาคต) รับคำสั่งจากหน้าเว็บให้สลับ SW เวอร์ชันใหม่ทันทีถ้ามีการแก้ไขไฟล์นี้เอง ---- */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* ---- Fetch: Network-first — ดึงจากเครือข่ายก่อนเสมอแล้วเขียนทับแคชเดิมด้วย key เดียวกัน
   จึงไม่มีคำว่า "เวอร์ชันเก่าค้าง" ให้ต้องเคลียร์เอง เพราะของเก่าถูกเขียนทับสดใหม่ทุกครั้งที่ออนไลน์ ---- */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request, clone))
          .catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

