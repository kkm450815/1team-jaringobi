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
#variable_conflict use_column
begin
  if not exists(select 1 from public.admins a where a.user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  return query
  select
    (select count(*) from auth.users)::bigint,
    (select count(*) from public.profiles)::bigint,
    (select count(*) from public.talk_posts)::bigint,
    (select count(distinct tp.user_id) from public.talk_posts tp where tp.user_id is not null)::bigint,
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
#variable_conflict use_column
begin
  if not exists(select 1 from public.admins a where a.user_id = auth.uid()) then
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

> ⚠️ `#variable_conflict use_column` 지시자가 핵심 — RETURNS TABLE 의 OUT
> 파라미터(`user_id` 등) 와 동명의 컬럼이 있을 때 컬럼 우선으로 해결.
> 빠뜨리면 `column reference "user_id" is ambiguous` 에러.

### 3-5. 수다방 리스트 (talk_rooms)

수다방 목록을 admin 페이지에서 관리할 수 있게 하는 테이블 + 시드.

```sql
create table if not exists public.talk_rooms (
  id          text primary key,
  title       text not null,
  icon        text,
  bg          text not null default '#EEEEEE',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.talk_rooms enable row level security;

drop policy if exists "talk_rooms read" on public.talk_rooms;
create policy "talk_rooms read" on public.talk_rooms for select using (true);

drop policy if exists "talk_rooms admin write" on public.talk_rooms;
create policy "talk_rooms admin write" on public.talk_rooms for all
  using (exists(select 1 from public.admins where user_id = auth.uid()))
  with check (exists(select 1 from public.admins where user_id = auth.uid()));

-- 시드 (기존 하드코딩 TALK_ROOMS 와 동일)
insert into public.talk_rooms (id, title, icon, bg, sort_order) values
  ('t1', '편의점 꿀조합',  '/jarin/talk_list_store.png',      '#CFE2EA', 1),
  ('t2', '가성비 레시피',  '/jarin/talk_list_cook.png',       '#D8E6CF', 2),
  ('t3', '체험단 꿀팁',    '/jarin/talk_list_experience.png', '#F3CFD2', 3),
  ('t4', '혼놀 취미 공유', '/jarin/talk_list_solo.png',       '#D7D5EC', 4)
on conflict (id) do nothing;
```

Realtime publication 에도 추가하면 admin 변경이 사용자 화면에 즉시 반영됨:

```sql
alter publication supabase_realtime add table public.talk_rooms;
```

### 3-6. 공지/이벤트 (announcements)

메인 화면 상단 배너용 공지/이벤트 테이블. 관리자만 작성 가능, 누구나 읽기 가능.

```sql
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  link_url    text,
  link_label  text,
  bg_color    text not null default '#FCE0BF',
  active      boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists announcements_active_idx
  on public.announcements (active, sort_order);

alter table public.announcements enable row level security;

drop policy if exists "announcements read" on public.announcements;
create policy "announcements read" on public.announcements for select using (true);

drop policy if exists "announcements admin write" on public.announcements;
create policy "announcements admin write" on public.announcements for all
  using (exists(select 1 from public.admins where user_id = auth.uid()))
  with check (exists(select 1 from public.admins where user_id = auth.uid()));

alter publication supabase_realtime add table public.announcements;
```

활성 판정 (앱 클라이언트에서):
- `active = true`
- `starts_at IS NULL OR starts_at <= now()`
- `ends_at IS NULL OR ends_at > now()`

### 3-7. 상점 아이템 (shop_items) + Storage 버킷

기존 하드코딩 SHOP_GROUPS 와 별도로 관리자가 추가하는 아이템.

#### Storage 버킷 (Dashboard 또는 SQL)

**Dashboard 추천** — 좌측 메뉴 → **Storage** → **New bucket** → name: `shop-images`,
**Public bucket** 체크 → Create.

또는 SQL 로:
```sql
insert into storage.buckets (id, name, public)
values ('shop-images', 'shop-images', true)
on conflict (id) do nothing;
```

#### Storage RLS 정책 (관리자만 업로드/삭제, 누구나 read)

```sql
-- 모든 사용자 read (public 버킷이면 어차피 anonymous 접근 가능)
drop policy if exists "shop-images public read" on storage.objects;
create policy "shop-images public read" on storage.objects for select
  using (bucket_id = 'shop-images');

-- admin 만 업로드
drop policy if exists "shop-images admin upload" on storage.objects;
create policy "shop-images admin upload" on storage.objects for insert
  with check (
    bucket_id = 'shop-images' and
    exists (select 1 from public.admins where user_id = auth.uid())
  );

-- admin 만 삭제
drop policy if exists "shop-images admin delete" on storage.objects;
create policy "shop-images admin delete" on storage.objects for delete
  using (
    bucket_id = 'shop-images' and
    exists (select 1 from public.admins where user_id = auth.uid())
  );
```

#### shop_items 테이블

```sql
create table if not exists public.shop_items (
  id              uuid primary key default gen_random_uuid(),
  category        text not null check (category in ('사치품','티셔츠','리모델링')),
  sub_category    text,
  shop_image_url  text not null,
  fit_image_url   text not null,
  price           int  not null check (price >= 0),
  sort_order      int  not null default 0,
  active          boolean not null default true,
  label           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists shop_items_active_idx
  on public.shop_items (active, sort_order);

alter table public.shop_items enable row level security;

drop policy if exists "shop_items read" on public.shop_items;
create policy "shop_items read" on public.shop_items for select using (true);

drop policy if exists "shop_items admin write" on public.shop_items;
create policy "shop_items admin write" on public.shop_items for all
  using (exists(select 1 from public.admins where user_id = auth.uid()))
  with check (exists(select 1 from public.admins where user_id = auth.uid()));

alter publication supabase_realtime add table public.shop_items;
```

#### 동작
- 관리자가 admin 페이지에서 새 아이템 추가 → 이미지 두 개 업로드 → DB 에 row
- 사용자가 Shop 화면 진입 시 DB 활성 항목이 기존 하드코딩 위에 붙어 노출
- 사용자 구매 시 `u.owned` 에 `shop_image_url` 추가됨 → 옷장에서도 보임
- 캐릭터 위 입혀짐(`fitSrc`) 은 `customShopItems` 레지스트리가 `fit_image_url` 로
  매핑

#### Fit 이미지 제작 가이드
- 캐릭터 PNG 와 같은 캔버스 크기 / 같은 포지션
- 투명 배경
- 캐릭터 위에 그대로 올렸을 때 정렬되는 위치로 직접 배치
- 디자이너가 사전 제작 후 admin 이 업로드만

### 3-8. 챌린지/미션 (missions)

기존 `lib/data.ts` 의 `MISSIONS` 상수 (m1~m20) 를 DB 로 이관. ID 는 텍스트
PK 그대로 유지하여 사용자 localStorage 의 `missionWinDays['m1']` 호환.

```sql
create table if not exists public.missions (
  id            text primary key,                    -- 'm1', 'm2', ...
  category      text not null check (category in ('식비','여가','충동','통장')),
  title         text not null,
  amount        int  not null,                       -- 원 (양수)
  difficulty    text not null check (difficulty in ('쉬움','보통','어려움')),
  icon_key      text not null,                       -- /chall/icon/chall_list_<key>.png
  intro         text not null default '',
  tips          jsonb not null default '[]'::jsonb,  -- string[]
  auth_method   text not null default '',
  sort_order    int  not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists missions_active_idx
  on public.missions (active, sort_order);

alter table public.missions enable row level security;

drop policy if exists "missions read" on public.missions;
create policy "missions read" on public.missions for select using (true);

drop policy if exists "missions admin write" on public.missions;
create policy "missions admin write" on public.missions for all
  using (exists(select 1 from public.admins where user_id = auth.uid()))
  with check (exists(select 1 from public.admins where user_id = auth.uid()));

do $$ begin
  alter publication supabase_realtime add table public.missions;
exception when duplicate_object then null;
end $$;
```

#### Seed (m1~m20) — `lib/data.ts` 의 `MISSIONS` 와 동기화

`on conflict (id) do nothing` 이라 이미 행이 있으면 건너뜀.

```sql
insert into public.missions (id, category, title, amount, difficulty, icon_key, intro, tips, auth_method, sort_order) values
  ('m1','식비','편의점 최고의 조합',5000,'쉬움','cvs',
   '편의점에서도 **영양 챙기면서 저렴하게** 먹을 수 있어요.',
   '["든든한 한 끼 — 삼각김밥 2개 + 컵라면/국 = **3,500원 이하**","단백질 조합 — 닭가슴살 + 삶은 계란 + 두유 = **4,000원 이하**","PB 상품 활용 — CU 헤이루, GS25 유어스, 세븐셀렉트는 **20~30% 저렴**","**1+1·2+1 행사**는 매주 화요일 변경, 행사 상품 위주로"]'::jsonb,
   '편의점 영수증 또는 조합 사진 업로드',1),
  ('m2','식비','커피 참기',4000,'쉬움','coffee',
   '매일 **4,000원**짜리 카페 대신 **집에서 만들어** 보세요.',
   '["**텀블러**에 일회용 커피 스틱을 들고 나가기","드립백·캡슐 한 박스(약 5,000원)로 일주일치 — **하루 700원**","밖에서 꼭 마셔야 한다면 편의점 아이스커피(**1,800원**)"]'::jsonb,
   '텀블러 사진 또는 집에서 만든 커피 사진',2),
  ('m3','식비','배달 금지',15000,'어려움','delivery',
   '배달앱 켜는 순간 최소 **15,000원**이 나가요.',
   '["배달앱을 **홈화면 폴더 안에 숨기기** — 충동 주문 줄이기","방문 포장으로 대체 — **배달비 4,000~6,000원 절약**","주 1회 냉장고 사진 찍어두고 “이걸로 뭘 해먹지?” 먼저 생각하기","마감 할인 플랫폼 — **라스트오더, 요기요 라스트콜**"]'::jsonb,
   '직접 요리한 음식 사진 또는 포장 영수증 업로드',3),
  ('m4','식비','싼 레시피 챌린지',30000,'보통','receipe',
   '**1인분 3,000원 이하** 레시피로 도전해요.',
   '["계란 한 판(약 6,000원)으로 **5일 반찬** 해결","두부 한 모(**1,500원**) — 두부조림·된장찌개·순두부","**냉동 야채** 활용 — 신선보다 저렴하고 오래감"]'::jsonb,
   '완성된 요리 사진 + 재료비 영수증 업로드',4),
  ('m5','식비','저녁 줄이기',20000,'쉬움','dinner',
   '저녁만 바꿔도 일주일에 **4만원**이 남아요.',
   '["**비빔밥 데이** — 냉장고 남은 반찬 모아 비비기","마트 PB 상품 공략 — 노브랜드, 시그니처 등 **30~40% 저렴**","저녁 **8~9시 마감 할인** — 당일 식품 30~50% 할인"]'::jsonb,
   '저녁 식사 사진 또는 마트 영수증 업로드',5),
  ('m6','여가','무료 문화생활 루틴',30000,'쉬움','culture',
   '매달 문화생활에 쓰던 돈, 이번 달은 **0원**으로.',
   '["네이버·카카오 무료 웹툰·웹소설 — **기다리면 무료**","유튜브로 **클래식·뮤지컬 넘버·스탠드업 코미디** 시청","**서울문화포털**(culture.seoul.go.kr)에서 주말 무료 행사 확인"]'::jsonb,
   '관람 인증 사진 또는 행사 참여 캡처',6),
  ('m7','여가','혼술 챌린지',20000,'보통','drink',
   '술집 한 번 **4만원**, 집에서는 **4,000원**.',
   '["편의점 혼술 세팅 — 맥주 2캔 + 안주 = **5,000원 이하**","약속 전 **막차 시간** 미리 확인 — 자연스럽게 2·3차 컷","홈파티로 전환 — 1인당 **5,000~10,000원**","월별 술자리 횟수·지출 기록 → **보이면 줄게 됨**"]'::jsonb,
   '집 혼술 사진 또는 막차 전 귀가 지하철 인증',7),
  ('m8','여가','미용실 체험단',20000,'보통','hair',
   '체험단으로 **무료 또는 저렴하게** 시술받기.',
   '["**네이버 엑스퍼트·인플루언서 체험단**에서 미용실 모집 글 찾기","**강남·홍대 신규 오픈** 미용실은 포트폴리오용 모델 모집","인스타·블로그 후기 조건이 대부분, **팔로워 적어도** 성실하면 OK","카카오헤어샵·네이버 예약 **신규 고객 50% 할인** 노리기"]'::jsonb,
   '체험단 선정 화면 또는 시술 후기 게시 캡처',8),
  ('m9','여가','도서관·무료 콘텐츠',30000,'쉬움','library',
   '돈 내고 배우던 것을 **무료로 대체**해요.',
   '["**국립도서관·서울도서관** 전자책 앱 — 신간 포함 수만 권 무료","구청 평생학습관 — 영어·요가·요리 강좌 **1만원 이하**","시립·구립 박물관 **상설전 무료** (월 1회 방문 루틴)"]'::jsonb,
   '도서관 대출 기록 또는 강좌 수강 인증 사진',9),
  ('m10','충동','쇼핑 참기',100000,'어려움','shopping',
   '담아둔 건 **48시간 뒤** 다시 봐요. 대부분 안 사도 돼요.',
   '["**장바구니 삭제 인증** — 쿠팡·무신사·지그재그 비운 화면 캡처","**48시간 룰** — 사고 싶은 게 생기면 담아두고 48시간 뒤 재확인","**알림 차단** — 쇼핑앱 푸시 끄거나 홈화면 뒤 페이지로","대신할 행동 찾기 — **산책·유튜브**로 욕구 전환"]'::jsonb,
   '장바구니 삭제 전/후 화면 캡처 업로드',10),
  ('m11','충동','통신비 절약',20000,'보통','phone',
   '통신비는 **한 번만 바꿔도 매달 절약**돼요.',
   '["**알뜰폰허브**(mvno.kr)에서 데이터 사용량 기반 비교 — 월 **8,000~15,000원** 요금제","가족 결합 해지 검토 — 알뜰폰으로도 결합 유지 가능 여부 확인","번호 이동 이벤트 — 분기별 **공시지원금**/추가 할인"]'::jsonb,
   '새 요금제 가입 완료 화면 캡처',11),
  ('m12','충동','택시 금지 (2주)',30000,'보통','taxi',
   '심야 택시 한 번 **3만원**, **막차**만 챙겨도 절약.',
   '["약속 장소 기준 **막차 시간을 캘린더 알람**으로 등록","**카풀 앱**으로 비용 분담","약속 장소를 대중교통 편한 곳으로 잡기","택시 부르기 전 “**이게 정말 필요한가?**” 5초만 생각"]'::jsonb,
   '대중교통 탑승 기록 또는 막차 귀가 인증 사진',12),
  ('m13','통장','기프티콘 팔기',10000,'쉬움','gifticon',
   '**유효기간 지나기 전에** 현금으로 바꿔요.',
   '["**카카오톡 선물함**의 잊고 있던 기프티콘부터 정리","**니콘내콘·기프티스타**에서 **80~95% 시세**로 현금화","**부분 사용 후 잔액 판매**도 가능","캐시워크·토스 행운복권 같은 **앱테크 병행**"]'::jsonb,
   '기프티콘 판매 완료 화면 캡처',13),
  ('m14','통장','갑자기 5만원 저금',50000,'쉬움','save',
   '지금 당장 **5만원을 봉투에 넣어두는** 챌린지.',
   '["**현금 바인더** 만들기 — 봉투에 금액별 보관, 줄어드는 감각이 강함","월급 다음 날 **자동이체**로 5만원 → 저축 통장","안 쓰는 **OTT·구독 하나만 끊어도** 6개월에 10만원"]'::jsonb,
   '현금 봉투 또는 저축 이체 완료 화면 캡처',14),
  ('m15','통장','당근마켓 챌린지',50000,'쉬움','carrot',
   '안 쓰는 물건 **5개만 팔아도 5만원**은 쉽게 나와요.',
   '["**1년 넘게 안 쓴 것·후회한 것·사이즈 안 맞는 옷**부터 뒤지기","**밝은 곳·흰 배경 사진**은 판매 속도 2배","같은 물건 시세 확인 후 **살짝 낮게** 부르면 당일 판매","매월 **11일 나눔의 날** 이벤트 활용"]'::jsonb,
   '판매 완료된 거래 후기 캡처',15),
  ('m16','통장','단기 알바',50000,'어려움','alba',
   '짜투리 시간 단기 알바로 **추가 수입**.',
   '["알바몬·알바천국 당일 알바 — 행사·서빙·포장 **6~8만원**","**크몽·숨고**로 재능 판매 — 번역·디자인·과외","쿠팡이츠·배민 라이더 주말 2~3시간 = **3~5만원**","마크로밀 엠브레인·오픈서베이 패널 — 설문 1건당 **500~3,000P**"]'::jsonb,
   '급여 입금 내역 또는 플랫폼 수익 화면 캡처',16),
  ('m17','통장','무지출 데이',30000,'보통','zero',
   '하루를 **완전히 0원**으로 보내는 챌린지.',
   '["**전날 밤 결정** + 식재료 미리 준비 (즉흥 어렵)","동네 공원·하천 산책 + **팟캐스트** = 2시간 거뜬","유튜브 요리 영상·도서관 전자책·밀린 드라마 등 = **0원**"]'::jsonb,
   '당일 카드·계좌 지출 내역 캡처',17),
  ('m18','통장','물건 고치기',20000,'보통','repair',
   '버리고 새로 사기 전에 **고치면 꽤 아껴요**.',
   '["**유튜브 수리 영상** 먼저 검색 — 이어폰 단선·지퍼·밑창 다 나와요","수선집 활용 — 옷 수선 **3,000~8,000원**","**다이소 수리 용품** — 접착제·보수 테이프·복원제 1,000~2,000원","못 고칠 것 같으면 “부품용”으로 **당근에 올려보기**"]'::jsonb,
   '수리 전/후 사진 업로드',18),
  ('m19','여가','친구 금지',100000,'어려움','friend',
   '약속을 줄이면 **교통비·식비·술값이 한꺼번에** 줄어요.',
   '["약속 잡기 전 **이번 달 여가비 잔액**부터 확인","혼자 즐기는 취미 개발 — **독서·러닝·요리**","주말 계획을 **무지출 데이·도서관 방문**으로 미리 채우기"]'::jsonb,
   '주간 지출 내역 캡처',19),
  ('m20','여가','한 달 여가비 5만원 쓰기',50000,'어려움','leisure',
   '놀건 놀아야지. 근데 한 달에 **딱 5만원 안에서**.',
   '["**여가비 전용 봉투** 만들기 — 봉투에서만 꺼내 쓰기","이번 달 “꼭” 하고 싶은 활동 **1가지만**, 나머지는 무료 대체","**인터파크·티켓베이**로 50% 이하 할인 티켓 노리기","**통신사 여가생활 쿠폰** — 수요 적어 상대적으로 받기 쉬움"]'::jsonb,
   '월말 여가 지출 내역 캡처 + 무료/할인 여가 인증 사진',20)
on conflict (id) do nothing;
```

### 3-9. 칭호 (titles) + Storage 버킷 `title-images`

조건(`reqs`) 은 다양한 형태라 **`jsonb` 한 컬럼**으로 직렬화. 평가 로직은
클라이언트의 `getTitleProgress` 가 그대로 담당.

#### Storage 버킷 (Dashboard 또는 SQL)

**Dashboard 추천** — Storage → New bucket → name: `title-images`,
**Public bucket** 체크 → Create.

또는 SQL:
```sql
insert into storage.buckets (id, name, public)
values ('title-images', 'title-images', true)
on conflict (id) do nothing;
```

#### Storage RLS 정책 (`shop-images` 와 동일 패턴)

```sql
drop policy if exists "title-images public read" on storage.objects;
create policy "title-images public read" on storage.objects for select
  using (bucket_id = 'title-images');

drop policy if exists "title-images admin upload" on storage.objects;
create policy "title-images admin upload" on storage.objects for insert
  with check (
    bucket_id = 'title-images' and
    exists (select 1 from public.admins where user_id = auth.uid())
  );

drop policy if exists "title-images admin delete" on storage.objects;
create policy "title-images admin delete" on storage.objects for delete
  using (
    bucket_id = 'title-images' and
    exists (select 1 from public.admins where user_id = auth.uid())
  );
```

#### titles 테이블

```sql
create table if not exists public.titles (
  id            text primary key,                    -- 'h0', 'h1', ...
  name          text not null,
  difficulty    text not null check (difficulty in ('쉬움','보통','어려움')),
  tagline       text not null default '',
  tip           text not null default '',
  icon_key      text not null,
  img           text not null,                       -- '/title/title_NN.png' or storage URL
  reqs          jsonb not null default '[]'::jsonb,
  sort_order    int  not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists titles_active_idx
  on public.titles (active, sort_order);

alter table public.titles enable row level security;

drop policy if exists "titles read" on public.titles;
create policy "titles read" on public.titles for select using (true);

drop policy if exists "titles admin write" on public.titles;
create policy "titles admin write" on public.titles for all
  using (exists(select 1 from public.admins where user_id = auth.uid()))
  with check (exists(select 1 from public.admins where user_id = auth.uid()));

do $$ begin
  alter publication supabase_realtime add table public.titles;
exception when duplicate_object then null;
end $$;
```

#### reqs JSON 형식

```ts
type TitleReq =
  | { type: 'mission'; missionId: string; count: number }
  | { type: 'totalSaveCount'; count: number }
  | { type: 'cycleComplete' };
```

#### Seed (h0~h11) — `lib/data.ts` 의 `TITLES` 와 동기화

```sql
insert into public.titles (id, name, difficulty, tagline, tip, icon_key, img, reqs, sort_order) values
  ('h0','초보 절약가','쉬움',
   '절약의 첫 발을 내딛다',
   '하루에 한 가지씩만 줄여봐도 한 달이 다르게 느껴져요',
   'sprout','/title/title_00.png',
   '[]'::jsonb, 0),
  ('h1','홈 바리스타','쉬움',
   '오늘도 커피 값을 아꼈다',
   '텀블러를 들고 다니면 더 쉽게 성공할 수 있어요',
   'coffee','/title/title_01.png',
   '[{"type":"mission","missionId":"m2","count":5}]'::jsonb, 1),
  ('h2','편의점 미식가','쉬움',
   '배달 대신 편의점 각',
   '배달 앱을 열기 전에 편의점을 떠올려보세요',
   'cvs','/title/title_02.png',
   '[{"type":"mission","missionId":"m1","count":5}]'::jsonb, 2),
  ('h3','방구석 선비','보통',
   '오늘은 집이 최고다',
   '미리 약속을 줄여두면 자연스럽게 지출도 줄일 수 있어요',
   'friend','/title/title_03.png',
   '[{"type":"mission","missionId":"m19","count":10}]'::jsonb, 3),
  ('h5','문화 한량','보통',
   '돈 없이도 잘 놀았다',
   '무료 전시나 행사를 미리 찾아두면 더 자주 즐길 수 있어요',
   'culture','/title/title_04.png',
   '[{"type":"mission","missionId":"m6","count":10}]'::jsonb, 5),
  ('h6','연금술사','어려움',
   '오늘도 하나 살렸다',
   '안 쓰는 물건을 정리해보면 생각보다 쉽게 현금으로 바꿀 수 있어요',
   'repair','/title/title_05.png',
   '[{"type":"mission","missionId":"m18","count":10},{"type":"mission","missionId":"m13","count":5}]'::jsonb, 6),
  ('h7','현금술사','어려움',
   '수입 한 스푼 추가',
   '작은 수입이라도 꾸준히 만들면 점점 차이가 커져요',
   'save','/title/title_06.png',
   '[{"type":"mission","missionId":"m14","count":5},{"type":"mission","missionId":"m16","count":5}]'::jsonb, 7),
  ('h8','디지털 폐지왕','어려움',
   '티끌 모아 디지털 부자',
   '매일 조금씩 참여하면 부담 없이 포인트를 모을 수 있어요',
   'phone','/title/title_07.png',
   '[{"type":"mission","missionId":"m11","count":15}]'::jsonb, 8),
  ('h9','배달 킬러','쉬움',
   '배달 끊으면 돈이 쌓인다',
   '배달 앱 대신 다른 선택지를 먼저 떠올리면 도움이 돼요',
   'delivery','/title/title_08.png',
   '[{"type":"mission","missionId":"m3","count":5}]'::jsonb, 9),
  ('h10','인내의 화신','어려움',
   '참을 수 있는 자가 이긴다',
   '잠깐만 참아도 대부분의 소비 욕구는 금방 사라져요',
   'shopping','/title/title_09.png',
   '[{"type":"mission","missionId":"m10","count":10},{"type":"mission","missionId":"m12","count":10},{"type":"mission","missionId":"m5","count":10}]'::jsonb, 10),
  ('h11','자린고비','어려움',
   '진짜 절약의 끝판왕',
   '하루 한 번 무지출을 목표로 하면 점점 익숙해질 수 있어요',
   'zero','/title/title_10.png',
   '[{"type":"totalSaveCount","count":30},{"type":"mission","missionId":"m17","count":10},{"type":"cycleComplete"}]'::jsonb, 11)
on conflict (id) do nothing;
```

#### 동작 / 통합

- 사용자 화면 (`useMissions()`, `useTitles()`) 는 listActive() 로 DB 항목 로드 → 0개면 코드의 `MISSION_SEED`/`TITLE_SEED` fallback
- admin 페이지에서 미션/칭호 추가·수정·삭제·`active` 토글
- 칭호 이미지(`img`): 신규 칭호는 `title-images` 버킷 업로드 → public URL 저장. 기존 11개는 정적 경로(`/title/title_NN.png`) 유지
- 미션 삭제 시 admin UI 가 칭호 reqs 참조 검사 + 2단계 confirm

### 3-10. 데모 프로필 시드 (5명) — 명예의 전당 / 다른 사람 방 보기용

수다방·명예의 전당에서 "다른 사용자" 가 비어 보이지 않도록 가상 프로필 5명을
profiles 테이블에 넣어 둔다. `user_id = NULL` 이라 실제 auth 사용자와 충돌
없음. 닉네임은 unique PK 이므로 중복 가입 시 사용자가 다른 닉을 사용해야 함.

```sql
insert into public.profiles
  (nickname, cycle, day, total_saved, goal, active_title_id, owned_titles, equipped, user_id)
values
  ('절약왕민지', 4, 22, 850000, 1000000, 'h11',
   ARRAY['h0','h1','h2','h3','h5','h6','h7','h8','h9','h10','h11'],
   ARRAY['/shop/clothes/clo_shop_18.png','/shop/acc/acc_shop_05.png','/shop/wall_paper/interior_shop_03.png','/shop/lamp/lamp_shop_07.png','/shop/front/front_shop_12.png','/shop/left/left_shop_04.png'],
   NULL),
  ('짠돌이서준', 3, 14, 420000, 1000000, 'h10',
   ARRAY['h0','h1','h2','h3','h5','h9','h10'],
   ARRAY['/shop/clothes/clo_shop_24.png','/shop/acc/acc_shop_38.png','/shop/wall_paper/interior_shop_09.png','/shop/right/right_shop_05.png'],
   NULL),
  ('알뜰이수아', 2, 10, 220000, 300000, 'h8',
   ARRAY['h0','h1','h2','h3','h8'],
   ARRAY['/shop/clothes/clo_shop_42.png','/shop/acc/acc_shop_13.png','/shop/wall_paper/interior_shop_15.png'],
   NULL),
  ('무지출지호', 1, 25, 130000, 300000, 'h6',
   ARRAY['h0','h1','h6'],
   ARRAY['/shop/clothes/clo_shop_30.png','/shop/acc/acc_shop_67.png','/shop/wall_paper/interior_shop_21.png','/shop/lamp/lamp_shop_15.png'],
   NULL),
  ('신참자린이', 1, 5, 40000, 300000, 'h1',
   ARRAY['h0','h1'],
   ARRAY['/shop/clothes/clo_shop_51.png'],
   NULL)
on conflict (nickname) do nothing;
```

기존에 더 큰 값으로 시드를 이미 넣었다면 UPDATE 로 덮어쓰기:

```sql
update public.profiles set cycle=4, day=22, total_saved=850000 where nickname='절약왕민지' and user_id is null;
update public.profiles set cycle=3, day=14, total_saved=420000 where nickname='짠돌이서준' and user_id is null;
update public.profiles set cycle=2, day=10, total_saved=220000 where nickname='알뜰이수아' and user_id is null;
update public.profiles set cycle=1, day=25, total_saved=130000 where nickname='무지출지호' and user_id is null;
update public.profiles set cycle=1, day=5,  total_saved=40000  where nickname='신참자린이' and user_id is null;
```

> 참고: 실제 가입자는 nickname 변경 시 자기 row 를 만들고, 위 시드는 영구
> 잔존. 운영 중 시드를 빼고 싶으면 `delete from public.profiles where user_id is null;`
> 로 정리 가능.

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
