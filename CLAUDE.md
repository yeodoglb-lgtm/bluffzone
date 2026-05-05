# BluffZone 프로젝트 운영 메모 (Claude용)

이 파일은 Claude 세션 간 컨텍스트 유지를 위한 **작업 지침 메모**입니다.
세션이 요약돼도 이 파일은 항상 로드되니, 중요한 운영 규칙은 여기에 적습니다.

---

## 🌐 도메인

- **메인**: `bluffzone.kr` (가비아 등록, 2026-04-27, 1년)
  - 등록자: 기관(사업자), 등록정보숨김 ON
  - 가비아 DNS 관리툴: A 레코드 `@ → 216.198.79.1`, CNAME `www → 22b58c8a0b8256c4.vercel-dns-017.com.`
- **www.bluffzone.kr**: → `bluffzone.kr` 308 영구 리다이렉트
- **백업**: `bluffzone-iota.vercel.app` (Vercel 기본, 영구 유지)
- 마케팅·공유 시 `https://bluffzone.kr` 단일 노출

---

## 🚀 배포 방법

### Vercel (프론트엔드)
- **자동** — `master` 브랜치에 푸시하면 자동 재배포.
- URL: https://bluffzone.kr (메인) / https://bluffzone-iota.vercel.app (백업)
- GitHub 500 뜨면 빈 커밋(`git commit --allow-empty`)으로 재트리거.

### Supabase Edge Functions (백엔드) ✅ Claude가 직접 배포
**CLI 인증 살아있음** — `npx supabase functions deploy {name} --project-ref chxcayaehgwqrpjuajqx --no-verify-jwt`
Docker 없어도 됨 (WARNING은 무시). 배포 후 `functions list`로 VERSION 증가 확인.

만약 CLI 인증 만료되면 → 사용자에게 **대시보드 복붙 방식** 안내:
1. 로컬 파일 (`supabase/functions/{함수명}/index.ts`) 전체 복사
2. https://supabase.com/dashboard → `bluffzone_seoul` → Edge Functions → 해당 함수
3. 코드 교체 → **Deploy updates** → "Successfully deployed" 확인

**프로젝트 ref**: `chxcayaehgwqrpjuajqx`
**현재 배포된 Edge Functions**: `claude-proxy`, `whisper-proxy`

---

## 🤖 AI 모델 트랙 (확정)

| 용도 | 모델 | 엔드포인트 |
|---|---|---|
| 핸드 리뷰 | `gpt-4o` | `/hand-review-gpt` |
| 음성 → 핸드 자동입력 | `gpt-4o` | `/parse-voice` |
| 일반 AI 채팅 | `gpt-4o-mini` | `/chat` |
| 음성 전사 | `whisper-1` | `/whisper-proxy` |

- Anthropic Claude는 **더 이상 안 씀**. 과거 `claude-sonnet-4-6` 참조는 deprecated.
- 모델 변경 시 서버 기본값만 건드리고, 클라이언트는 건드리지 말 것.

---

## 🎨 UI 정책

### 설정 화면에서 **숨긴 것** (유저 선택 불가, 서버 고정값)
- AI 모델 선택
- 자동 리뷰 토글 (유저가 원할 때만 수동 리뷰)
- 음성 입력 엔진 선택 (Whisper 고정, 기기 STT 미구현)

주석으로 복구 가능하게 남겨둠 — `SettingsScreen.tsx` 참고.

### 네이밍 통일
- 홈 배너: "블러프존 홀덤 알파고" / 서브 "당신의 홀덤 고민, 지금 바로 답해드립니다"
- AI 채팅 화면: "블러프존 홀덤 알파고"
- 핸드 리뷰: "블러프존 홀덤 알파고 핸드리뷰" / 버튼 "리뷰 요청"

---

## 🎙️ 음성 입력 아키텍처

- 웹: `MediaRecorder` API (`src/hooks/useVoiceRecorder.ts`)
- 네이티브: 미구현 (나중에 `expo-av`로 확장 예정)
- 전사: **항상 Whisper** (플랫폼 무관, 클라우드 API라 웹/앱 공통)
- Whisper `prompt` 파라미터는 **224 토큰 제한** — 힌트 넣을 때 주의.

---

## 💾 DB 테이블

- `ai_chats`, `ai_messages`: AI 채팅 영속화 (RLS 적용, 유저별 분리)
- `ai_usages`: AI API 사용량 기록 (`kind` 컬럼 사용, **`feature` 아님**)
- `hand_review_cache`: 동일 핸드 리뷰 결과 캐싱 (cache_key 기반)
- `feedback`: 사용자 의견 박스 (베타 출시 시 추가, 2026-04-27)
  - 컬럼: id, user_id, category('general'|'bug'|'feature'|'praise'), subject, content, status('new'|'read'|'replied'|'closed'), admin_note, user_email, user_agent, created_at, updated_at
  - RLS: 본인은 자기 의견만 / 어드민은 전체 조회·수정
  - 화면: FeedbackScreen (작성), MyFeedbackListScreen (이력), AdminFeedbackScreen (어드민)
  - 진입점: 대시보드 BetaBanner / 설정 "고객 지원" 메뉴 / 어드민 상단 CTA

---

## 📝 대화 스타일 규칙

- 답변은 한국어로, 간결하게.
- 이모지는 섹션 구분·강조용 정도만. 남발 금지.
- 작업 후에는 **Vercel + Supabase 양쪽 배포 여부** 반드시 함께 안내.
  (한쪽만 안내하면 사용자가 "장난쳐?" 함. 과거 실수 반복 금지.)

## 🧭 프로젝트 진행 패턴 (사용자 선호)

새 프로젝트나 다단계 작업이 시작되면:

1. **첫 응답에 전체 흐름·스케줄 정리** — 몇 단계인지, 누가(사용자/Claude) 어디서 작업하는지, 예상 시간, 우선순위
2. **사용자가 한 단계씩 처리하는 동안 Claude가 매번 다음 단계 자동 안내**
   - 사용자가 step N 끝났다고 하면 → 즉시 step N+1 가이드
   - "다음은 ~ 하시면 됩니다" 능동적으로 알려주기
   - 사용자가 "다음 뭐 해?" 매번 물어볼 필요 없게
3. **참고 모범 사례**: SEO 셋업 (Search Console 소유권 확인 → 사이트맵 제출 → URL 인덱싱 → 네이버 등록) 순서대로 자동 안내한 흐름.
4. **사용자가 막힌 화면 캡쳐 보내면**: 그 화면에서 정확히 어디 클릭/입력해야 하는지 한 번에 안내. 추측 말고 보이는 그대로 짚어주기.

## 🧠 CLAUDE.md 자동 업데이트 원칙

사용자가 매번 "기록해둬" 말하지 않아도 **아래 경우엔 Claude가 먼저 기록한다**:

1. **사용자가 특정 절차/방법을 알려준 경우** (예: "대시보드 복붙 방식으로 배포함")
2. **사용자가 "장난쳐", "왜 까먹어", "기억 좀 해" 류 불만을 낸 경우**
   → 해당 건 즉시 기록 + 짜증난 이유까지 남겨서 재발 방지
3. **모델/엔드포인트/DB 스키마가 변경된 경우**
4. **UI 정책(숨김/표시, 네이밍)이 확정된 경우**
5. **사용자가 거부한 접근/선호하지 않는 방식** (예: CLI 말고 대시보드 복붙 선호)

기록 후에는 **"CLAUDE.md에 기록해뒀습니다"** 한 줄 언급해서 사용자가 확인 가능하게.

## 🔐 이메일 인증 상태 (확인 완료)

- **Supabase Auth → Authentication → Sign In / Providers → User Signups → Confirm email**: ✅ ON (2026-04-27 확인).
- 신규 회원가입 시 이메일 인증 링크 발송 → 사용자가 클릭해야 로그인 가능.
- 무료 티어 발송 한도: 시간당 ~30건 / 일 ~100건. 베타엔 충분, 폭발 시 SMTP 외부 연결 (SendGrid 등) 검토.

---

## 🧠 핸드리뷰 RAG 시스템 (1, 2단계 모두 완료, 2026-04-27)

### 1단계: 시스템 프롬프트에 GTO 지식 박기 ✅ 완료
- `supabase/functions/claude-proxy/index.ts` `systemPrompt` 변수
- 약 5K 토큰: [페르소나] + [분석 축 4개] + [GTO 가이드라인 5섹션] + [절대 규칙 ①~⑮] + [출력 스키마] + [풀 예시 3개]

### 2단계: pgvector RAG ✅ 완료
- **DB 테이블**: `book_chunks` (id, book_title, content, embedding vector(1536), token_count)
- **검색 함수**: `match_book_chunks(query_embedding, match_count)` RPC, 코사인 유사도
- **임베딩 모델**: `text-embedding-3-small` (1536차원)
- **저장된 청크 (총 1,000개)**:
  - Play Optimal Poker 1: 301 청크
  - Play Optimal Poker 2: 256 청크
  - Modern Poker Theory: 443 청크
- **인제스션 스크립트**: `scripts/ingest-books.mjs` (pdf-parse 1.1.1 + mammoth + OpenAI embeddings)
- **검색 동작**: hand-review-gpt 호출 시 핸드 정보 영어 요약 → 임베딩 → 상위 5 청크 검색 → systemPrompt에 동적 주입
- **graceful degradation**: RAG 실패 시 기본 systemPrompt만으로 진행
- **디버그 메타**: 응답 JSON `_rag = { used, chunks, top_similarity }` + 로그 `[hand-review-gpt] RAG: N chunks retrieved`
- **비용**: 리뷰당 +$0.005 (임베딩 + 추가 토큰)

### RAG 인용 톤 정책
- **책·저자 이름 절대 노출 금지** ("Play Optimal Poker", "Modern Poker Theory" 등)
- 대신 권위 있는 표현 12개 변형 (system prompt 절대 규칙 ⑮):
  - "GTO 이론에 따르면...", "솔버 기반 분석에 따르면...", "GTO 관점에서 이 스팟을 분석하면..." 등
- streets[] comment 4개 중 **정확히 1개, 최대 2개**에만 사용 (전부 어색, 0개 무시)
- 가장 중요한 의사결정 스트리트에 우선

### 절대 규칙 ⑪~⑮ (액션 정확성 + 톤 강제)
- ⑪ 액션 시간순 거꾸로 읽기 금지
- ⑫ 올인+콜 후 자동진행 스트리트 = streets[s] = null (가짜 액션 추천 금지)
- ⑬ 추천 액션 유효성: 빌런 베팅 후 히어로 체크 추천 금지 등
- ⑭ 히어로 실제 액션 정확히 표현 (콜한 거 → "올인" 표현 금지)
- ⑮ 권위 GTO 톤 의무 (1~2개 comment 필수)

### 추가 개선 여지 (선택)
- **3단계 (자료 더 모이면)**: GTOWizard 차트 수기 정리해서 system prompt에 추가
- **MPT 영문 책이라 청크 일부 검색 적중률 낮을 수 있음**: 한국어 GTO 자료 추가 검토 가능
- **RAG 효과 평가**: 베타 사용자 피드백 + 응답에 책 출처 디버그 노출 (어드민용)

---

## 🚀 베타 출시 준비 8단계 (2026-04-27 모두 완료)

| # | 항목 | 상태 / 비고 |
|---|---|---|
| 1 | Sentry 에러 추적 | ✅ DSN: `https://cd4a669386b59099fd4284485753708f@o4511286519267328.ingest.us.sentry.io/4511286554394624`. 프로젝트명 `react-native`. Vercel env: `EXPO_PUBLIC_SENTRY_DSN`. Production+Preview 체크. `@sentry/browser` 사용 (RN SDK는 Expo 웹 빌드 호환성 X). |
| 2 | 온보딩 개선 | ✅ Dashboard 신규유저 CTA(핸드 0개일 때 큰 주황 카드) + HandList 빈 상태 큰 버튼 + HandEditor 음성 입력 안내문구. |
| 3 | PWA + 인앱 브라우저 + 아이콘 + 뒤로가기 | ✅ public/manifest.json, public/sw.js (passive, fetch 핸들러 빈 채로 install eligibility만), App.tsx OG 태그+SW 등록, RootNavigator linking 설정 (URL ↔ 화면 매핑). 카톡/네이버 등 인앱 브라우저 → Chrome 자동 전환 (Android intent://, iOS googlechromes://). |
| 4 | 도메인 구매 | ✅ bluffzone.kr 가비아. |
| 5 | 도메인 Vercel 연결 | ✅ A 레코드 + CNAME(www) + 308 리다이렉트. |
| 6 | 이메일 인증 ON | ✅ 처음부터 ON 상태였음. Site URL = `https://bluffzone.kr`. Redirect URLs 5개 (bluffzone.kr/**, www.bluffzone.kr/**, bluffzone-iota.vercel.app/**, localhost:3000/**, localhost:8081/**). |
| 7 | OpenAI 사용량 알림 | ✅ Prepaid $5 + 80%·100% 알림 등록 (Hard limit은 prepaid라 무의미). |
| 8 | 유저 모집 | 🟡 진행 중 — 포커고수 핸드리뷰 게시판에 시드 유저인 척 글 1개 등록 (2026-04-27). 1~2일 자연 활동 후 솔직 공개로 자유게시판 + 다른 카페 확장 예정. |

---

## 🛡️ 안정성 / 인프라 보강 (2026-04-27)

### Supabase 콜드 스타트 fix (3겹 안전망)
콜드 스타트 시 사용자 무한 로딩 컴플레인 → 다음 모두 적용:
1. **GitHub Actions cron 5분 keep-alive** — `.github/workflows/supabase-keep-alive.yml`. REST API + Auth + Edge Function 3개 ping. public/private 무료 충분.
2. **Supabase fetch 12초 타임아웃** — `services/supabase.ts`의 `fetchWithTimeout`. AbortController 기반.
3. **Promise.race 15초 강제 타임아웃** — `services/queryTimeout.ts`의 `withTimeout`. fetch 레벨 타임아웃이 supabase-js에서 swallow되는 케이스 대비. `services/hands.ts`, `sessions.ts`, `auth.ts`, `feedback.ts`의 모든 read 함수에 적용.
4. **React Query retry: 2 + 지수 백오프** (1s → 2s → 4s) — `App.tsx` queryClient 설정.
5. **Auth fallback 30초** (이전 2초) — `useAuth.ts`. 콜드 스타트 시 fallback이 너무 빨리 발동해 쿼리들이 미인증 상태로 시작하던 문제 해결.
6. **로딩 스크린 진행 안내** — `RootNavigator.tsx` LoadingScreen. 4초 후 "서버 연결 중...", 12초 후 "10초 정도 기다려주세요".

→ Supabase Pro 업그레이드($25/월)는 보류. 위 fix로 해결.

### 핸드리뷰 캐시 무효화
- `hand_review_cache` 테이블 cache_key 기반 캐싱 → "다시 분석" 버튼이 캐시 그대로 반환하던 문제.
- claude-proxy `/hand-review-gpt`에 `force_refresh: true` 파라미터 추가.
- HandDetailScreen 의 "다시 분석" 버튼은 `handleRequestReview(true)`로 호출 → 캐시 삭제 후 GPT 재호출.
- "리뷰 요청" (최초)은 `force_refresh=false` (캐시 활용).

### 핸드리뷰 시스템 프롬프트 강화 (GTO 1단계 완료)
- `supabase/functions/claude-proxy/index.ts` `systemPrompt`. 약 5K 토큰. 5개 GTO 섹션 + 풀 예시 3개.
- 절대 규칙 ⑫ 추가: **올인+콜 후 자동진행 스트리트는 streets[s]=null 처리** (가짜 액션 추천 차단).
- comment 톤: 90~150자, 전문용어 괄호 인라인 풀이 강제.
- 액션 순서 거꾸로 읽기 금지 규칙(⑪).

### parse-voice 강화
- BB 사이즈 사용자 지정 → bb_krw 파라미터 (HandEditorScreen 입력칸 + Settings 기본값 `defaultBbKrw`).
- 림프/SB/BB 콜 amount 자동 차감 계산 (system prompt 규칙 + 예시).
- multi-villain 지원 (villain1/2/3).

---

## 🎨 UX 개선 (2026-04-27)

### 핸드 상세 화면 가로 컬럼 + 말풍선
- 기존 세로 액션 리스트 → 가로 스크롤 컬럼 (Pre-Flop / Flop / Turn / River).
- 말풍선: 흰색(call/check) / 노랑(raise/bet/allin) / 회색(fold).
- 포지션 칩 두 줄 (CO / 나) — 11pt.
- 금액 표시 만 단위 (5000 → 0.5만, 240000 → 24만, 1100000 → 110만). `formatAmountInMan` 헬퍼.

### 핸드 편집 화면
- 스트리트 헤더(프리플랍/플랍/턴/리버) 가로 전체 폭 + 가운데 정렬 + 폰트 base + 컬러바 두께.
- 카드 입력 placeholder: 1장 입력 후 "?" 회색 점선 슬롯 표시 → 사용자가 "다음 카드" 위치 알게.

### PWA 설치 카드 (대시보드 하단)
- 인앱 브라우저(카톡 등): 앱 아이콘 + "이제 블러프존 앱으로 편하게 이용하세요" + 탭 시 Chrome 자동 호출 (intent:// 또는 googlechromes://) + fallback 모달.
- Android Chrome (beforeinstallprompt 발화): 📲 "홈 화면에 앱 설치" 11pt 큰 글씨.
- PC Chrome/Edge: 🖥️ "바탕화면에 앱 설치".
- iOS Safari: 📲 "Safari 공유 메뉴에서 추가하세요" + 안내 모달.

### 약관/개인정보 ScrollView 모바일 PWA 스크롤
- Flexbox 자식 minHeight 이슈 → `useWindowDimensions`로 명시적 픽셀 높이 (`viewportHeight - 60`) 적용 (web only).

---

## 📣 마케팅 채널 (베타 출시)

### 한국 홀덤 커뮤니티 우선순위
1. 포커고수 (https://www.pokergosu.com) — 국내 최대, 가장 활성화
2. 포커라이프 (https://pokerlife1.com) — 종합 정보, 카카오 오픈채팅방 연계
3. 홀사모 네이버 카페 (https://cafe.naver.com/fulpotholsamo) — 5천+ 회원, 2012~
4. 디시 포커 마이너 갤러리 (https://gall.dcinside.com/mgallery/board/lists/?id=poker)
5. 홀덤민족 (https://holdempeople.com) — 펍 검색 + 커뮤니티
6. 더포커 (https://thepoker.co.kr)
7. 카카오 오픈채팅방 (홀덤·포커 검색)

### 운영자 정체 / 톤
- 익명 "블러프존 팀" 또는 1인 개발자 톤
- 솔직 공개 ("제가 만들었어요") + 베타 테스터 부탁
- 디시 포커갤은 캐주얼·간결, 광고 티 X
- 각 사이트 자유게시판 광고 정책 사전 확인 필수

### 시드 활동 전략 (현재 진행 중)
- 본인이 시드 유저처럼 활동 (핸드리뷰 게시판 글 등록)
- 1~2일 자연스러운 활동 후 자유게시판에 솔직 공개 시도
- 누가 물으면: "친구가 만든 앱이라 써보고 있어요" 또는 "제가 만든 거예요, 친구들끼리 쓰다가 공유해보려고요"

### 피드백 채널
- 외부 채널(카톡 오픈채팅, 디스코드) 사용 안 함
- **앱 안 의견 박스 단독** — 설정 메뉴 + 대시보드 BetaBanner

---

## 🔍 SEO 셋업 (2026-04-27 완료)

### 등록·소유권 확인
- **Google Search Console**: 소유권 확인 ✅, 사이트맵 제출 ✅, URL 색인 요청 ✅
  - 인증: `<meta name="google-site-verification" content="NB2chWKouxCSiDRLlpHBkPfr0WNBqWWzunSWZjTDEUw">`
- **네이버 서치 어드바이저**: 소유권 확인 ✅, 사이트맵 제출 ✅, 웹페이지 수집 요청 ✅
  - 인증: `<meta name="naver-site-verification" content="7c3a14db08b83a90fa060434fd26ced33c6e9943">`

### 정적 파일
- `public/sitemap.xml`: 4개 URL (/, /login, /terms, /privacy)
- `public/robots.txt`: User-agent: * Allow:/ + Sitemap 위치 + Disallow: /admin
- `public/index.html`: title·description·keywords·canonical·OG·Twitter·JSON-LD WebApplication 구조화 데이터·소유권 인증 태그

### 노출 예상 시기
- Google: 첫 인덱싱 3~7일, 정상 노출 1~3주
- 네이버: 1~2주 인덱싱, 2~4주 정상 노출
- 백링크가 검색 순위 결정의 핵심 → 커뮤니티 글에 `bluffzone.kr` 링크 포함 활동이 SEO의 실질적 작업

---

## 🔑 외부 키 / 인증 정보 (참조용, 절대 공개 금지)

⚠️ 아래 정보는 절대 외부 노출 금지. 채팅창·git·문서 등에 평문 노출 X.

### Supabase
- **Project ref**: `chxcayaehgwqrpjuajqx`
- **URL**: `https://chxcayaehgwqrpjuajqx.supabase.co`
- **anon key**: `.env`의 `EXPO_PUBLIC_SUPABASE_ANON_KEY` 참조
- **service_role key**: Dashboard → Settings → API → service_role (🔒)

### Sentry
- **DSN**: `https://cd4a669386b59099fd4284485753708f@o4511286519267328.ingest.us.sentry.io/4511286554394624`
- **Vercel env**: `EXPO_PUBLIC_SENTRY_DSN` (Production+Preview)
- **프로젝트명**: `react-native`, **Org**: `yeodo`

### OpenAI
- **운영 키** (Supabase Edge Function `OPENAI_API_KEY` 비밀): claude-proxy / whisper-proxy 모두 사용
- **Prepaid**: $5 (충전), 80%·100% 이메일 알림 등록
- **임시 키 (RAG ingestion용 2026-04-27 발급)**: 사용 후 즉시 Revoke 권장
- **사용 모델**: gpt-4o (review/parse-voice), gpt-4o-mini (chat), text-embedding-3-small (RAG), whisper-1

### 도메인
- **bluffzone.kr** (가비아, 2026-04-27 등록, 1년)
- A 레코드: `@ → 216.198.79.1`
- CNAME: `www → 22b58c8a0b8256c4.vercel-dns-017.com.`

### GitHub Actions
- **Workflow**: `.github/workflows/supabase-keep-alive.yml`
- 5분마다 Supabase REST + Auth + Edge Function ping (cold start 방지)

### Anthropic (Claude API — 핸드 리뷰)
- **API 키**: Supabase Edge Function 시크릿 `ANTHROPIC_API_KEY`
- **모델**: claude-sonnet-4-5 (hand-review-gpt 엔드포인트, 2026-05-01 전환)
- **요금**: $5 충전 (~150회 리뷰)
- **fallback**: 키 없으면 자동으로 GPT-4o 사용

### Kakao Local API (좌표 변환 + 펍 검색)
- **REST API 키**: `c2caf40017d212df12f9b050c7d74c56`
- **사용**: 주소 → 좌표 변환, "홀덤펍" 키워드 검색
- **무료 한도**: 일 100,000 호출
- **엔드포인트 예시**:
  - 키워드 검색: `https://dapi.kakao.com/v2/local/search/keyword.json?query=...`
  - 주소→좌표: `https://dapi.kakao.com/v2/local/search/address.json?query=...`
- **헤더**: `Authorization: KakaoAK c2caf40017d212df12f9b050c7d74c56`

### Kakao Maps JavaScript SDK (지도 임베드)
- **JavaScript 키**: `1c42d577c0b7dc9f62da99bea9dc57f5`
- **앱 ID**: 1447626 (BluffZone)
- **로드 방법**: public/index.html에 script 태그
  ```html
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=1c42d577c0b7dc9f62da99bea9dc57f5&autoload=false"></script>
  ```
- **도메인 등록**: 미등록 (B 옵션 — 등록 없이 시도 중, 차단되면 그때 등록)
- **사용 위치**: PlacesMapScreen 풀 임베드 지도

---

## 🏪 홀덤펍 데이터 수집 (2026-05-04, 진행 중)

### 수집 완료
저장 위치: `C:\Users\ghkdr\OneDrive\바탕 화면\블러프존_펍데이터`
- **runnerrunner-pubs.json/csv** (890개) — lat/lng·전화·게임타입·바이인 다 포함, **카카오 변환 불필요**
- **holdempeople-pubs.json/csv** (159개) — 이름·시구만 추출, 좌표·전화 비어있음 → **카카오 검색으로 보완 필요**

### 데이터 source 분석
- 러너러너 890 vs 홀덤민족 159 → 겹침 47개, 홀덤민족만 112개
- 러너러너 only: 843 / 홀덤민족 only: 112 / 합치면 약 1,000개

### 러너러너 API
- 엔드포인트: `https://api.runnerrunner.co.kr/nest/pub/search` (POST)
- 인증: JWT Bearer (사용자 계정 토큰)
- Payload: `{ lat, lon, km, sort: 'distance' }`
- **사용자 토큰은 30일 만료** — 다시 받으려면 사용자가 F12 → Network → pub/search 헤더 재추출

### 다음 단계 (보류 — 사용자 요청)
- 사용자가 "플레이스 메뉴 정비 먼저 하자" 라고 함 (2026-05-04)
- 등록 작업은 메뉴 정비 후 진행

---

## 📨 펍 일괄 SMS 발송 + 구글폼 등록 프로젝트 (2026-05-04 시작)

### 컨셉
한국 캐쉬게임 회색지대 회피 위해 **운영자가 직접 등록 X** → 매장에 SMS로 동의 받고 매장이 직접 정보 제출. "광고 게시" 책임을 매장 측으로 분산.

### 발신번호 (STEP 1) ✅ 결정
- **A. 운영자 본인 휴대폰 번호** (별도 비용 없음, 며칠 시끄러울 수 있음 감수)

### SMS 서비스 (STEP 2)
- **알리고** (smartsms.aligo.in) 사용 예정
- 운영자가 직접 가입 + 본인폰 발신번호 등록 (영업일 1~2일 승인)
- 충전 1만원 = SMS 1,250건 / LMS 400건
- 890건 × LMS 25원 ≈ **약 2.2만원**
- API 키 받으면 Claude가 발송 스크립트 작성

### 전화번호 정제 (STEP 3) — Claude 즉시 작업
- `C:\Users\ghkdr\OneDrive\바탕 화면\블러프존_펍데이터\runnerrunner-pubs.json` 890개에서 phone 추출
- 010-XXXX-XXXX 정규화, vcn(0503) 제외, 중복/유효성 체크
- 결과: 정제된 매장명+전번 CSV 저장

### 구글폼 (STEP 4) ✅ 완료 (2026-05-05)
- 폼 제목: "블러프존 앱 플레이스 무료 등록 신청"
- 단축 URL (SMS용): https://forms.gle/eiAJR4W2AhazaxkW7
- 응답 시트 ID: 1-KbZtgkQwfnjFpVKWdWIhrE1pB5HiXcwqpZDzOCNqis
- 문항: 매장명, 주소(도로명), 대표전화, 매장사진(필수, 최대 5장), 운영시간, 운영게임(토너/일반/둘다), 매장룰, 등록동의
- **사진 필수** (회신율↓ but 데이터 품질↑ — 운영자 결정)
- "사진 활용 동의" 항목 삭제됨 (사진 필수라 불필요)
- 응답 시트 자동 연동 완료
- ⚠️ forms.gle 단축 URL은 "URL 단축" 체크 다시 누르면 새로 발급됨 — 한번 정한 URL 일관 사용 (위 URL 고정)

### 메시지 문구 (STEP 5) ✅ 확정 (2026-05-05)
LMS, 약 200자 / 건당 25원:
```
[블러프존 매장 등록 안내]

안녕하세요, 사장님!
홀덤 매니저 앱 '블러프존(bluffzone.kr)'입니다.

저희 앱 유저분들께 전국 홀덤 플레이스를
무료로 소개해드리고 있습니다.

귀 매장 등록을 원하시면 아래 링크에서
정보 입력 + 매장 사진 업로드 부탁드립니다.
👉 https://forms.gle/eiAJR4W2AhazaxkW7

소요 시간: 약 1~2분
문의·수신거부: (발신번호로 회신)
※ 1회 발송 / 재발송 없음
```

### 발송 (STEP 6, 7)
- 테스트 50건 → 회신율 5% 이상 확인 후 본 840건
- 평일 오전10~오후5 발송, 분당 30건 제한 (스팸필터 회피)
- 1회 발송 원칙 (재발송 금지, 법적 안전선)

### 1차 스크린 (STEP 8) — Claude 자동
구글시트 CSV 받아서:
- ✅ 즉시 등록 가능 (필수 정보 + 사진 + 동의 체크)
- ⚠️ 운영자 확인 필요 (좌표 변환 실패 / 민감 단어 "캐쉬·현금·5/10" 포함 / 사진 누락)
- ❌ 정보 부족

### DB 등록 (STEP 9) — Claude
- Supabase places 테이블에 INSERT
- 이미지 → Supabase Storage 업로드 → URL 저장
- 카카오 REST로 좌표 검증

### 화면 정비 (STEP 10) — Claude 사전 작업
- PlaceDetailScreen에 면책 고지 추가 (불법 사행행위 권장 X 명시)
- "캐쉬" 표현 검수
- places 테이블 컬럼 확인 (external_id, images 등)

### 🙈 플레이스 메뉴 숨김 정책 (2026-05-05)
- **하단 탭에서 플레이스 메뉴 숨김** (어드민 계정에만 표시)
- 코드: `MainTabNavigator.tsx`의 `<Tab.Screen name="PlacesTab">` 블록을 `{isAdmin && (...)}`로 감쌈
- 이유: 유튜버 광고 시 "수익성 목적 짙음" 인상 회피 → 광고비 절감
- 운영자(어드민)는 계속 작업 가능 (펍 등록/검수)
- 유저 충분히 모은 후 정식 오픈 예정

### 법적 안전선 (회색지대 회피)
- 매장이 **자발적으로** 정보 제출 + 동의 체크 → 운영자 광고 책임 분산
- 1회 발송 원칙 (반복 발송 X)
- 야간(21:00~08:00) 발송 금지
- 메시지에 수신거부 안내 명시
- 화면에 "캐쉬·현금" 단어 절대 X — "라이브 게임 / 정기 운영 / 매장 문의"로 우회

---

## 🔑 사용자 트리거 문구 (이 말 나오면 즉시 실행)

- "메모리 노트에 기재해둬" / "CLAUDE.md에 적어둬" / "기록해둬" / "저장해둬"
  → 직전 대화 맥락을 요약해서 CLAUDE.md에 추가
- "CLAUDE.md 뭐 있어?" / "뭐 기록돼있어?"
  → 파일 읽어서 보여주기
