-- ──────────────────────────────────────────────────────────────────────────────
-- hands
-- ──────────────────────────────────────────────────────────────────────────────
create table public.hands (
  id                uuid          primary key default uuid_generate_v4(),
  user_id           uuid          not null references auth.users(id) on delete cascade,
  session_id        uuid          references public.sessions(id) on delete set null,
  played_at         timestamptz   not null default now(),

  -- 스테이크/포지션
  game_type         text          not null default 'NLH'
                                  check (game_type in ('NLH','PLO','Tournament','PLO5','Mixed')),
  stakes            text,
  hero_position     text
                    check (hero_position in ('UTG','UTG+1','MP','HJ','CO','BTN','SB','BB')),
  villain_position  text
                    check (villain_position in ('UTG','UTG+1','MP','HJ','CO','BTN','SB','BB')),

  -- 카드
  hero_cards        jsonb         not null default '[]',
  villain_known     boolean       not null default false,
  villain_cards     jsonb,
  board             jsonb,        -- 최대 5장

  -- 액션 로그
  actions           jsonb         not null default '[]',

  -- 결과
  result            text          check (result in ('won','lost','chopped','folded')),
  pot_size          numeric(14,2) check (pot_size >= 0),
  hero_pl           numeric(14,2),

  -- 메모
  note              text,
  raw_voice_text    text,

  -- AI 리뷰
  review_status     text          not null default 'none'
                                  check (review_status in ('none','pending','done','error')),
  review            jsonb,
  reviewed_at       timestamptz,
  review_model      text,

  -- 공유
  share_id          text          unique,
  is_public         boolean       not null default false,

  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

-- updated_at 트리거
create trigger hands_updated_at
  before update on public.hands
  for each row execute procedure public.set_updated_at();

-- 인덱스
create index hands_user_played_idx    on public.hands (user_id, played_at desc);
create index hands_session_idx        on public.hands (session_id) where session_id is not null;
create index hands_review_status_idx  on public.hands (user_id, review_status);
create index hands_share_id_idx       on public.hands (share_id) where share_id is not null;
create index hands_public_idx         on public.hands (is_public) where is_public = true;
