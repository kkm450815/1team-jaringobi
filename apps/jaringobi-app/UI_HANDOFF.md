# 자린고비 모바일 앱 — UI Handoff

> 피그마 디자인을 React + Tailwind로 옮긴 모바일 UI 프로토타입.
> Claude Code(또는 다른 에이전트/개발자)가 이 문서만으로도 화면을 이어 만들 수 있도록 작성했습니다.

---

## 0. 빠른 시작

```bash
cd apps/jaringobi-app
pnpm install        # 또는 npm install
pnpm dev            # http://localhost:5173
pnpm build          # 정적 빌드
pnpm preview        # 빌드 미리보기 (모바일 같은 네트워크에서 IP 접속)
```

> **이미지 자료**: 레포 루트 `img/` 폴더가 `vite.config.ts`의 `publicDir`로 설정되어 있어
> 코드에서 `/jarin/...`, `/shop/...`, `/fit/...` 으로 바로 접근됩니다.
> 별도 복사 / import 불필요.

---

## 1. 디자인 토큰

| 토큰 | Tailwind 클래스 | HEX |
|---|---|---|
| 배경 | `bg-bg`, `text-bg` | `#F6EEDE` |
| 기본 (노말) | `bg-primary` | `#ABBCA2` |
| 포인트 (하드 / 강조) | `bg-accent` | `#617C53` |
| 본문 텍스트 / 라인 | `text-text` | `#514C44` |
| 추가 포인트 (양심·경고) | `bg-pink` | `#F49496` |

폰트: **GangwonEduAll** (Light 300 / Bold 700) — `tailwind.config.ts > fontFamily.sans`.
프로젝트 가장 처음 로드되는 `src/styles/index.css` 에 `@font-face`가 들어가 있어
어디서든 `font-bold`/일반 클래스만 쓰면 자동 적용됩니다.

> **외부망 차단 환경**이라 CDN 폰트가 안 잡히면, 강원도교육청에서 받은 .otf/.woff2 파일을
> `apps/jaringobi-app/public-fonts/` 에 넣고 `index.css` 의 `src` URL 만 로컬 경로로 바꿔주세요.
> Pretendard / Apple SD Gothic Neo 로 자동 폴백됩니다.

---

## 2. 디렉토리

```
apps/jaringobi-app/
├── index.html
├── package.json / vite.config.ts / tsconfig.json / tailwind.config.ts
├── src/
│   ├── main.tsx              # ReactDOM + HashRouter
│   ├── App.tsx               # 12 screens 라우팅
│   ├── styles/index.css      # Tailwind + @font-face + 모눈종이 배경 utility
│   ├── components/
│   │   ├── PhoneFrame.tsx    # 데스크톱 프리뷰용 393×852 폰 프레임 (모바일에선 풀스크린)
│   │   ├── BottomTabBar.tsx  # [수다방 / 챌린지 / 카메라] 3-탭
│   │   └── UI.tsx            # Button, Card, Tag, Modal, Hex, TopBar, HangingFish
│   ├── lib/
│   │   └── data.ts           # 미션·수다방·칭호·상점 시드 데이터
│   └── screens/              # ↓ 12 screens
└── UI_HANDOFF.md             # ← 이 문서
```

---

## 3. 라우팅 / 화면 매핑

| 경로 | 화면 | 파일 | 비고 |
|---|---|---|---|
| `/` | 스플래시 | `screens/Splash.tsx` | 1.4초 후 `/login` 자동 이동 |
| `/login` | 로그인 | `screens/Login.tsx` | 비밀번호 토글, 소셜 3종 |
| `/mode` | 모드 선택 | `screens/ModeSelect.tsx` | 노말 / 하드 카드 |
| `/main` | 메인(홈) | `screens/Main.tsx` | 양심하트·D-day·룸·미션·확정·인증·하단탭 |
| `/shop` | 상점 | `screens/Shop.tsx` | 카테고리 탭 + 3열 그리드 + 미리보기 |
| `/wardrobe` | 옷장 | `screens/Wardrobe.tsx` | 즐겨찾기 별 + 사용 중 태그 |
| `/talk` | 수다방 리스트 | `screens/TalkList.tsx` | 4개 운영자 토픽 |
| `/talk/:id` | 수다방 스레드 | `screens/TalkRoom.tsx` | 입력폼 + 피드 + 북마크 |
| `/challenges` | 챌린지 정보 리스트 | `screens/ChallengeList.tsx` | 카테고리 4탭 |
| `/challenges/:id` | 챌린지 상세 | `screens/ChallengeDetail.tsx` | 모눈종이 배경 |
| `/mypage` | 마이페이지 | `screens/MyPage.tsx` | 프로필·캘린더·칭호 팝업 |
| `/camera` | 카메라 인증 | `screens/Camera.tsx` | 갤러리/카메라 업로드 + 보상 |
| `/index` | 화면 인덱스 | `screens/ScreenIndex.tsx` | 디버그용 — 모든 화면 링크 |

> 첫 진입 후 시연 흐름: `/` → `/login` → `/mode` → `/main` → (모달) 미션 확정 → `/camera` → 보상 → `/main`

---

## 4. 모달 / 팝업 컴포넌트

| 모달 | 트리거 | 동작 |
|---|---|---|
| 양심 삭제 | 메인 상단 하트 클릭 | 거대 하트 + [취소 / 양심 삭제] |
| 미션 세팅 | 메인 [오늘의 절약미션] | 3개 미션 카드 + [변경 →] + [챌린지 확정하기] |
| 미션 변경 | 미션 세팅 안 [변경 →] | 카테고리 4탭 + 대체 미션 리스트 |
| 칭호 변경 | 마이페이지 헥사곤 클릭 | 3열 헥사곤 그리드, 활성/잠금/획득 상태 |

모두 `components/UI.tsx` 의 `<Modal>` 위에 화면별로 콘텐츠를 얹는 패턴입니다.

---

## 5. 컴포넌트 구조

### `<Button variant size>`
- `variant`: `primary` | `accent` | `ghost` | `pink` | `white`
- `size`: `sm` | `md` | `lg` (lg = full-width)

### `<Tag color>`
- `color`: `pink` | `accent` | `primary` | `mute`
- 난이도(쉬움/보통/어려움) → `pink`, "사용 중"·"진행 중" → `accent`

### `<Modal open onClose>`
- 반투명 백드롭 + 베이지 카드 (320px 최대)
- 백드롭 클릭 / ESC 로 닫힘 (ESC는 호출 측에서 onClose 처리)

### `<Hex locked active color>`
- CSS clip-path 헥사곤. `active` 시 핑크 "적용 중" 태그 자동 표시.

### `<TopBar back title right>`
- 모든 서브 페이지 공통. `back`은 라우터 path string, `right`는 임의 ReactNode.

### `<BottomTabBar>`
- 메인/수다방 등에 부착. 현재 라우트에 따라 활성 표시.

### `<HangingFish size>`
- 밧줄에 묶인 굴비 아이콘 (모드 선택, 수다방 리스트 상단).

### `<PhoneFrame>`
- 데스크톱(`md:` 이상)에서 393×852 폰 외곽선·노치 톤 프레임으로 감싸고,
- 모바일에서는 풀스크린(100dvh)으로 자동 전환.

---

## 6. 데이터 시드 (`src/lib/data.ts`)

| export | 설명 |
|---|---|
| `MISSIONS` | 20개 미션 (id, category, title, amount, difficulty, iconKey) |
| `TALK_ROOMS` | 4개 운영자 토픽 + 일러스트 + 배경 색 |
| `TITLES` | 9개 칭호 (got/active 상태) |
| `SHOP_ITEMS` | 4 카테고리 × 12 아이템 (전체/사치품/티셔츠/리모델링) — `/shop/*/*.png` |
| `PRICES` | 가격 풀 (50~450P) |

> 실서비스에서는 이 시드를 **Supabase**에서 불러오도록 교체합니다 (`docs/SPEC.md` §5 참조).

---

## 7. 구현 시 주의

1. **이미지 경로는 `publicDir(=../../img)` 기준 절대경로**로 작성합니다.
   예) `<img src="/jarin/logo.png" />`. 빌드 시 자동으로 `dist/` 에 복사됩니다.
2. **`main_ room.png`** — 파일명 중간 공백 1칸. 그대로 사용.
3. **3열 그리드(상점·옷장)** — `grid-cols-3 gap-2.5` 가 393px 폭에 가장 적합.
4. **하단 탭바**가 들어간 화면(`Main`, `TalkList`)에서는 `flex flex-col min-h-full + mt-auto`로 최하단 정렬.
5. **모달**은 z-index 50 — Toast 등을 추가하면 51 이상 사용.
6. **HashRouter** 채택 — 정적 호스팅(GitHub Pages, S3) 시 새로고침 시 404 방지.

---

## 8. 다음 단계 (TODO)

- [ ] **Supabase 연동**: `lib/data.ts` 의 시드를 `lib/api.ts`로 교체, 인증/RLS 적용
- [ ] **카메라 업로드 실제 구현**: presigned URL → Storage → Edge Function `verify_mission`
- [ ] **Realtime 구독**: 메인의 누적 금액·코인을 Postgres CDC로 실시간 갱신
- [ ] **i18n 추출**: 모든 한국어 문구를 `packages/config/i18n.ts`로 이동
- [ ] **Storybook**: UI.tsx의 컴포넌트들을 Story로 추가 → Chromatic 회귀
- [ ] **Maestro E2E**: 로그인 → 모드 → 미션 확정 → 인증 → 보상 흐름 자동화
- [ ] **Lottie 애니메이션**: 코인 +100P 팝, 캐릭터 호흡
- [ ] **다크 모드 검토**: 베이지 톤 유지를 위해 일단 보류, 향후 시즌 한정 테마로

---

## 9. 검증 체크리스트

- [ ] `/`(스플래시) 1.4초 후 `/login` 자동 이동
- [ ] `/login` 비밀번호 눈 모양 토글
- [ ] `/mode` 카드 둘 중 어느 쪽이든 클릭 시 `/main` 이동
- [ ] `/main` 양심 하트 클릭 → 모달 → "양심 삭제" 시 하트 -1
- [ ] `/main` "오늘의 절약미션" → 변경 → 확정 → 카드 리스트로 전환 + [양심 깎기]/[카메라] 노출
- [ ] `/main` 우하단 플로팅 버튼 → `/shop`
- [ ] `/shop` 카테고리 탭 동작 + 그리드 아이템 클릭 시 룸 미리보기 갱신
- [ ] `/shop` 우상단 옷장 아이콘 → `/wardrobe`
- [ ] `/wardrobe` ★ 토글, 사용 중 태그 표시
- [ ] `/talk` 4개 토픽 카드, 하단 탭 [챌린지/카메라] 동작
- [ ] `/talk/:id` 입력폼 → 피드 즉시 추가, 북마크 토글
- [ ] `/challenges` 카테고리 4탭 + 카드 → 상세 페이지
- [ ] `/challenges/:id` 모눈종이 배경, 인증샷 가이드 노출
- [ ] `/mypage` 캘린더 12일 인증 채워짐, 헥사곤 클릭 → 칭호 팝업
- [ ] `/camera` 갤러리/카메라 트리거, 미리보기 표시
- [ ] iPhone 14 (393px) 시뮬레이터에서 넘침 없음
- [ ] Lighthouse 모바일 점수 > 90

---

## 10. 참고 문서

- 마스터 기획 / 스택 / 운영비: `../../docs/SPEC.md`
- 관리자 / 홍보 페이지 스펙: `../../docs/ADMIN.md`
- 시스템 아키텍처: `../../docs/ARCHITECTURE.md`
- 다이어그램 5종: `../../architecture/*.svg`
- 마케팅 랜딩: `../../landing/index.html`
