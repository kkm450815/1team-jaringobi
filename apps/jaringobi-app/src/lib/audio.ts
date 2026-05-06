// 전역 공유 AudioContext — BGM 과 SFX 가 같은 컨텍스트를 사용해야
// 첫 사용자 인터랙션으로 한 번 unlock 되면 양쪽 모두 사용 가능.
// (각 모듈이 별도 AudioContext 를 만들면 한 쪽만 unlock 되어 다른 쪽 무음)

let ctx: AudioContext | null = null;

function getCtor(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  const W = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return W.AudioContext ?? W.webkitAudioContext;
}

export function getAudioContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = getCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/** 사용자 인터랙션 직후 호출해 정지 상태인 AudioContext 를 resume. */
export function unlockAudio() {
  const c = getAudioContext();
  if (c && c.state === 'suspended') {
    c.resume().catch(() => {});
  }
}
