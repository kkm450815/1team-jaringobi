# 자린고비 (Jaringobi)

> 챌린지형 저축 게이미피케이션 앱 — 귀엽게 모으는 30일 저축 게임.

본 레포는 **제작 설명서 + 시스템 아키텍처 + 홍보용 랜딩 페이지**를 담고 있습니다. 앱 본체 코드는 별도 모노레포(`apps/mobile`, `apps/admin`)로 분리될 예정입니다.

## 📁 디렉토리

```
.
├── docs/                          # 공식 문서 (마크다운)
│   ├── SPEC.md                    # 마스터 제작 설명서 (스택·운영비·서버연결)
│   ├── ADMIN.md                   # 관리자 / 홍보 페이지 스펙
│   └── ARCHITECTURE.md            # 시스템 아키텍처 종합
├── architecture/                  # 다이어그램 (SVG)
│   ├── system-overview.svg
│   ├── data-flow.svg
│   ├── erd.svg
│   ├── deployment.svg
│   └── module-map.svg
├── landing/                       # 홍보용 정적 랜딩 페이지
│   ├── index.html
│   ├── architecture.html
│   ├── styles.css
│   ├── script.js
│   └── downloads/
├── apps/
│   └── jaringobi-app/             # 모바일 앱 (Vite + React + TS + Tailwind)
│       ├── src/
│       │   ├── components/        # PhoneFrame, BottomTabBar, UI(Button/Card/Tag/Modal/Hex/TopBar/HangingFish)
│       │   ├── screens/           # 12 screens (Splash, Login, ModeSelect, Main, Shop, Wardrobe, ...)
│       │   ├── lib/data.ts        # 미션·수다방·칭호 시드
│       │   └── styles/index.css   # GangwonEduAll @font-face + brand tokens
│       └── UI_HANDOFF.md          # ← Claude Code / 개발자 인계 문서
└── img/                           # 디자인 자료 (캐릭터·아이템·룸 PNG, 575개)
```

## 🚀 로컬 미리보기

**모바일 앱 (Vite + React)**
```bash
cd apps/jaringobi-app
pnpm install
pnpm dev          # http://localhost:5173 — /index 경로로 화면 인덱스 진입 가능
```

**홍보 랜딩**
```bash
cd landing
python3 -m http.server 8080
# → http://localhost:8080 접속
```

## 📖 빠른 링크

- 제작 설명서: [`docs/SPEC.md`](./docs/SPEC.md)
- 관리자 / 홍보 페이지: [`docs/ADMIN.md`](./docs/ADMIN.md)
- 시스템 아키텍처: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- 랜딩 페이지: [`landing/index.html`](./landing/index.html)
- 아키텍처 페이지: [`landing/architecture.html`](./landing/architecture.html)
- 모바일 앱: [`apps/jaringobi-app/`](./apps/jaringobi-app/) — handoff 문서 [`UI_HANDOFF.md`](./apps/jaringobi-app/UI_HANDOFF.md)

## 🎨 브랜드 팔레트

| 역할 | HEX |
|---|---|
| 배경 | `#F6EEDE` |
| Primary (노말 모드) | `#ABBCA2` |
| Accent (하드 모드 / 강조) | `#617C53` |
| 텍스트 / 라인 | `#514C44` |
| Highlight (양심 / 알림) | `#F49496` |

## 🛠 권장 스택 한 줄 요약

> **React Native (Expo) + Supabase + Next.js 어드민**, 모노레포(pnpm + Turborepo), CMS·피처 플래그로 비개발자도 미션·문구·이벤트 즉시 변경 가능. MVP 월 운영비 0~7만원, 1만 MAU 기준 약 30만원.

자세한 내용은 [`docs/SPEC.md`](./docs/SPEC.md) 참고.

## 📦 배포

랜딩 페이지는 의존성 0의 정적 사이트로, 다음 무료 호스팅에 그대로 올릴 수 있습니다.
- **Vercel**: `vercel deploy landing`
- **Netlify**: drag & drop `landing/` 폴더
- **GitHub Pages**: `landing/` 을 publish 폴더로 지정
