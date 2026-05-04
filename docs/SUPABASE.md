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
-- 수다방 게시글
create table public.talk_posts (
  id          uuid primary key default gen_random_uuid(),
  room_id     text not null,
  nick        text not null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index talk_posts_room_idx on public.talk_posts (room_id, created_at desc);

-- 누구나 읽기 가능
alter table public.talk_posts enable row level security;
create policy "talk_posts read"  on public.talk_posts for select using (true);
create policy "talk_posts write" on public.talk_posts for insert with check (true);

-- 사용자 프로필 (공개 정보)
create table public.profiles (
  nickname        text primary key,
  cycle           int  not null default 1,
  day             int  not null default 1,
  total_saved     bigint not null default 0,
  goal            bigint not null default 300000,
  active_title_id text not null default 'h0',
  owned_titles    text[] not null default array['h0'],
  updated_at      timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles read"   on public.profiles for select using (true);
-- 본인만 자기 프로필 갱신 가능하게 하려면 auth 연동 후 다음 줄 사용
-- create policy "profiles update" on public.profiles for update using (auth.uid() = id);
```

## 4. Realtime 설정

Supabase 대시보드 > Database > Replication 에서 `talk_posts` 테이블을 publication에 추가. `talkPostsRepo.subscribe()`가 INSERT 이벤트를 구독합니다.

## 5. 코드 활성화

다음 파일에서 주석을 풀면 됩니다:

- `src/lib/supabase.ts` — `createClient` import 및 `client = createClient(...)` 활성화
- `src/lib/talkPostsRepo.ts` — `supabaseRepo` 의 list/add/subscribe 구현 주석 해제
- `src/lib/profilesRepo.ts` — `supabaseRepo.getByNick` 구현 주석 해제

이후 `isSupabaseEnabled()`가 true가 되어 자동으로 Supabase 백엔드가 사용됩니다. localStorage 폴백은 환경변수 미설정/패키지 미설치 시에만 동작합니다.

## 6. 인증 (선택)

지금은 사용자 닉네임 기반의 익명 모드입니다. 본격적인 멀티 유저로 가려면 `supabase.auth.signInWithOtp()` 또는 OAuth 추가 후 `profiles` 테이블에 `id uuid` 컬럼을 추가해 `auth.users`와 연결하세요.

## 마이그레이션 체크리스트

- [ ] 기존 사용자의 localStorage 데이터를 `profiles`로 1회 업로드 (필요 시 `Settings` 화면에 "내 프로필 백업" 버튼 추가)
- [ ] `useUser` 의 `update()` 호출에서 `profiles.upsert()` 동기화
- [ ] 카메라 인증 사진은 별도 Storage 버킷 사용 검토 (현재는 dataURL을 localStorage에 저장)
