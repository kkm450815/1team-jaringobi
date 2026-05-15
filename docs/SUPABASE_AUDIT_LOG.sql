-- =====================================================================
-- 관리자 감사 로그 & 관리자 목록 RPC
-- 적용: Supabase Dashboard → SQL Editor → 새 쿼리 → 전체 붙여넣고 RUN
-- =====================================================================
--
-- 변경 사항:
--   1. admin_list_admins() RPC — 관리자 본인이 모든 관리자 목록을 볼 수 있게
--   2. admin_audit_log 테이블 — 관리자의 모든 CRUD 작업 기록
--
-- 보안:
--   - 관리자만 select/insert 가능 (RLS)
--   - update/delete 는 클라이언트에서 불가능 (감사 로그 불변성)
--
-- 이미 실행한 적이 있다면 다시 실행해도 안전 (idempotent).

-- ---------------------------------------------------------------------
-- 1) 관리자 목록 RPC
-- ---------------------------------------------------------------------
--
-- 일반적으로 admins 테이블의 RLS 가 다른 관리자 row 읽기를 막음.
-- 본인 row 만 볼 수 있게 설정돼 있을 가능성이 높아 별도 RPC 필요.
-- security definer → 함수가 RLS 우회. 단, 함수 본문에서 호출자가 관리자인지
-- 확인 (auth.uid() in admins) 후에만 반환.

create or replace function public.admin_list_admins()
returns table (user_id uuid, email text, created_at timestamp with time zone)
language sql
security definer
set search_path = public
as $$
  select a.user_id, a.email, a.created_at
  from public.admins a
  where exists (select 1 from public.admins where user_id = auth.uid())
  order by a.created_at desc;
$$;

revoke all on function public.admin_list_admins() from public;
grant execute on function public.admin_list_admins() to authenticated;

-- ---------------------------------------------------------------------
-- 2) 감사 로그 테이블
-- ---------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  admin_email text,
  action text not null check (action in ('create', 'update', 'delete', 'toggle')),
  target_table text not null,
  target_id text,
  target_name text,
  details jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_admin_audit_log_created_at
  on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_log_admin_user_id
  on public.admin_audit_log (admin_user_id);
create index if not exists idx_admin_audit_log_target_table
  on public.admin_audit_log (target_table);

-- ---------------------------------------------------------------------
-- 3) RLS — 관리자만 select/insert
-- ---------------------------------------------------------------------

alter table public.admin_audit_log enable row level security;

drop policy if exists admin_audit_log_select on public.admin_audit_log;
create policy admin_audit_log_select on public.admin_audit_log
  for select
  using (auth.uid() in (select user_id from public.admins));

drop policy if exists admin_audit_log_insert on public.admin_audit_log;
create policy admin_audit_log_insert on public.admin_audit_log
  for insert
  with check (
    auth.uid() in (select user_id from public.admins)
    and admin_user_id = auth.uid()
  );

-- update / delete 정책 없음 → 클라이언트에서 수정·삭제 불가 (감사 불변성)

-- ---------------------------------------------------------------------
-- 확인
-- ---------------------------------------------------------------------
-- 아래 쿼리로 적용 확인 가능:
--   select * from admin_audit_log limit 5;       -- 빈 테이블이지만 에러 없으면 OK
--   select * from admin_list_admins();            -- 본인이 관리자면 목록 반환
