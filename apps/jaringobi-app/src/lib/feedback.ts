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

// 효과음 마스터 볼륨 (0~100). Settings의 sfxVolume 슬라이더로 제어.
// 기본 100 — 코드 작성된 gain 값 그대로 사용
let sfxVolumePercent = 100;
let sfxEnabled = true;
export function setSfxVolume(percent: number) {
  sfxVolumePercent = Math.max(0, Math.min(100, percent));
}
export function setSfxEnabled(enabled: boolean) {
  sfxEnabled = enabled;
}
function scaleGain(gain: number) {
  if (!sfxEnabled) return 0;
  return gain * (sfxVolumePercent / 100);
}

function beep(freq: number, durationMs: number, gain = 0.05) {
  const ctx = getCtx();
  if (!ctx) return;
  // 사용자 인터랙션 직후 호출인 경우 context 가 suspended 상태일 수 있음 — resume
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const finalGain = scaleGain(gain);
  if (finalGain <= 0) return;
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(finalGain, ctx.currentTime);
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

/** 메탈릭 짧은 임팩트 — 동전 부딪히는 sharp transient */
/** 메탈릭 ring — 고음 사인 두 개를 합성한 짧은 동전 부딪힘 톤
 * (필터드 노이즈는 일부 환경에서 거의 안 들려서 oscillator 합성으로 변경)
 */
function clink(durationMs: number, gain: number) {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const finalGain = scaleGain(gain);
  if (finalGain <= 0) return;
  try {
    const t = ctx.currentTime;
    const dur = durationMs / 1000;
    // 두 개의 고음 사인 (랜덤 디튠으로 매번 음정 살짝 다름 → 짤랑 느낌)
    const freqs = [3520, 5200];
    for (const f of freqs) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f + (Math.random() - 0.5) * 200;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(finalGain, t + 0.003); // 빠른 attack
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);   // 짧은 decay
      osc.connect(g).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
  } catch {
    // ignore
  }
}

/** 상점 구매 — 코인 짤랑 + ka-ching */
export function playPurchaseSfx() {
  // 짤랑 — 동전이 부딪히는 메탈릭 임팩트 + 살짝 다른 고음 벨 3개 (gain 상향)
  clink(80, 0.45);
  beep(2400, 140, 0.28);
  setTimeout(() => beep(2900, 130, 0.24), 60);
  setTimeout(() => beep(2200, 150, 0.22), 130);
  setTimeout(() => clink(50, 0.30), 90);
  // ka-ching 마무리 상승 톤
  setTimeout(() => beep(1568, 120, 0.30), 230); // G6
  setTimeout(() => beep(2093, 160, 0.26), 320); // C7
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
