# BluffZone 프로젝트 운영 메모 (Claude용)

이 파일은 Claude 세션 간 컨텍스트 유지를 위한 **작업 지침 메모**입니다.
세션이 요약돼도 이 파일은 항상 로드되니, 중요한 운영 규칙은 여기에 적습니다.

---

## 🚀 배포 방법

### Vercel (프론트엔드)
- **자동** — `master` 브랜치에 푸시하면 자동 재배포.
- URL: https://bluffzone-iota.vercel.app
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

## 🔑 사용자 트리거 문구 (이 말 나오면 즉시 실행)

- "메모리 노트에 기재해둬" / "CLAUDE.md에 적어둬" / "기록해둬" / "저장해둬"
  → 직전 대화 맥락을 요약해서 CLAUDE.md에 추가
- "CLAUDE.md 뭐 있어?" / "뭐 기록돼있어?"
  → 파일 읽어서 보여주기
