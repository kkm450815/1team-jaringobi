# Supabase 연동 가이드

현재 앱은 모든 데이터를 `localStorage`(브라우저 단위)에 저장합니다. 다른 사용자와 글·프로필을 공유하려면 Supabase 연동이 필요합니다. 코드는 이미 추상화 레이어(`talkPostsRepo`, `profilesRepo`, `getSupabase()`)를 통해 분기되도록 짜여 있어서, 아래 절차만 따르면 자동으로 Supabase 모드로 전환됩니다.

## 1. 패키지 설치

```bash
pnpm --filter jaringobi-app add @supabase/supabase-js
```

## 2. 환경변수 설정

`apps/jaringobi-app/.env.local`:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

`isSupabaseEnabled()`가 두 변수가 모두 있을 때만 `true`를 반환합니다.

## 3. SQL 스키마 (Supabase SQL Editor에서 실행)

```sql
-- ============================================================
-- 수다방 게시글
-- ============================================================
create table public.talk_posts (
  id          uuid primary key default gen_random_uuid(),
  room_id     text not null,
  nick        text not null,
  body        text not null,
  created_at  timestamptz not null default now(),
  -- 길이 제한 (스팸 1차 방어)
  constraint body_len check (char_length(body) between 1 and 500),
  constraint nick_len check (char_length(nick) between 1 and 20)
);
create index talk_posts_room_idx on public.talk_posts (room_id, created_at desc);

alter table public.talk_posts enable row level security;
-- 누구나 읽기/쓰기 (anonymous)
create policy "talk_posts read"   on public.talk_posts for select using (true);
create policy "talk_posts insert" on public.talk_posts for insert with check (true);
-- 삭제는 admins 테이블에 등록된 로그인 사용자만
create policy "talk_posts admin delete" on public.talk_posts for delete using (
  exists (select 1 from public.admins where user_id = auth.uid())
);

-- ============================================================
-- 관리자 (admins)
--  - Supabase Auth 의 user_id 를 등록한 계정만 관리자 권한
--  - RLS: 본인 row 만 select 가능 (다른 사람이 admin 목록을 캐낼 수 없게)
-- ============================================================
create table public.admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now()
);
alter table public.admins enable row level security;
create policy "self admin check" on public.admins for select
  using (auth.uid() = user_id);

-- ============================================================
-- 사용자 프로필 (공개 정보)
--  - nickname 이 PK → 닉네임 변경은 새 row INSERT + 옛 row DELETE
--  - equipped: 캐릭터 방 미리보기용 src 배열
-- ============================================================
create table public.profiles (
  nickname        text primary key,
  cycle           int  not null default 1,
  day             int  not null default 1,
  total_saved     bigint not null default 0,
  goal            bigint not null default 300000,
  active_title_id text not null default 'h0',
  owned_titles    text[] not null default array['h0'],
  equipped        text[] not null default '{}'::text[],
  updated_at      timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles read"   on public.profiles for select using (true);
create policy "profiles insert" on public.profiles for insert with check (true);
create policy "profiles update" on public.profiles for update using (true);
create policy "profiles delete" on public.profiles for delete using (true);
-- 익명 사용자도 프로필 작성 가능. 추후 auth 연동 시 정책 강화 필요.
```

### 3-1. 첫 관리자 부트스트랩

1. 앱 배포 후 `/admin` 접속 → 본인 이메일 입력 → 매직 링크 받기
2. 메일의 링크 클릭 → 세션 생성됨 (단, 아직 admins 미등록이라 "접근 권한 없음" 표시)
3. Supabase Dashboard → Authentication → Users 에서 본인 user id (uuid) 확인
4. SQL Editor 에서 본인 row 추가:

```sql
insert into public.admins (user_id, email)
values ('<your-user-uuid>', 'you@example.com');
```

5. `/admin` 새로고침 → 관리 패널 진입

### 3-2. Auth Redirect URL 등록

Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://<배포-도메인>` (Vercel prod)
- **Additional Redirect URLs**: `https://<배포-도메인>/admin`, 프리뷰 URL 도 등록 가능

미등록 시 매직 링크 클릭이 거부됩니다.

### 3-3. Anonymous Sign-In + 본인-only 정책 (보안 강화)

일반 사용자도 보이지 않게 Supabase 의 익명 인증을 사용해 `auth.uid()` 를
확보하고, RLS 가 본인 row 만 변경 가능하게 강화합니다.

**대시보드**: Authentication → Providers → **Anonymous Sign-Ins** 토글 ON

**SQL 마이그레이션** (이미 만든 talk_posts/profiles 가 있을 때):

```sql
-- talk_posts.user_id 추가 + 정책 강화
alter table public.talk_posts
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists talk_posts_user_idx on public.talk_posts(user_id);

drop policy if exists "talk_posts insert" on public.talk_posts;
drop policy if exists "talk_posts write" on public.talk_posts;
create policy "talk_posts insert" on public.talk_posts for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "talk_posts admin delete" on public.talk_posts;
drop policy if exists "talk_posts delete" on public.talk_posts;
create policy "talk_posts delete" on public.talk_posts for delete using (
  exists (select 1 from public.admins where user_id = auth.uid())
  or user_id = auth.uid()
);

-- profiles.user_id 추가 + 정책 강화
alter table public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
create unique index if not exists profiles_user_id_unique on public.profiles(user_id);

drop policy if exists "profiles insert" on public.profiles;
create policy "profiles insert" on public.profiles for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "profiles delete" on public.profiles;
create policy "profiles delete" on public.profiles for delete
  using (user_id = auth.uid());
```

**적용 순서 권장**:
1. Anonymous Sign-In 토글 ON (Dashboard)
2. 새 코드 prod 배포 (앱이 자동으로 익명 세션 발급)
3. 위 SQL 실행 (정책 강화)

순서를 바꾸면 잠시 INSERT 가 실패할 수 있음. 기존 NULL `user_id` row 는 사용자
삭제 불가 (관리자만 가능).

### 3-4. 관리자 RPC 함수 (대시보드 / 가입자 목록)

`/admin` 페이지의 대시보드와 가입자 목록은 `auth.users` 를 읽어야 하므로
anon key 로는 접근 불가. **security definer 함수**로 admin 만 호출 가능하게
래핑합니다.

```sql
-- 대시보드 통계
create or replace function public.admin_dashboard_stats()
returns table(
  total_auth_users bigint,
  total_profiles   bigint,
  total_posts      bigint,
  active_posters   bigint,
  posts_24h        bigint,
  posts_7d         bigint
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists(select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  return query
  select
    (select count(*) from auth.users)::bigint,
    (select count(*) from public.profiles)::bigint,
    (select count(*) from public.talk_posts)::bigint,
    (select count(distinct user_id) from public.talk_posts where user_id is not null)::bigint,
    (select count(*) from public.talk_posts where created_at >= now() - interval '24 hours')::bigint,
    (select count(*) from public.talk_posts where created_at >= now() - interval '7 days')::bigint;
end;
$$;

revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;

-- 가입자 목록
create or replace function public.admin_list_users()
returns table(
  user_id      uuid,
  email        text,
  nickname     text,
  cycle        int,
  total_saved  bigint,
  post_count   bigint,
  signed_up_at timestamptz,
  last_post_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists(select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  return query
  select
    au.id,
    au.email,
    p.nickname,
    p.cycle,
    p.total_saved,
    coalesce((select count(*) from public.talk_posts tp where tp.user_id = au.id), 0)::bigint,
    au.created_at,
    (select max(tp.created_at) from public.talk_posts tp where tp.user_id = au.id)
  from auth.users au
  left join public.profiles p on p.user_id = au.id
  order by au.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
```

## 4. Realtime 설정

Supabase 대시보드 > Database > Replication 에서 `talk_posts` 테이블을 publication에 추가. `talkPostsRepo.subscribe()`가 INSERT/DELETE 이벤트를 구독합니다.

## 5. 관리자 페이지 (/admin)

`screens/Admin.tsx` 가 Supabase Auth 매직 링크 + `admins` 테이블로 보호됩니다.

- **인증 흐름**: 이메일 입력 → 메일 링크 클릭 → 세션 설정 → admins 등록 여부 확인
- **권한 검사**: 클라이언트는 UI 가드일 뿐, 진짜 권한은 RLS 정책 (`talk_posts admin delete`) 이 결정
- **부트스트랩**: 위 3-1 절 참고

`VITE_ADMIN_PASSWORD` 환경변수는 더 이상 사용하지 않습니다 (클라이언트 번들에 노출되는 약한 보안이었음).

## 6. 일반 사용자 인증 (선택)

현재 일반 사용자는 닉네임 기반 익명 모드입니다 (localStorage 만 사용). 본격적인 멀티 유저로 가려면 동일한 방식으로 `signInWithOtp()` 또는 OAuth 추가 후 `profiles` 테이블에 `id uuid` 컬럼을 더해 `auth.users` 와 연결하세요.

## 마이그레이션 체크리스트

- [ ] 기존 사용자의 localStorage 데이터를 `profiles`로 1회 업로드 (필요 시 `Settings` 화면에 "내 프로필 백업" 버튼 추가)
- [ ] `useUser` 의 `update()` 호출에서 `profiles.upsert()` 동기화
- [ ] 카메라 인증 사진은 별도 Storage 버킷 사용 검토 (현재는 dataURL을 localStorage에 저장)
