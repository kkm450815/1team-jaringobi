# 관리자 확장 #5 #6 작업 계획

본 문서는 관리자 페이지 확장 잔여 항목 두 개의 구현 계획.
- **#5 챌린지/미션 관리** — `MISSIONS` (m1~m20) 를 DB 로 이관 + admin CRUD
- **#6 칭호 관리** — `TITLES` (h0~h11) 를 DB 로 이관 + admin CRUD + 조건 평가 유지

## 0. 공통 원칙

- **ID 전략: 기존 텍스트 ID 유지** (`m1`~`m20`, `h0`~`h11` 그대로 PK).
  사용자 localStorage 의 `missionWinDays['m1']`, `ownedTitles: ['h2']` 등을 그대로 사용 가능 → 마이그레이션 코드 0줄.
- **순서: #5 미션 먼저 → #6 칭호.** 칭호 조건이 미션 ID 를 참조하므로 의존 자연스러움.
- **패턴: announcements / shop_items 와 동일.**
  `*Repo.ts` (local + supabase 구현 분기) → Admin.tsx 탭 추가 → realtime publication.
- **하이브리드 로딩 (선택):** seed (m1~m20) 는 코드의 `MISSIONS` 를 fallback 으로 두고, DB 가 비어있을 때 자동 시드 1회 (admin 화면에서 "초기 데이터 시드" 버튼).
  → 신규 배포 환경에서 빈 화면 방지.

---

## 1. #5 미션 관리

### 1-1. DB 스키마 (docs/SUPABASE.md 에 3-8 절로 추가)

```sql
create table if not exists public.missions (
  id            text primary key,                    -- 'm1', 'm2', ...
  category      text not null check (category in ('식비','여가','충동','통장')),
  title         text not null,
  amount        int  not null,                       -- 원, 음수 허용? 현재 코드에선 양수만
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

-- realtime
do $$ begin
  alter publication supabase_realtime add table public.missions;
exception when duplicate_object then null;
end $$;
```

### 1-2. Repo: `apps/jaringobi-app/src/lib/missionsRepo.ts`

`announcementsRepo.ts` 와 동일 구조.

```ts
export interface MissionsRepo {
  listActive(): Promise<Mission[]>;       // 사용자용 — active=true
  listAll(): Promise<Mission[]>;          // admin 용
  upsert(m: Mission): Promise<Mission>;
  remove(id: string): Promise<void>;
  subscribe(cb: () => void): () => void;
}
```

- `listActive()` 결과가 **0개일 때만** 코드의 `MISSIONS` 상수를 fallback 으로 사용
  → 빈 DB / Supabase 미설정 환경 양쪽 안전

### 1-3. 코드 통합 지점

`MISSIONS` 를 import 하던 곳을 **`useMissions()` 훅** 으로 교체:

| 파일 | 현재 | 변경 후 |
|---|---|---|
| `lib/data.ts:18-230` | `MISSIONS` 상수 export | seed 로 유지 (이름은 `MISSION_SEED` 로 rename 권장) |
| `screens/Main.tsx`, `screens/ChallengeList.tsx`, `screens/ChallengeDetail.tsx`, `screens/Camera.tsx` | `MISSIONS.find(...)` | `const missions = useMissions(); missions.find(...)` |
| `lib/userState.ts:21-22` (`MISSION_AMOUNTS`) | 정적 dict | `useMissions()` 에서 파생 (memo) — 또는 missionId → amount 조회 함수로 교체 |
| `lib/data.ts:405` (`getTitleProgress` 내 `MISSIONS.find`) | 정적 | `getTitleProgress(title, ctx, missions)` 로 매개변수 추가 |

### 1-4. Admin UI: `screens/Admin.tsx` 에 'missions' 탭 추가

폼 필드 (announcements admin 과 동일 톤):
- id (신규일 때만 입력 가능, 기존은 readonly)
- category (드롭다운)
- title (text)
- amount (number)
- difficulty (드롭다운)
- iconKey (text + 아이콘 미리보기)
- intro (textarea)
- tips (multi-line textarea, 줄당 1팁)
- authMethod (text)
- sortOrder (number)
- active (checkbox)

기능: 목록 / 추가 / 수정 / 삭제 / "코드 seed 에서 가져오기" 버튼 (1회 시드).

### 1-5. 리스크 / 체크포인트

- [ ] `MISSION_AMOUNTS` 가 동기 dict 인데 비동기 로딩으로 바뀌면 호출처 모두 비동기 인지 필요 — 차라리 `useMissions()` 훅이 메모리 캐시 + 동기 lookup 제공 형태로
- [ ] 카테고리/난이도 enum 변경 시 client TS 타입과 DB check 동기화 필요
- [ ] 삭제된 미션 ID 가 아직 누군가의 `missionWinDays['m4']` 에 남아있을 수 있음 → 사용자측은 무시 (없는 ID 는 `getTitleProgress` 에서 자연 fail) **하지만 칭호 조건에 그 ID 가 박혀있으면 영구 미달성** → admin UI 에서 삭제 시 경고

---

## 2. #6 칭호 관리

### 2-1. DB 스키마 (docs/SUPABASE.md 3-9 절)

조건 (`reqs`) 은 다양한 스키마라 **`jsonb` 한 컬럼**으로 저장. 평가 로직은 클라이언트가 그대로 담당 (`getTitleProgress`).

```sql
create table if not exists public.titles (
  id            text primary key,                    -- 'h0', 'h1', ...
  name          text not null,
  difficulty    text not null check (difficulty in ('쉬움','보통','어려움')),
  tagline       text not null default '',
  tip           text not null default '',
  icon_key      text not null,
  img           text not null,                       -- '/title/title_NN.png'
  reqs          jsonb not null default '[]'::jsonb,  -- TitleReq[]
  sort_order    int  not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists titles_active_idx
  on public.titles (active, sort_order);

alter table public.titles enable row level security;
-- read: 누구나, write: admin only (missions 와 동일 패턴)

do $$ begin
  alter publication supabase_realtime add table public.titles;
exception when duplicate_object then null;
end $$;
```

### 2-2. reqs JSON 형식 (현재 TS 타입 그대로 직렬화)

```ts
type TitleReq =
  | { type: 'mission'; missionId: string; count: number }
  | { type: 'totalSaveCount'; count: number }
  | { type: 'cycleComplete' };
```

→ DB 의 `reqs` 컬럼은 위 union 의 array. validator 함수 1개 작성해서 admin 입력 시 검증 (missionId 가 missions 테이블에 존재하는지 등).

### 2-3. Repo: `apps/jaringobi-app/src/lib/titlesRepo.ts`

`missionsRepo.ts` 와 동일 패턴.

### 2-4. 코드 통합 지점

| 파일 | 현재 | 변경 후 |
|---|---|---|
| `lib/data.ts:282-385` (`TITLES`) | export 상수 | seed (`TITLE_SEED`) 로 rename, fallback |
| `lib/data.ts:395-437` (`getTitleProgress`) | `MISSIONS.find` 직접 호출 | 매개변수로 missions 받기 |
| `lib/userState.ts:119-122, 295-298` | `TITLES` 직접 순회 | `useTitles()` 훅 + 동기 캐시 |
| `lib/profilesRepo.ts:54-56` (신규 사용자 ownedTitles 기본값) | `[h0]` 하드코딩 | 그대로 — 'h0' 은 보장 seed |
| 칭호 표시하는 모든 화면 (My/Settings/Title 등 — 추가 조사 필요) | TITLES.find | `useTitles().find` |

### 2-5. Admin UI

폼 필드:
- id, name, difficulty, tagline, tip, iconKey, img (file upload? text?), sortOrder, active
- **reqs 편집기**: 동적 행 추가/제거. type 별로 폼 분기:
  - `mission`: missionId (missions 테이블에서 select), count (number)
  - `totalSaveCount`: count
  - `cycleComplete`: 추가 필드 없음

이미지 (`img`) 는 현재 `/title/title_00.png` 처럼 **public 디렉토리 정적 파일**. 당장은 텍스트 입력만 받고, 추후 Storage 버킷(`title-images`) 도입은 별도 PR.

### 2-6. 리스크 / 체크포인트

- [ ] 평가 로직(`getTitleProgress`)을 서버 RPC 로 옮길지 여부 — **이번 작업에선 클라 유지**. 추후 reward 부여를 백엔드로 옮길 때 재검토
- [ ] reqs 의 missionId 무결성 — DB FK 안 걸고 admin 화면에서 검증만. (FK 걸면 missions 삭제 시 cascade 처리 필요)
- [ ] 사용자 `ownedTitles` 와 DB titles 가 어긋나면 (예: 칭호 삭제 후 ownedTitles 에 남음) UI 에서 unknown title 처리 필요

---

## 3. 마이그레이션 / 롤아웃 순서

1. **DB 스키마 추가** (missions + titles 동시) — `docs/SUPABASE.md` 3-8, 3-9 절 추가, Supabase SQL Editor 실행
2. **missionsRepo + useMissions 훅** 추가 (코드 변경 최소, 일단 fallback=seed 로 동작 보장)
3. 호출처(`Main`, `ChallengeList`, `ChallengeDetail`, `Camera`, `userState`, `getTitleProgress`) 를 `useMissions` 로 마이그레이션
4. **Admin missions 탭** 추가 + seed 시드 버튼
5. 동일 순서로 titles (titlesRepo → useTitles → 호출처 → Admin titles 탭)
6. `TITLES`, `MISSIONS` export 는 backward-compat 래퍼로 잠시 남겼다가 정리

각 단계 끝마다 `npx tsc --noEmit` + 수동 클릭 테스트 (메인/챌린지 리스트/상세/카메라).

---

## 4. 추정 작업량

| 작업 | 시간 |
|---|---|
| DB 스키마 + SUPABASE.md 작성 | 0.5h |
| missionsRepo + useMissions + 호출처 마이그레이션 | 1.5h |
| Admin missions 탭 (CRUD + seed 버튼) | 1.5h |
| #5 검증 & 커밋 | 0.5h |
| titlesRepo + useTitles + 호출처 마이그레이션 | 1.5h |
| Admin titles 탭 (reqs 동적 폼이 핵심) | 2h |
| #6 검증 & 커밋 | 0.5h |
| **총** | **8h** |

---

## 5. 결정 사항 (확정)

- [x] **칭호 이미지 업로드 — 이번 PR 포함.** Storage 버킷 `title-images` 신설.
  - 미션 아이콘은 현재처럼 정적 경로(`iconKey` → `/chall/icon/chall_list_<key>.png`) 유지
  - 칭호 `img` 만 업로드형으로 — 신규 칭호는 업로드, 기존 11개는 정적 경로 그대로
  - shop_items 의 Storage 패턴(`docs/SUPABASE.md` 3-7) 그대로 답습
- [x] **미션 삭제 정책 — 경고 두 번** (confirm 두 번 확인).
  - 1차: "정말 삭제하시겠어요? 이 미션을 참조하는 칭호: …"
  - 2차: "되돌릴 수 없어요. 진짜 삭제할까요?"
  - 사용자 `missionWinDays` 의 잔존 데이터는 손대지 않음 (없는 ID 는 자연 무시됨)
- [x] **seed import 시점 — SQL 마이그레이션에 INSERT 포함** (옵션 c).
  - SUPABASE.md 의 missions/titles 섹션 마지막에 `insert ... on conflict (id) do nothing`
  - 코드의 `MISSION_SEED`/`TITLE_SEED` 는 fallback (Supabase 미설정·빈 DB 환경) 으로만 유지
