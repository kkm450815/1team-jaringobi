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

/** 사용자 인터랙션 직후 호출해 정지 상태인 AudioContext 를 resume.
 *  iOS Safari 등에서는 resume 만으로 부족할 수 있어 짧은 무음 oscillator
 *  를 한 번 재생해 audio thread 를 확실히 깨운다. */
export function unlockAudio() {
  const c = getAudioContext();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  try {
    const osc = c.createOscillator();
    const g = c.createGain();
    g.gain.value = 0.0001; // 거의 무음
    osc.connect(g).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.04);
  } catch { /* ignore */ }
}
