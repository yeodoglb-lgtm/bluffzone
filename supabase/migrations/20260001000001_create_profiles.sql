-- ──────────────────────────────────────────────────────────────────────────────
-- profiles
-- ──────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  display_name    text,
  avatar_url      text,
  currency        text        not null default 'KRW'
                              check (currency in ('KRW', 'USD')),
  locale          text        not null default 'ko'
                              check (locale in ('ko', 'en')),
  ai_model        text        not null default 'claude-sonnet-4-6',
  stt_engine      text        not null default 'device'
                              check (stt_engine in ('device', 'whisper')),
  auto_review     boolean     not null default false,
  monthly_goal    numeric(14,2),
  role            text        not null default 'user'
                              check (role in ('user', 'admin')),
  created_at      timestamptz not null default now()
);

-- 신규 가입 시 자동으로 profiles 행 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
