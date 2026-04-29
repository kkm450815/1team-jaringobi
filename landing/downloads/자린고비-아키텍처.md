# 자린고비 — 시스템 아키텍처

본 문서는 자린고비 앱의 **논리·물리·배포·데이터 흐름**을 한눈에 정리한 종합 아키텍처 가이드입니다.

다이어그램 5종은 [`/architecture/`](../architecture/) 폴더의 SVG 파일을 함께 참고하세요.

| # | 다이어그램 | 파일 |
|---|---|---|
| 1 | 시스템 전체 | [`system-overview.svg`](../architecture/system-overview.svg) |
| 2 | 데이터 플로우 (인증샷) | [`data-flow.svg`](../architecture/data-flow.svg) |
| 3 | DB ERD | [`erd.svg`](../architecture/erd.svg) |
| 4 | 배포 / CI·CD | [`deployment.svg`](../architecture/deployment.svg) |
| 5 | 모노레포 모듈 의존도 | [`module-map.svg`](../architecture/module-map.svg) |

---

## 1. 4-Layer 논리 아키텍처

```
┌────────────────────────────────────────────────────────────┐
│ ① Presentation                                              │
│   • React Native (Expo) — 사용자 모바일 앱                  │
│   • Next.js Admin       — 운영자 어드민                     │
│   • Static Landing      — 마케팅                            │
├────────────────────────────────────────────────────────────┤
│ ② Edge / API                                                │
│   • Supabase Edge Functions (Deno)                          │
│     - confirm_mission, verify_mission, decrement_heart      │
│     - purchase_item, finalize_round, roll_daily_missions    │
│     - get_upload_url, generate_share_card                   │
│   • PostgREST (RLS 자동) — 단순 CRUD                        │
├────────────────────────────────────────────────────────────┤
│ ③ Data                                                      │
│   • Postgres (RLS, RPC, pg_cron, triggers)                  │
│   • Storage (S3 호환, 이미지 변환)                          │
│   • Realtime (Postgres CDC over WebSocket)                  │
├────────────────────────────────────────────────────────────┤
│ ④ External                                                  │
│   • FCM / APNs (푸시)                                       │
│   • Sightengine (NSFW 모더레이션)                           │
│   • Amplitude / GA4 / Sentry (관측)                         │
│   • Resend (이메일)                                         │
└────────────────────────────────────────────────────────────┘
```

### 책임 분리 원칙
- **단순 CRUD** (프로필 수정, 게시글 작성, 옷 장착) → 클라이언트가 PostgREST 직접 호출, RLS가 보호
- **트랜잭션·보상·검증** → Edge Function이 SERVICE_ROLE 키로 PL/pgSQL RPC 호출 (원자성)
- **외부 호출** (Sightengine, FCM) → 항상 Edge Function 경유 (시크릿 노출 방지)

---

## 2. 핵심 데이터 플로우

### 2-1. 인증샷 업로드 → 보상
```
[App]               [Edge Fn]         [Storage]      [DB]            [Realtime]
  │  1.upload url       │                 │             │                 │
  ├────────────────────▶│                 │             │                 │
  │  2.presigned URL    │                 │             │                 │
  │◀────────────────────┤                 │             │                 │
  │  3.PUT photo                          │             │                 │
  ├──────────────────────────────────────▶│             │                 │
  │                     │   4.webhook     │             │                 │
  │                     │◀────────────────┤             │                 │
  │                     │ 5.EXIF strip                  │                 │
  │                     │ 6.NSFW check                  │                 │
  │                     │ 7.dup hash                    │                 │
  │                     │ 8.RPC grant_rewards           │                 │
  │                     ├──────────────────────────────▶│                 │
  │                     │                  │            │ 9.CDC           │
  │                     │                  │            ├────────────────▶│
  │ 10.실시간 업데이트 (+10,000원 / +100P)                                │
  │◀───────────────────────────────────────────────────────────────────────┤
```

### 2-2. 양심 하트 차감
```
[App] ──confirm──▶ [Edge Fn decrement_heart]
                     ├─ idempotency: insert hearts_log (UNIQUE idem_key)
                     ├─ RPC: SELECT ... FOR UPDATE → UPDATE hearts_left
                     └─ if hearts_left == 0 → trigger fires → status='failed'
                   ──▶ [App]: hearts UI 갱신
```

### 2-3. 일일 미션 롤링 (00:00 KST)
```
[pg_cron] ──HTTP POST──▶ [Edge Fn roll_daily_missions]
                            ├─ for each active challenge:
                            │   ├─ pick 3 random mission_templates (난이도 가중)
                            │   └─ insert daily_missions(day_no = today_index)
                            └─ FCM batch send
```

### 2-4. 회차 종료 (D-0)
```
[pg_cron 00:05 KST] ──▶ [Edge Fn finalize_round]
                          ├─ 완주 판정 (saved_amount >= target)
                          ├─ 칭호 자동 부여 (조건 만족 시)
                          ├─ generate_share_card → OG image to Storage
                          └─ 푸시: "30일 완주! 결과 보기"
```

### 2-5. 상점 구매
```
[App] ──RPC purchase_item──▶ [Edge Fn]
   └─ Postgres SERIALIZABLE 트랜잭션
        ├─ SELECT SUM(delta) FROM coins_ledger ≥ price_p
        ├─ INSERT coins_ledger (-price_p, reason='purchase')
        └─ INSERT inventory(user_id, item_id)
```

### 2-6. 수다방 글 작성
```
[App] ──insert posts (RLS: auth.uid()=user_id)──▶ [DB]
              └─ Realtime CDC ──▶ 다른 클라이언트 피드 갱신
```

---

## 3. 환경 / 네트워크 토폴로지

### 3-1. 환경 분리
| 환경 | 모바일 | 어드민 | DB | 용도 |
|---|---|---|---|---|
| dev | Expo Go (로컬) | localhost:3000 | Supabase 로컬 | 개발자 PC |
| staging | EAS preview 채널 | preview.admin… | Supabase Branch DB | 베타 테스터, QA |
| prod | App Store / Play | admin.jaringobi.app | Supabase prod | 실 사용자 |

### 3-2. 도메인
- `jaringobi.app` — 랜딩 (Vercel)
- `admin.jaringobi.app` — 어드민 (Vercel)
- `api.jaringobi.app` — Supabase 커스텀 도메인 (CNAME)

### 3-3. 시크릿 관리
- 개발자 로컬: `.env.local` (gitignore)
- CI: GitHub Actions OIDC + 1Password Connect
- Edge Function: Supabase 환경변수
- 클라이언트엔 anon key + URL만 노출, service_role 절대 금지

### 3-4. 백업 / DR
- Postgres PITR 7일 (Supabase Pro)
- 일 1회 논리 백업 → S3 (다른 리전)
- 사진: 90일 후 cold storage, 180일 후 삭제 라이프사이클

---

## 4. CI/CD 파이프라인

```
[GitHub Push]
    │
    ├──▶ lint-test.yml  (PR / push)
    │      pnpm lint, typecheck, vitest, Maestro smoke
    │
    ├──▶ migrate.yml    (supabase/migrations/** 변경)
    │      staging 자동 적용 → 수동 승인 → prod 적용
    │
    ├──▶ web-deploy.yml (apps/admin or apps/landing 변경)
    │      Vercel preview (PR) / Vercel prod (main)
    │
    └──▶ mobile-release.yml (tag: mobile-v*)
           EAS Build (iOS/Android) → EAS Submit (Store)

OTA 핫픽스:
  eas update --branch production
  → JS·이미지만 변경 시 심사 우회 (네이티브 모듈 변경 시는 정식 빌드)
```

---

## 5. 비기능 요건 매핑

| 항목 | 목표 | 수단 |
|---|---|---|
| 가용성 | 99.5% | Supabase SLA + 다중 지역 CDN |
| 응답 시간 | p95 API < 300ms | RLS 단순화, 인덱스, materialized view |
| 보안 | OWASP ASVS L1 | RLS 100%, EXIF GPS strip, 시크릿 격리 |
| 관측성 | trace_id 통합 | Sentry + Supabase Logs + Amplitude |
| 확장성 | 50k MAU 무리없이 | Edge Fn 수평 확장, Postgres 읽기 전용 복제(추후) |
| 유지보수성 | 비개발자 컨텐츠 편집 | 어드민 CMS + 피처 플래그 + OTA |

---

## 6. 미래 확장 옵션

- **AWS 마이그레이션**: Postgres → RDS, Storage → S3, Edge Fn → Lambda@Edge
- **이미지 최적화**: Cloudflare Images / imgproxy 도입
- **AI 자동 모더레이션 강화**: Claude Vision으로 영수증 진위 판별
- **소셜 그래프**: 친구 시스템 + 그룹 챌린지
- **결제 연동**: Toss Payments / Apple/Google IAP (시즌 패스)

---

## 7. 의사결정 기록 (ADR 요약)

| # | 결정 | 이유 |
|---|---|---|
| ADR-001 | Flutter 대신 React Native + Expo | OTA 업데이트, 인력 풀, 라이브러리 |
| ADR-002 | 자체 백엔드 대신 Supabase | MVP 속도, 운영 인건비 절감 |
| ADR-003 | REST 대신 PostgREST + Edge Fn | 단순 CRUD 코드 0, 도메인 로직만 작성 |
| ADR-004 | Redux 대신 Zustand + TanStack Query | 보일러플레이트 최소 |
| ADR-005 | 별도 모더레이션 서버 대신 Sightengine | 1만 호출 무료, 운영 복잡도 ↓ |
