// 코치마크 튜토리얼 — 실제 UI 위에 반투명 overlay + 강조 영역 cut-out + 말풍선.
//
// 사용 방법:
//   1) 강조할 element 에 data-tutorial="<key>" 어트리뷰트 부착
//   2) <TutorialOverlay steps={[{ targetSelector, text, placement }, ...]} onFinish={...} />
//
// 진행 중 사용자는 "다음" 버튼 외 다른 클릭이 모두 흡수됨 (overlay 가 받아 무시).
// 브라우저 뒤로가기도 차단.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface TutorialStep {
  /** 강조할 element 의 querySelector — 보통 [data-tutorial="..."] */
  targetSelector: string;
  /** 말풍선 본문 */
  text: string;
  /** 강조 영역 기준 말풍선 위치. 기본 'bottom'. */
  placement?: 'top' | 'bottom';
  /** 강조 영역 둘레 padding (px). 기본 8. */
  pad?: number;
  /** 강조 영역 모서리 둥글기 (px). 기본 12. */
  radius?: number;
}

interface Props {
  steps: TutorialStep[];
  onFinish: () => void;
}

export function TutorialOverlay({ steps, onFinish }: Props) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const finishedRef = useRef(false);
  const step = steps[idx];

  // 강조 element 위치 추적 — resize / scroll / 애니메이션 대응. 200ms 폴링.
  useLayoutEffect(() => {
    if (!step) return;
    function measure() {
      const el = document.querySelector(step.targetSelector);
      if (!el) {
        setRect(null);
        return;
      }
      // viewport 밖이면 스크롤로 끌어옴
      const r = el.getBoundingClientRect();
      const out = r.bottom < 0 || r.top > window.innerHeight;
      if (out) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      setRect(el.getBoundingClientRect());
    }
    measure();
    const interval = window.setInterval(measure, 200);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step]);

  // 브라우저 뒤로가기 차단 — 튜토리얼 진행 중 popstate 발생하면 다시 push.
  // 정상 종료(onFinish 호출) 후엔 listener 해제되므로 이후엔 자유 이동 가능.
  useEffect(() => {
    function onPop() {
      if (finishedRef.current) return;
      window.history.pushState(null, '', window.location.pathname);
    }
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function finish() {
    finishedRef.current = true;
    onFinish();
  }

  function next() {
    if (idx + 1 >= steps.length) finish();
    else setIdx(idx + 1);
  }

  if (!step) return null;

  const pad = step.pad ?? 8;
  const radius = step.radius ?? 12;

  // rect 측정 전 — 전체 어두운 화면만 노출 (잠깐)
  if (!rect) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/65 grid place-items-center px-7"
           onClick={(e) => e.stopPropagation()}>
        <p className="text-white/80 text-[13px]">튜토리얼 준비 중…</p>
      </div>
    );
  }

  // 강조 영역 (overlay 좌표계 = viewport)
  const hx = rect.left - pad;
  const hy = rect.top - pad;
  const hw = rect.width + pad * 2;
  const hh = rect.height + pad * 2;

  // 말풍선 위치 — 강조 영역 위 또는 아래
  const placement = step.placement ?? (rect.top > window.innerHeight / 2 ? 'top' : 'bottom');
  const tooltipStyle: React.CSSProperties =
    placement === 'top'
      ? { left: 12, right: 12, bottom: window.innerHeight - hy + 12 }
      : { left: 12, right: 12, top: hy + hh + 12 };

  return (
    <div
      className="fixed inset-0 z-[100]"
      // overlay 자체가 모든 클릭 흡수 — 강조 영역도 클릭 안 됨.
      // 안에 있는 "다음" 버튼만 stopPropagation 으로 동작.
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* SVG mask 로 cut-out — 화면 어둡게, 강조 영역만 투명 */}
      <svg className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <mask id="tutorial-cutout">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={hx} y={hy} width={hw} height={hh} rx={radius} fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%" height="100%" fill="rgba(0,0,0,0.65)"
          mask="url(#tutorial-cutout)"
        />
      </svg>

      {/* 강조 영역 둘레 amber ring */}
      <div
        aria-hidden
        className="absolute pointer-events-none ring-4 ring-amber-300/85 rounded-xl"
        style={{ left: hx, top: hy, width: hw, height: hh, borderRadius: radius }}
      />

      {/* 말풍선 */}
      <div
        role="dialog"
        aria-live="polite"
        className="absolute bg-bg rounded-2xl shadow-2xl p-4 max-w-[320px] mx-auto"
        style={tooltipStyle}
      >
        <p className="text-[14px] text-text leading-relaxed">{step.text}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-text/55 tabular-nums">
            {idx + 1} / {steps.length}
          </span>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={finish}
              className="text-[12px] text-text/55 px-2 py-1"
            >건너뛰기</button>
            <button
              type="button"
              onClick={next}
              className="bg-accent text-white font-bold px-4 py-1.5 rounded-full text-[13px] active:scale-[.98]"
            >
              {idx + 1 >= steps.length ? '시작하기' : '다음'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
