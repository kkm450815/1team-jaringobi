# 튜토리얼 (코치마크) 작업 계획

신규 사용자가 모드 선택 직후 메인 화면을 처음 봤을 때, 실제 UI 요소를
하나씩 가리키며 "이게 뭐고 어떻게 쓰는지" 설명하는 코치마크 형식.

## 0. 결정 사항

- [x] **방식: 코치마크** — 실제 UI 위에 반투명 overlay + 강조할 element 만
  하이라이트 + 말풍선 설명
- [x] **이탈 차단** — 튜토리얼 진행 중 사용자는 정해진 "다음" 버튼 외 다른
  터치 모두 무시. 라우트 변경(뒤로가기·탭바)도 차단.
- [x] **트리거** — 모드 선택 + 닉네임 설정 끝나고 `/main` 첫 진입 시 1회.
  `UserState.tutorialSeen` 플래그로 재진입 차단. Settings 에 "튜토리얼
  다시 보기" 버튼 추가하여 언제든 재시작 가능.

## 1. 단계 시나리오 (Main 화면 1개 안에서 5스텝)

| # | 강조 대상 | 말풍선 문구 |
|---|---|---|
| 1 | 양심 ♥♥♥ | "양심 3개. 미션 안 지키면 깎이고, 0이 되면 포인트 절반 차감돼요" |
| 2 | 누적 저축액 (큰 숫자) | "30일간 모은 절약 금액. 매일 인증할 때마다 늘어나요" |
| 3 | 캐릭터 룸 | "여기가 내 방. 포인트로 사치품·옷·인테리어 사서 꾸밀 수 있어요" |
| 4 | 오늘의 절약미션 버튼 | "매일 미션 1개 골라 인증 사진 올리면 보상 적립" |
| 5 | 하단 탭바 (카메라/상점/수다방) | "탭으로 화면 이동 — 카메라에서 인증, 상점에서 구매, 수다방에서 소통" |

마지막 step "다음" → `tutorialSeen=true` 저장 + overlay 제거 → 자유 사용 시작.

각 step 우상단에 `1 / 5` 표시 + "건너뛰기" 작게.

## 2. 구현 — 컴포넌트 구조

### 2-1. `components/TutorialOverlay.tsx` (신규, ~180줄)

```tsx
interface Step {
  targetSelector: string;       // [data-tutorial="hearts"] 등
  text: string;
  tooltipPlacement: 'top' | 'bottom' | 'left' | 'right';
  // 강조 영역 padding (target rect 둘레로 여백 줘서 보기 좋게)
  pad?: number;
}

export function TutorialOverlay({
  steps, onFinish,
}: { steps: Step[]; onFinish: () => void }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // target element 위치 추적 (resize / scroll 대응)
  useLayoutEffect(() => {
    const measure = () => {
      const el = document.querySelector(steps[idx].targetSelector);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setRect(el.getBoundingClientRect());
      }
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const t = setInterval(measure, 200);  // 애니메이션 동안 추적
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      clearInterval(t);
    };
  }, [idx]);

  // 라우터 이탈 차단 — react-router-dom v6: useBlocker 또는
  // history.pushState 가로채기. 실제로는 BottomTabBar 클릭이 overlay 에
  // 가려져 동작 안 하므로 별도 라우트 가드는 불필요할 수도.
  // 안전장치로 popstate 차단:
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.pathname);
    };
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (!rect) return <FullDarkOverlay />;  // 측정 중

  // SVG 로 cut-out 구현 — 화면 전체 어둡게, 강조 영역만 투명
  const pad = steps[idx].pad ?? 8;
  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="cutout">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - pad} y={rect.top - pad}
              width={rect.width + pad * 2} height={rect.height + pad * 2}
              rx={12} fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#cutout)" />
      </svg>

      {/* 강조 영역 둘레 ring 효과 */}
      <div
        className="absolute rounded-xl ring-4 ring-amber-300/80 pointer-events-none"
        style={{
          left: rect.left - pad, top: rect.top - pad,
          width: rect.width + pad * 2, height: rect.height + pad * 2,
        }}
      />

      {/* 말풍선 */}
      <Tooltip rect={rect} placement={steps[idx].tooltipPlacement}>
        <p className="text-[14px]">{steps[idx].text}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-text/55">{idx + 1} / {steps.length}</span>
          <div className="flex gap-2">
            <button onClick={onFinish} className="text-[12px] text-text/55">건너뛰기</button>
            <button
              onClick={() => idx + 1 >= steps.length ? onFinish() : setIdx(idx + 1)}
              className="bg-accent text-white px-4 py-1.5 rounded-full text-[13px] font-bold"
            >
              {idx + 1 >= steps.length ? '시작하기' : '다음'}
            </button>
          </div>
        </div>
      </Tooltip>
    </div>
  );
}
```

핵심 기법:
- **SVG mask 로 cut-out**: overlay 전체를 어둡게 + 강조 영역만 mask 로 투명. CSS box-shadow trick 보다 정확.
- **ring 으로 글로우**: 강조 영역 둘레에 amber ring → 시선 유도.
- **pointer-events**: overlay 자체에 `pointer-events-auto` → 강조 영역 외 모든 클릭 흡수. 강조 영역 클릭이 필요하면 그 부분만 `pointer-events: none` 으로 따로 cut-out (이번 안에선 클릭 허용 안 하고 "다음" 버튼만 진행시킴).

### 2-2. data-tutorial 어트리뷰트 부착 (Main.tsx 수정)

```tsx
{/* 양심 */}
<div data-tutorial="hearts" className="flex gap-0">
  {[0,1,2].map(...)}
</div>

{/* 누적 저축액 */}
<p data-tutorial="totalSaved" className="...">{u.totalSaved.toLocaleString()}</p>

{/* 캐릭터 룸 */}
<div data-tutorial="room" ref={roomRef} ...>...</div>

{/* 오늘의 절약미션 버튼 */}
<button data-tutorial="missionButton" ...>오늘의 절약미션</button>

{/* 하단 탭바 — BottomTabBar 컴포넌트에 data-tutorial="tabbar" 추가 */}
```

### 2-3. userState 변경

```ts
interface UserState {
  // ...
  tutorialSeen: boolean;
}

const DEFAULT = {
  // ...
  tutorialSeen: false,
};

// read() 안에서:
tutorialSeen: typeof parsed.tutorialSeen === 'boolean' ? parsed.tutorialSeen : DEFAULT.tutorialSeen,
```

### 2-4. Main.tsx 트리거

```tsx
const [showTutorial, setShowTutorial] = useState(false);
useEffect(() => {
  if (!u.tutorialSeen) setShowTutorial(true);
}, [u.tutorialSeen]);

// ...return 안 마지막에:
{showTutorial && (
  <TutorialOverlay
    steps={MAIN_TUTORIAL_STEPS}
    onFinish={() => {
      u.update({ tutorialSeen: true });
      setShowTutorial(false);
    }}
  />
)}
```

### 2-5. Settings 에 "튜토리얼 다시 보기" 버튼

```tsx
<button
  onClick={() => { u.update({ tutorialSeen: false }); nav('/main'); }}
  className="..."
>
  튜토리얼 다시 보기
</button>
```

## 3. 라우터 이탈 차단

세 군데 차단 필요:
1. **하단 탭바 클릭** — overlay 가 위를 덮어 click 흡수 (자동)
2. **브라우저 뒤로가기** — `popstate` 이벤트 차단 (위 코드 참조)
3. **다른 라우트로 navigate** — 튜토리얼 진행 중인 화면(Main) 이외 navigate 가
   호출될 일이 없으므로 별도 가드 불필요

## 4. 측정 / scroll 처리

- 강조 element 가 viewport 밖이면 `scrollIntoView({ block: 'center' })`
- 화면 회전 / 리사이즈 시 rect 재측정
- 캐릭터 룸 (step 3) 은 화면 중앙 근처라 안전. 탭바 (step 5) 는 하단 고정.

## 5. 작업량 추정

| 작업 | 시간 |
|---|---|
| TutorialOverlay 컴포넌트 (SVG mask + tooltip 위치 계산) | 1.5h |
| 5스텝 콘텐츠 작성 + data-tutorial 어트리뷰트 부착 | 0.5h |
| userState.tutorialSeen + Main 트리거 | 0.3h |
| 라우터/popstate 가드 + 테스트 | 0.5h |
| Settings 다시 보기 버튼 + 동선 테스트 | 0.2h |
| 모바일 viewport (420×900) 시각 점검 + 미세 조정 | 0.5h |
| **총** | **3.5h** |

## 6. 리스크 / 대안

- **SVG mask 호환성** — Safari iOS 14+ 동작 확인 필요. 안 되면 `clip-path:
  polygon(evenodd)` 또는 4개 div(상/하/좌/우) 로 분할 구현 가능.
- **target element 가 동적으로 마운트** — `useLayoutEffect` + 200ms interval
  로 폴링하므로 1초 안에 따라잡힘. 더 정밀하면 `MutationObserver` 사용.
- **첫 진입 직후 데이터 로드 늦으면** target 요소가 아직 없을 수 있음 →
  `setRect(null)` 일 때 검은 overlay 만 보여주고 발견되면 자연 전환.
- **사용자가 가운데 step 에서 앱 종료** → 다음 진입 시 처음부터. step 기억은
  하지 않음 (단순화).

## 7. 미정 / 사용자 결정 필요

- [ ] **Hard 모드 / Normal 모드 별 다른 문구?** (현재안: 동일 문구. step 1
  의 양심 설명만 같고, step 4 미션 설명은 mode 무관하게 일반)
- [ ] **튜토리얼에 일러스트 추가?** (현재안: 강조 영역 + 텍스트 말풍선만.
  새 일러스트 없이 기존 자산 그대로 사용)
- [ ] **카메라 인증·미션 픽 시연까지 자동?** (현재안: NO — 5스텝 다 본 후
  사용자가 자유 조작. 더 친절하게 하려면 step 4 다음에 "미션 모달 자동
  열어서 픽 시연" 추가 가능 — 복잡도 +1h)
