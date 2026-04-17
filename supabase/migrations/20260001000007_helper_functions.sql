-- ──────────────────────────────────────────────────────────────────────────────
-- 월별 AI 사용량 조회 함수 (비용 가드용)
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function public.get_monthly_ai_usage(
  p_user_id uuid,
  p_kind    text default null
)
returns table (
  kind          text,
  call_count    bigint,
  total_cost    numeric
)
language sql
security definer
set search_path = public
as $$
  select
    kind,
    count(*)                    as call_count,
    coalesce(sum(cost_usd), 0)  as total_cost
  from ai_usages
  where
    user_id = p_user_id
    and date_trunc('month', created_at) = date_trunc('month', now())
    and (p_kind is null or kind = p_kind)
  group by kind;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- share_id 생성 함수 (8자 랜덤 영숫자)
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function public.generate_share_id()
returns text
language sql
as $$
  select
    lower(
      substring(
        replace(replace(encode(gen_random_bytes(6), 'base64'), '+', ''), '/', ''),
        1, 8
      )
    );
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- 핸드 공개 토글 + share_id 자동 생성
-- ──────────────────────────────────────────────────────────────────────────────
create or replace function public.toggle_hand_public(p_hand_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hand   hands%rowtype;
  v_new_id text;
begin
  select * into v_hand from hands where id = p_hand_id and user_id = auth.uid();
  if not found then
    raise exception 'hand not found or not authorized';
  end if;

  if v_hand.is_public then
    update hands set is_public = false, share_id = null where id = p_hand_id;
    return json_build_object('is_public', false, 'share_id', null);
  else
    v_new_id := coalesce(v_hand.share_id, generate_share_id());
    update hands set is_public = true, share_id = v_new_id where id = p_hand_id;
    return json_build_object('is_public', true, 'share_id', v_new_id);
  end if;
end;
$$;
