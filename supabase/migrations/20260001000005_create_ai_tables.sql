-- ──────────────────────────────────────────────────────────────────────────────
-- ai_chats
-- ──────────────────────────────────────────────────────────────────────────────
create table public.ai_chats (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text,
  created_at  timestamptz not null default now()
);

create index ai_chats_user_idx on public.ai_chats (user_id, created_at desc);

-- ──────────────────────────────────────────────────────────────────────────────
-- ai_messages
-- ──────────────────────────────────────────────────────────────────────────────
create table public.ai_messages (
  id              uuid        primary key default uuid_generate_v4(),
  chat_id         uuid        not null references public.ai_chats(id) on delete cascade,
  role            text        not null check (role in ('user','assistant','system')),
  content         text        not null,
  raw_voice_text  text,
  created_at      timestamptz not null default now()
);

create index ai_messages_chat_idx on public.ai_messages (chat_id, created_at asc);

-- ──────────────────────────────────────────────────────────────────────────────
-- ai_usages  (비용 추적)
-- ──────────────────────────────────────────────────────────────────────────────
create table public.ai_usages (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        references auth.users(id) on delete set null,
  kind            text        not null
                              check (kind in ('hand-review','chat','parse-voice','whisper')),
  model           text,
  input_tokens    int,
  output_tokens   int,
  cost_usd        numeric(10,6),
  created_at      timestamptz not null default now()
);

create index ai_usages_user_month_idx on public.ai_usages
  (user_id, date_trunc('month', created_at));
