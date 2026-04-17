-- ──────────────────────────────────────────────────────────────────────────────
-- sessions
-- ──────────────────────────────────────────────────────────────────────────────
create table public.sessions (
  id                    uuid          primary key default uuid_generate_v4(),
  user_id               uuid          not null references auth.users(id) on delete cascade,
  played_on             date          not null,
  started_at            timestamptz,
  ended_at              timestamptz,
  place_id              uuid          references public.places(id) on delete set null,
  place_name_snapshot   text,
  game_type             text          check (game_type in ('NLH','PLO','Tournament','PLO5','Mixed')),
  stakes                text,
  buy_in                numeric(14,2) not null default 0 check (buy_in >= 0),
  cash_out              numeric(14,2) not null default 0 check (cash_out >= 0),
  currency              text          not null default 'KRW'
                                      check (currency in ('KRW','USD')),
  note                  text,
  created_at            timestamptz   not null default now()
);

-- 편의 뷰: net_profit 포함
create or replace view public.v_sessions as
  select *, (cash_out - buy_in) as net_profit
  from public.sessions;

-- 인덱스
create index sessions_user_played_idx on public.sessions (user_id, played_on desc);
create index sessions_place_idx on public.sessions (place_id) where place_id is not null;
