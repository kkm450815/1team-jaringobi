# 자린고비 — 제작 설명서 (Master Spec)

> 챌린지형 저축 게이미피케이션 앱 "자린고비"의 전체 제작 가이드입니다.
> 본 문서는 기획자·개발자·디자이너·운영자가 공통으로 참고하는 단일 진실 소스(SSOT)입니다.

---

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [권장 기술 스택](#2-권장-기술-스택)
3. [모노레포 구조](#3-모노레포-구조-수정-용이성-극대화)
4. [데이터 모델 (Postgres)](#4-데이터-모델-postgres)
5. [화면 ↔ API 매핑](#5-화면--api-매핑)
6. [인증샷 검증 플로우](#6-인증샷-검증-플로우)
7. [양심·하트 트랜잭션](#7-양심하트-시스템-트랜잭션)
8. [예상 운영비](#8-예상-운영비-월-기준)
9. [서버 연결 방식](#9-서버-연결-방식)
10. [수정 용이성 7원칙](#10-수정-용이성-7원칙)
11. [보안·개인정보](#11-보안개인정보)
12. [출시 체크리스트](#12-출시-체크리스트)
13. [로드맵](#13-로드맵)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 앱 이름 | 자린고비 (Jaringobi) |
| 카테고리 | 핀테크 × 게이미피케이션 × 라이프스타일 |
| 타겟 | 10~30대 (MZ), 짠테크/앱테크 경험자 |
| 핵심 가치 | "귀엽게 모으는 30일 저축 게임" — 캐릭터 꾸미기 + 양심 시스템 + 수다방 |
| 모드 | 노말(30일/30만원), 하드(30일/100만원) |
| 수익화(추후) | 시즌 패스, 프리미엄 아이템, 콜라보 캐릭터 |

### 디자인 토큰
| 역할 | HEX | 용도 |
|---|---|---|
| Background | `#F6EEDE` | 전체 배경 |
| Primary | `#ABBCA2` | 노말 모드, 기본 버튼 |
| Accent | `#617C53` | 하드 모드, 강조/확정 |
| Text/Line | `#514C44` | 본문 텍스트, 구분선 |
| Highlight | `#F49496` | 양심 하트, 난이도 태그, 알림 |

---

## 2. 권장 기술 스택

### 2-1. 모바일 (사용자 앱)
- **React Native + Expo (TypeScript, SDK 51+)**
  - 단일 코드로 iOS/Android 동시 출시
  - **Expo EAS Update** — 앱 심사 없이 JS·디자인 핫픽스 배포 (미션 일러스트, 카피 변경 즉시 반영)
  - Expo Camera / Image Picker / Notifications / AuthSession 으로 카메라·갤러리·푸시·소셜로그인 통합
  - 애니메이션: **Reanimated 3** + **Lottie** (캐릭터 호흡, 코인 +100P 팝)
  - 상태: **Zustand**(로컬 UI) + **TanStack Query**(서버 상태)
  - 네비게이션: Expo Router (파일 기반)

### 2-2. 백엔드 (BaaS 우선 전략)
- **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions)
  - MVP 단계에서 별도 서버 운영 불필요 → 1인 개발 가능
  - 추후 트래픽 증가 시 셀프호스팅 또는 AWS 마이그레이션 가능 (Postgres 그대로 이전)
  - **Edge Functions(Deno)** 으로 도메인 로직 격리 (코인 지급, 양심 차감, 회차 종료, 푸시 발송)
  - **Row Level Security(RLS)** 로 클라이언트 직접 접근에도 안전
- 결제: **불필요** (저축은 시뮬레이션, 실제 자금 이동 없음 → PG/금융 라이선스 0)

### 2-3. 운영자 (어드민)
- **Next.js 14 (App Router) + shadcn/ui** — `apps/admin`
  - 미션 템플릿 CRUD, 챌린지 팁 글, 수다방 토픽, 푸시 캠페인 노코드 편집
  - **Supabase Studio** 는 raw 데이터 응급용 백업 채널
- 자세한 기능은 [`ADMIN.md`](./ADMIN.md) 참고

### 2-4. 부가 인프라
| 용도 | 도구 | 비고 |
|---|---|---|
| 푸시 | FCM (+ APNs) via Expo Notifications | 무료 |
| 분석 (행동) | Amplitude | 100k MTU 무료 |
| 분석 (웹/마케팅) | GA4 + Search Console | 무료 |
| 에러 모니터링 | Sentry | 5k err/월 무료 |
| 모더레이션 | Sightengine NSFW API | 2,000 call/월 무료 |
| 이메일 | Resend | 3,000 mail/월 무료 |
| 어트리뷰션 | Singular Free | 무료 (Adjust 대안) |
| 피처 플래그 | GrowthBook OSS (Self-hosted) | 무료 |
| 디자인 시스템 검증 | Storybook + Chromatic | 무료 OSS 티어 |
| E2E | Maestro | 무료 |

---

## 3. 모노레포 구조 (수정 용이성 극대화)

```
jaringobi/
├── apps/
│   ├── mobile/              # Expo 앱 (사용자)
│   ├── admin/               # Next.js 어드민 (운영자)
│   └── landing/             # Next.js 랜딩 (이 레포의 landing/ 발전형)
├── packages/
│   ├── ui/                  # 공용 컴포넌트 + 디자인 토큰
│   │   └── tokens.ts        # 색상/폰트/스페이싱 단일 소스
│   ├── api/                 # zod 스키마 + Supabase 타입 + 클라이언트
│   ├── config/              # 미션 카테고리·난이도 enum 등 정적 설정
│   └── analytics/           # Amplitude/GA 이벤트 헬퍼 (이벤트 이름 단일화)
├── supabase/
│   ├── migrations/          # SQL 마이그레이션 (단방향)
│   ├── functions/           # Edge Functions (Deno)
│   └── seed.sql             # 미션 템플릿 초기 데이터
├── .github/workflows/       # CI/CD
├── pnpm-workspace.yaml
└── turbo.json
```

### 핵심 설계 원칙
1. **디자인 토큰 1소스** — `packages/ui/tokens.ts` 변경 시 앱·어드민·랜딩 동시 반영
2. **컨텐츠 100% DB 주도** — 일일 미션, 챌린지 팁, 수다방 운영자 글, 칭호 텍스트 모두 DB → 어드민에서 즉시 수정
3. **enum/문구 packages/config 격리** — 카테고리(식비/여가/충동/통장) 추가 시 한 파일만 수정
4. **타입 안전 풀스택** — Supabase에서 자동 생성된 TS 타입을 packages/api에서 zod로 한 번 더 검증

---

## 4. 데이터 모델 (Postgres)

핵심 14개 테이블. 자세한 ERD는 [`/architecture/erd.svg`](../architecture/erd.svg) 참고.

| 테이블 | 핵심 컬럼 | 비고 |
|---|---|---|
| `users` | id, email, provider | Supabase Auth 동기화 |
| `profiles` | user_id, nickname, equipped_title_id, avatar_state(jsonb) | 1:1 |
| `challenges` | id, user_id, mode(normal/hard), started_at, ends_at, target_amount, saved_amount, hearts_left, status | 회차 단위 |
| `mission_templates` | id, category, title, amount, difficulty, illust_url | 운영자 작성 |
| `daily_missions` | id, challenge_id, day_no(1~30), template_id, status(pending/locked/done), confirmed_at | 매일 자정 롤링 |
| `mission_logs` | id, daily_mission_id, photo_url, hash, moderation_score, status | 인증샷 1:1 |
| `coins_ledger` | id, user_id, delta, reason, ref_id, created_at | 이중기입(append-only) |
| `items` | id, sku, category(top/pants/room/etc), price_p, illust_url, is_active | 상점 SKU |
| `inventory` | user_id, item_id, acquired_at, is_favorite | 보유 |
| `equipped` | user_id, slot, item_id | 슬롯별 1개 장착 |
| `titles` | id, name, hex_illust_url, condition_json | 칭호 정의 |
| `community_rooms` | id, theme, color, illust_url, order | 운영자 지정 방 |
| `posts` | id, room_id, user_id, body, created_at | 수다방 글 |
| `bookmarks` | user_id, post_id, created_at | 스크랩 |
| `hearts_log` | id, challenge_id, used_at, idem_key | 양심 차감 |
| `push_campaigns` | id, segment_json, body, scheduled_at, ab_variant | 어드민 발송 |

### 주요 제약
- `daily_missions(challenge_id, day_no)` UNIQUE
- `coins_ledger` 잔액 계산은 항상 SUM(delta) — 직접 잔액 컬럼 없음
- `challenges.hearts_left` CHECK (0..3)
- 모든 user 종속 테이블에 RLS: `auth.uid() = user_id`

---

## 5. 화면 ↔ API 매핑

| 화면 | 동작 | 호출 |
|---|---|---|
| 로그인 | 소셜/이메일 | `supabase.auth.signInWith*` |
| 모드 선택 | 회차 시작 | Edge Fn `start_challenge(mode)` |
| 메인 | 캐릭터·금액·하트·미션 표시 | `select * from v_main_state` (뷰) + Realtime 구독 |
| 미션 변경 | 카테고리별 대체 후보 | `rpc('list_alt_missions', day_no, category)` |
| 미션 확정 | 오늘 미션 잠금 | Edge Fn `confirm_mission(daily_mission_id)` |
| 카메라 인증 | 사진 업로드 → 보상 | `storage.upload` → 자동 webhook → Edge Fn `verify_mission` |
| 양심 차감 | 하트 -1 | Edge Fn `decrement_heart(challenge_id, idem_key)` |
| 상점 구매 | 코인 차감 + 인벤토리 | Edge Fn `purchase_item(item_id)` |
| 옷장 장착 | 슬롯 변경 | `upsert equipped` (RLS) |
| 수다방 글 작성 | 글 + Realtime | `insert posts` |
| 스크랩 | 북마크 토글 | `upsert/delete bookmarks` |
| 마이페이지 | 회차 기록·캘린더 | `select * from v_my_records` |
| 챌린지 완료 공유 | OG 이미지 생성 | Edge Fn `generate_share_card(challenge_id)` |

---

## 6. 인증샷 검증 플로우

```
[앱] 카메라/갤러리 선택
  ↓ 1. presigned PUT URL 요청
[Edge Fn: get_upload_url]
  ↓ 2. presigned URL 반환
[앱] Storage에 직접 PUT (모바일 → CDN)
  ↓ 3. 업로드 완료 webhook
[Edge Fn: verify_mission]
  ├─ EXIF GPS strip (개인정보 제거)
  ├─ SHA-256 해시 → 동일 사용자 30일 내 중복 차단
  ├─ Sightengine NSFW score < 0.3
  ├─ 모두 통과 시 mission_logs.status = 'approved'
  └─ DB 함수 grant_rewards() 호출
[grant_rewards (PL/pgSQL, SERIALIZABLE)]
  ├─ coins_ledger insert (+100P)
  ├─ challenges.saved_amount += 미션 금액
  └─ daily_missions.status = 'done'
  ↓ Postgres CDC
[앱] Realtime 수신 → 메인 화면 +10,000원 / +100P 애니메이션
```

신고된 항목은 어드민 모더레이션 큐로 진입해 운영자 수동 처리.

---

## 7. 양심·하트 시스템 트랜잭션

```sql
-- decrement_heart Edge Fn 내부 호출
WITH locked AS (
  SELECT id, hearts_left FROM challenges
  WHERE id = $1 AND user_id = auth.uid()
  FOR UPDATE
)
UPDATE challenges c
SET hearts_left = hearts_left - 1
FROM locked l
WHERE c.id = l.id AND l.hearts_left > 0
RETURNING c.hearts_left;
```
- 멱등성: 클라이언트가 보낸 `idem_key`를 `hearts_log` UNIQUE로 저장 → 중복 클릭 무효
- 하트 0 도달 시 `challenges.status = 'failed'` 자동 전이 (트리거)

---

## 8. 예상 운영비 (월 기준)

> 환율 1,400원 기준, KRW 환산. 부가세 별도.

### 8-1. 단계별 총비용

| 단계 | MAU | 핵심 인프라 | 월 비용 |
|---|---|---|---|
| **MVP / 베타** | 0~1,000 | Supabase Free, Vercel Hobby, Expo Free, FCM | **0~70,000원** |
| **초기 성장** | 1k~10k | Supabase Pro $25, Vercel Pro $20, Sentry Team $26 | **120,000~350,000원** |
| **본격 성장** | 10k~50k | Supabase Team $599, 이미지 변환 CDN, 모더레이션 사용량 | **700,000~1,800,000원** |
| **확장** | 50k+ | AWS 자체 인프라(EKS/RDS/S3) 이전 검토 | 별도 산정 |

### 8-2. 항목별 상세 (1만 MAU 기준)
| 항목 | 도구 | 월 비용 | 산정 근거 |
|---|---|---|---|
| DB + Auth + Storage | Supabase Pro | $25 (35,000원) | 8GB DB, 100GB 대역폭 포함 |
| 추가 Storage | Supabase | ~$5 | 사진: 1만명 × 30일 × 0.6MB × 3개월 보관 ≈ 540GB → 25GB 무료 후 GB당 $0.021 ≈ $11 (실제는 라이프사이클로 절감) |
| Edge Functions | 포함 | $0 | 500k 호출 무료 |
| 어드민 호스팅 | Vercel Pro | $20 (28,000원) | 팀 1인 |
| 랜딩 호스팅 | Vercel Hobby | $0 | 정적 |
| 에러 추적 | Sentry Team | $26 (36,000원) | 50k err/월 |
| 행동 분석 | Amplitude | $0 | 100k MTU 무료 |
| 모더레이션 | Sightengine | ~$10 | 1만 미션 × 30일 = 30만 호출 |
| 이메일 | Resend | $0 | 3,000 무료 |
| 푸시 | FCM | $0 | 무제한 |
| 도메인 | jaringobi.app | 1,250원 (15,000원/년) | |
| **합계** | | **약 165,000원/월** | |

### 8-3. 인증사진 스토리지 산정식
```
사용자수 × 30일 × 평균사진크기 × 보관개월 = 총 GB
예) 10,000 × 30 × 0.6MB × 3 = 540 GB
→ 라이프사이클 정책: 30일 후 cold(저렴), 90일 후 삭제 → 실 비용 1/3
```

---

## 9. 서버 연결 방식

### 9-1. 기본 패턴: 클라이언트 ↔ Supabase 직접
```
[모바일 앱] ── (Supabase JS SDK, JWT) ──▶ [Supabase API Gateway]
                                              ├─ PostgREST (CRUD, RLS 자동)
                                              ├─ GoTrue (Auth)
                                              ├─ Storage (S3 호환)
                                              └─ Realtime (CDC over WebSocket)
```
- 단순 CRUD는 SDK 직접 호출 (RLS가 보호) → 백엔드 코드 0
- 도메인 로직(코인 지급, 회차 종료 등)은 Edge Function

### 9-2. Edge Function 활용
```ts
// supabase/functions/confirm_mission/index.ts (예시)
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )
  const { daily_mission_id } = await req.json()
  const userId = (await supabase.auth.getUser(req.headers.get('Authorization')!)).data.user!.id

  const { error } = await supabase.rpc('confirm_mission_tx', {
    p_user_id: userId,
    p_daily_mission_id: daily_mission_id,
  })
  if (error) return new Response(error.message, { status: 400 })
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } })
})
```

### 9-3. 스케줄러 (pg_cron)
```sql
-- 매일 자정 KST 일일 미션 롤링
select cron.schedule(
  'daily_mission_roll',
  '0 15 * * *', -- UTC 15:00 = KST 00:00
  $$ select net.http_post(
       url := 'https://<project>.functions.supabase.co/roll_daily_missions',
       headers := jsonb_build_object('Authorization','Bearer '||current_setting('app.cron_secret'))
     ) $$
);
```

### 9-4. RLS 예시
```sql
alter table profiles enable row level security;

create policy "self_read"  on profiles for select using (auth.uid() = user_id);
create policy "self_write" on profiles for update using (auth.uid() = user_id);
```

---

## 10. 수정 용이성 7원칙

1. **디자인 토큰 단일 소스** (`packages/ui/tokens.ts`) — 색·폰트·반경·그림자
2. **컨텐츠 DB 주도** — 일일 미션·챌린지 팁·수다방 토픽·칭호 텍스트 모두 어드민에서 편집
3. **피처 플래그 상시화** — GrowthBook 으로 신기능 토글 (앱 재배포 없이 ON/OFF)
4. **OTA 핫픽스** — Expo EAS Update 로 JS·이미지 변경 즉시 반영
5. **Storybook + Chromatic** — UI 회귀 자동 감지
6. **모노레포 + CODEOWNERS** — 영역별 리뷰어 자동 지정
7. **Maestro E2E 골든 패스** — 로그인 → 모드 선택 → 미션 확정 → 인증 → 보상까지 자동 검증

---

## 11. 보안·개인정보

- **KISA 가이드 준수** — 개인정보보호법·정보통신망법
- **연령 게이트** — 14세 미만 가입 차단 (가입 시 생년월일)
- **사진 EXIF GPS 자동 제거** — Storage Webhook → Edge Fn에서 메타데이터 strip
- **회원 탈퇴** — 즉시 닉네임/사진 익명화, 30일 보관 후 hard delete
- **약관 / 개인정보처리방침** — 랜딩과 앱 양쪽에 동일 문서 게시
- **OWASP ASVS Level 1** — 인증/세션/암호 저장 항목 자체 점검
- **시크릿 관리** — 1Password + GitHub Actions OIDC, 클라이언트엔 anon key만 노출

---

## 12. 출시 체크리스트

- [ ] iOS Apple Developer 등록 ($99/년)
- [ ] Google Play 등록 ($25 1회)
- [ ] 앱 아이콘 1024px / 스플래시
- [ ] 앱스토어 스크린샷 6.7" / 6.5" / 5.5" (각 5장)
- [ ] 개인정보처리방침 페이지 (`jaringobi.app/privacy`)
- [ ] 서비스 이용약관 (`jaringobi.app/terms`)
- [ ] 운영자 정책 (수다방 신고/삭제 기준)
- [ ] 푸시 권한 사전 안내 모달
- [ ] 카메라/사진 권한 사전 안내 모달
- [ ] 1차 베타 테스터 50명 (TestFlight / Play Internal)
- [ ] Sentry / Amplitude 이벤트 매핑 검증
- [ ] CS 채널 (Resend 이메일 또는 채널톡)

---

## 13. 로드맵

| 기간 | 단계 | 주요 산출물 |
|---|---|---|
| W1~W2 | 셋업 | 모노레포·CI·디자인 토큰·Auth |
| W3~W5 | 코어 | 메인·미션 확정·카메라 인증·코인 지급 |
| W6~W7 | 성장 | 상점·옷장·캐릭터 룸 |
| W8 | 부가 | 수다방·마이페이지·공유 카드 |
| W9~W10 | 베타 | TestFlight/Play Internal, 버그 수정 |
| W11~W12 | 출시 | 마케팅, 인플루언서 시딩, 정식 출시 |
| 출시 후 1개월 | 시즌1 | 테마 챌린지, 신규 아이템 드롭 |
| 출시 후 3개월 | 수익화 | 시즌패스, 콜라보 캐릭터 |

---

## 부록 A. PDF 변환 안내
이 문서를 PDF로 변환하려면:
```bash
brew install pandoc
pandoc docs/SPEC.md -o docs/SPEC.pdf \
  --pdf-engine=xelatex \
  -V mainfont="Apple SD Gothic Neo" \
  -V geometry:margin=1in
```

## 부록 B. 관련 문서
- 관리자 페이지 상세: [`ADMIN.md`](./ADMIN.md)
- 시스템 아키텍처: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- 다이어그램: [`/architecture/`](../architecture/)
