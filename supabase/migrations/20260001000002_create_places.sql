-- ──────────────────────────────────────────────────────────────────────────────
-- places  (sessions보다 먼저 생성 — FK 참조)
-- ──────────────────────────────────────────────────────────────────────────────
create table public.places (
  id              uuid          primary key default uuid_generate_v4(),
  name            text          not null,
  address         text,
  road_address    text,
  lat             double precision not null,
  lng             double precision not null,
  phone           text,
  hours           jsonb,        -- {mon:{open:'18:00',close:'06:00'}, ...}
  games           jsonb,        -- ['NLH 1/2', 'PLO 2/5']
  min_buyin       numeric(14,2),
  max_buyin       numeric(14,2),
  amenities       jsonb,        -- ['주차','식사','대기실']
  photos          text[]        not null default '{}',
  description     text,
  is_active       boolean       not null default true,
  featured        boolean       not null default false,
  created_by      uuid          references auth.users(id) on delete set null,
  created_at      timestamptz   not null default now(),
  updated_at      timestamptz   not null default now()
);

-- 거리 계산 인덱스 (earthdistance)
create index places_location_idx on public.places
  using btree (lat, lng);

-- 이름 검색 인덱스
create index places_name_trgm_idx on public.places
  using gin (name gin_trgm_ops);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger places_updated_at
  before update on public.places
  for each row execute procedure public.set_updated_at();
