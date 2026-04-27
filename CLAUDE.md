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

## 🧠 핸드리뷰 품질 강화 로드맵 (진행중)

**목표**: 핸드리뷰 결과를 GTO 기반으로 더 깊이 있게.

### 2단계 전략
- **1단계 (지금 진행)**: `claude-proxy` 안의 핸드리뷰 system prompt에 GTO 일반 지식 + 코칭 룰 직접 박기.
  - 길이 가이드: 5K 토큰 안쪽 유지 (그 이상은 주의력 분산 위험).
  - OpenAI prompt cache 자동 적용 → 비용 부담 적음.
  - 추가할 카테고리 후보: 포지션별 오픈/3벳 레인지, C-bet 사이징(드라이/웻), SPR별 전략, 빌런 타입별 익스플로잇, 보드 텍스처별 예시.
- **2단계 (자료 모이면)**: pgvector(Supabase 내장) + RAG. 책/Solver 출력/차트를 청크로 쪼개 임베딩 저장 → 핸드별로 유사 자료 검색해서 동적 첨부.

### 현재 상태
- GTO 자료 파일 없음 (사용자도, Claude도). Claude의 일반 GTO 지식만으로 1단계 진행.
- 자료 확보 출처: GTOWizard 무료차트, Upswing 블로그, Modern Poker Theory 등.

### 핸드리뷰 system prompt 위치
`supabase/functions/claude-proxy/index.ts` line ~969 (`const systemPrompt = ...`).
현재 구조: [페르소나] [분석 축 4개] [절대 규칙 10개] [출력 스키마] [풀 예시 1쌍].

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

## 🔑 사용자 트리거 문구 (이 말 나오면 즉시 실행)

- "메모리 노트에 기재해둬" / "CLAUDE.md에 적어둬" / "기록해둬" / "저장해둬"
  → 직전 대화 맥락을 요약해서 CLAUDE.md에 추가
- "CLAUDE.md 뭐 있어?" / "뭐 기록돼있어?"
  → 파일 읽어서 보여주기
