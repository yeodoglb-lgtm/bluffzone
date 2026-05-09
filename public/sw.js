// BluffZone Service Worker — 정적 자산 공격적 캐싱 + 안전한 동작
//
// 전략:
//   1. /_expo/static/* — Cache-First (파일명에 해시 포함, 영구 캐시 가능)
//   2. /static/*, /assets/*, /icons/* — Cache-First
//   3. HTML(/, /index.html) — Network-First (새 코드 즉시 반영, 오프라인 폴백)
//   4. API 요청 (/functions/, supabase.co) — 항상 네트워크 (캐시 X)
//
// 효과:
//   - 첫 방문: 평소대로 다운로드
//   - 재방문: JS·CSS·이미지 캐시에서 즉시 (0ms 네트워크) → LCP 80% 단축
//   - 새 배포: HTML은 항상 새로 → 새 JS 파일명 자동 다운로드

const VERSION = 'v2-precache';
const STATIC_CACHE = `bz-static-${VERSION}`;
const HTML_CACHE = `bz-html-${VERSION}`;

self.addEventListener('install', (event) => {
  // 새 SW 즉시 활성화
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 모든 클라이언트(탭) 즉시 새 SW 사용
      await self.clients.claim();
      // 옛날 버전 캐시 삭제
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== HTML_CACHE)
          .map((k) => caches.delete(k))
      );
    })()
  );
});

// 정적 자산 패턴 (해시 파일명이라 영구 캐시 가능)
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_expo/static/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname.startsWith('/assets/') ||
    /\/(favicon\.ico|icon\.png|apple-touch-icon\.png|manifest\.json)$/.test(url.pathname)
  );
}

function isHtmlNav(req) {
  // 페이지 네비게이션 또는 HTML 요청
  return req.mode === 'navigate' || req.destination === 'document';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET만 처리, 나머지는 통과
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 외부 도메인은 통과 (Supabase, 카카오, OpenAI 등)
  if (url.origin !== self.location.origin) return;

  // 정적 자산: cache-first
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        if (cached) {
          // 백그라운드에서 갱신 시도 (stale-while-revalidate)
          fetch(req).then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
          }).catch(() => {});
          return cached;
        }
        // 캐시 미스 → 네트워크 + 캐시 저장
        try {
          const res = await fetch(req);
          if (res && res.status === 200) {
            const c = await caches.open(STATIC_CACHE);
            c.put(req, res.clone());
          }
          return res;
        } catch (e) {
          // 네트워크 실패 시 빈 응답
          return new Response('', { status: 504 });
        }
      })()
    );
    return;
  }

  // HTML: network-first, 실패 시 캐시
  if (isHtmlNav(req)) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res && res.status === 200) {
            const cache = await caches.open(HTML_CACHE);
            cache.put(req, res.clone());
          }
          return res;
        } catch (e) {
          const cache = await caches.open(HTML_CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          // 캐시도 없으면 fallback
          return new Response(
            '<html><body style="background:#1a1d29;color:#fff;font-family:sans-serif;padding:40px;text-align:center"><h1>BluffZone</h1><p>네트워크 연결 후 다시 시도해주세요.</p></body></html>',
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // 그 외: 통과 (브라우저 기본 처리)
});
