// 짧은 피드백 사운드 + 진동.
// Settings의 sound/vibration 토글이 ON일 때 다른 컴포넌트에서 호출.
//
// SFX는 외부 mp3 없이 WebAudio로 짧은 비프 생성 (300Hz~880Hz, 60ms).

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const W = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = W.AudioContext ?? W.webkitAudioContext;
  if (!Ctor) return null;
  try {
    audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

function beep(freq: number, durationMs: number, gain = 0.05) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // ignore
  }
}

export function playClickSfx() {
  beep(880, 40, 0.10);
}

/** 상점 구매 — 동전 떨어지는 듯한 ka-ching */
export function playPurchaseSfx() {
  beep(1175, 70, 0.18);                     // D6
  setTimeout(() => beep(1568, 90, 0.20), 80); // G6 — 상승 톤
  setTimeout(() => beep(2093, 140, 0.14), 180); // C7 — 마무리 반짝
}

export function playSuccessSfx() {
  // 도-미-솔 짧은 상승
  beep(523, 80);
  setTimeout(() => beep(659, 80), 90);
  setTimeout(() => beep(784, 120), 180);
}

export function playLoseSfx() {
  // 한 음 떨어지는 톤
  beep(440, 90);
  setTimeout(() => beep(330, 120), 100);
}

export function playHitSfx() {
  // 펀치 — 짧고 강한 저음 임팩트 (gain 0.05 → 0.22 로 약 4배 큼)
  beep(220, 60, 0.22);
  setTimeout(() => beep(140, 80, 0.18), 30);
}

export function vibrate(durationMs: number | number[]) {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    navigator.vibrate(durationMs);
  } catch {
    // ignore
  }
}
