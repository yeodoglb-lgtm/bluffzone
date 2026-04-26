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

// fetch 핸들러: PWA 설치 조건만 충족, 실제 요청은 절대 건드리지 않음.
// (이전에 모든 GET을 가로채서 Supabase API 콜드 스타트 시 멈추는 문제 발견 → 완전 패시브로 전환)
// Chrome PWA install 요건상 fetch 리스너는 등록되어 있어야 하지만 respondWith를 호출하지 않으면
// 브라우저가 평소처럼 처리한다.
self.addEventListener('fetch', () => {
  // 의도적 빈 핸들러
});
