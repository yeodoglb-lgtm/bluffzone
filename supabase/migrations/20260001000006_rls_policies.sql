-- ──────────────────────────────────────────────────────────────────────────────
-- RLS 활성화
-- ──────────────────────────────────────────────────────────────────────────────
alter table public.profiles   enable row level security;
alter table public.sessions   enable row level security;
alter table public.hands      enable row level security;
alter table public.ai_chats   enable row level security;
alter table public.ai_messages enable row level security;
alter table public.places     enable row level security;
alter table public.ai_usages  enable row level security;

-- ──────────────────────────────────────────────────────────────────────────────
-- profiles
-- ──────────────────────────────────────────────────────────────────────────────
create policy "profiles: 본인 조회"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: 본인 수정"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles: 관리자 전체 조회"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- sessions
-- ──────────────────────────────────────────────────────────────────────────────
create policy "sessions: 본인 CRUD"
  on public.sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- hands
-- ──────────────────────────────────────────────────────────────────────────────
create policy "hands: 본인 CRUD"
  on public.hands for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 공개 핸드는 누구나 조회 (share_id로 접근)
create policy "hands: 공개 조회"
  on public.hands for select
  using (is_public = true);

-- ──────────────────────────────────────────────────────────────────────────────
-- ai_chats
-- ──────────────────────────────────────────────────────────────────────────────
create policy "ai_chats: 본인 CRUD"
  on public.ai_chats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- ai_messages
-- ──────────────────────────────────────────────────────────────────────────────
create policy "ai_messages: 본인 chat만 접근"
  on public.ai_messages for all
  using (
    exists (
      select 1 from public.ai_chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- places
-- ──────────────────────────────────────────────────────────────────────────────
-- 모든 사용자가 활성 장소 조회 가능 (비로그인 포함)
create policy "places: 전체 조회"
  on public.places for select
  using (is_active = true);

-- 관리자만 CRUD
create policy "places: 관리자 전체 접근"
  on public.places for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- ai_usages
-- ──────────────────────────────────────────────────────────────────────────────
-- Edge Function(service_role)만 insert. 사용자는 본인 것만 조회.
create policy "ai_usages: 본인 조회"
  on public.ai_usages for select
  using (auth.uid() = user_id);
