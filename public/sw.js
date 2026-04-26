// BluffZone Service Worker (최소 버전)
// 목적: Android Chrome의 PWA 설치 프롬프트 활성화 + 새 버전 자동 반영
//
// 캐시 전략: network-first (=항상 서버에서 새로 받음).
// 오프라인 지원은 베타 단계엔 안 함. 캐시 충돌로 인한 "옛날 코드 보임" 이슈를 막는 게 우선.

const VERSION = 'v1';

self.addEventListener('install', (event) => {
  // 새 SW가 즉시 활성화되도록
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 모든 클라이언트(탭)가 새 SW를 즉시 사용하도록
  event.waitUntil(self.clients.claim());

  // 옛날 캐시 다 지우기 (구버전 JS 안 보이게)
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
});

// fetch 핸들러: PWA 설치 가능 조건 충족용 (network-first, 캐시 안 함)
self.addEventListener('fetch', (event) => {
  // GET 요청만 처리 (POST/PUT 등은 그대로 통과)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => {
      // 네트워크 실패 시 fallback (오프라인 지원은 안 하니 빈 응답)
      return new Response('', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
