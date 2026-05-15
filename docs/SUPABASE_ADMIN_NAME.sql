-- =====================================================================
-- 관리자 이름 컬럼 추가 + 관련 RPC 업데이트
-- 적용: Supabase Dashboard → SQL Editor → 새 쿼리 → 전체 붙여넣고 RUN
-- 사전: docs/SUPABASE_AUDIT_LOG.sql 가 먼저 실행돼 있어야 함
-- =====================================================================
--
-- 변경 사항:
--   1. admins.name 컬럼 추가 (nullable)
--   2. admin_list_admins() RPC — name 컬럼 반환에 포함
--   3. admin_update_my_name(text) RPC — 본인만 자기 이름 수정
--
-- 이미 실행한 적이 있어도 재실행 안전 (idempotent).

-- ---------------------------------------------------------------------
-- 1) admins 테이블에 name 컬럼 추가
-- ---------------------------------------------------------------------

alter table public.admins
  add column if not exists name text;

-- ---------------------------------------------------------------------
-- 2) admin_list_admins() — name 포함하도록 재정의
-- ---------------------------------------------------------------------

create or replace function public.admin_list_admins()
returns table (
  user_id uuid,
  email text,
  name text,
  created_at timestamp with time zone
)
language sql
security definer
set search_path = public
as $$
  select a.user_id, a.email, a.name, a.created_at
  from public.admins a
  where exists (select 1 from public.admins where user_id = auth.uid())
  order by a.created_at desc;
$$;

revoke all on function public.admin_list_admins() from public;
grant execute on function public.admin_list_admins() to authenticated;

-- ---------------------------------------------------------------------
-- 3) admin_update_my_name(text) — 본인 이름 수정
-- ---------------------------------------------------------------------
-- 관리자 본인만 자기 이름을 변경할 수 있음.
-- security definer 로 RLS 우회. 단, 함수 본문에서 호출자가 관리자인지 확인
-- 후 본인 row 만 update.

create or replace function public.admin_update_my_name(new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 길이 제한 (1자 이상 32자 이하). 빈 문자열은 NULL 로 저장 = 미설정.
  if new_name is not null and length(trim(new_name)) > 32 then
    raise exception '이름은 32자 이하여야 합니다.';
  end if;

  -- 관리자 권한 확인
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception '관리자 권한이 없습니다.';
  end if;

  update public.admins
  set name = case
    when new_name is null or trim(new_name) = '' then null
    else trim(new_name)
  end
  where user_id = auth.uid();
end;
$$;

revoke all on function public.admin_update_my_name(text) from public;
grant execute on function public.admin_update_my_name(text) to authenticated;

-- ---------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------
-- 본인 이름 변경 시도 (실제 admin UI 에서도 가능):
--   select admin_update_my_name('관리자A');
--   select * from admins where user_id = auth.uid();
