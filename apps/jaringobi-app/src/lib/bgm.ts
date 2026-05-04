// 절차 생성 BGM — '꼬질꼬질 뚱땅뚱땅' 분위기
// C 마이너 펜타토닉 + 살짝 디튠 + 비정형 stumble 비트
// Settings sound 토글 OFF면 자동 정지. 첫 사용자 클릭 후에만 시작 (브라우저 autoplay 정책).
//
// 사용:
//   const bgm = getBgm();
//   bgm.start();   // 사운드 토글 ON 인 사용자가 페이지에 머물 때
//   bgm.stop();    // 페이지 이탈 시
//   bgm.setVolume(0.05);

let audioCtx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const W = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = W.AudioContext ?? W.webkitAudioContext;
  if (!Ctor) return null;
  try { audioCtx = new Ctor(); return audioCtx; } catch { return null; }
}

// C 마이너 펜타토닉 (꼬질꼬질 어울리는 5음계)
const PENTA = [0, 3, 5, 7, 10];
const ROOT = 60; // C4 (MIDI)

const BPM = 92;
const STEP_MS = (60 / BPM / 4) * 1000; // 16분음표
const TOTAL_STEPS = 32; // 2마디 루프

function midiToHz(m: number) { return 440 * Math.pow(2, (m - 69) / 12); }

class Bgm {
  private master: GainNode | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private playing = false;
  private targetVolume = 0.045;

  isPlaying() { return this.playing; }

  start() {
    if (this.playing) return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = this.targetVolume;
      this.master.connect(ctx.destination);
    } else {
      // 기존 마스터 페이드인
      this.master.gain.cancelScheduledValues(ctx.currentTime);
      this.master.gain.setValueAtTime(0, ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(this.targetVolume, ctx.currentTime + 0.6);
    }
    this.playing = true;
    this.step = 0;
    this.timerId = setInterval(() => this.tick(), STEP_MS);
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
    const ctx = getCtx();
    if (ctx && this.master) {
      const t = ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
      this.master.gain.linearRampToValueAtTime(0, t + 0.3);
    }
  }

  setVolume(v: number) {
    this.targetVolume = Math.max(0, Math.min(0.2, v));
    const ctx = getCtx();
    if (ctx && this.master && this.playing) {
      this.master.gain.cancelScheduledValues(ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(this.targetVolume, ctx.currentTime + 0.2);
    }
  }

  private tick() {
    const ctx = getCtx();
    if (!ctx || !this.master) return;
    const s = this.step % TOTAL_STEPS;

    // 베이스 — 1, 3박 (16스텝 단위, 즉 step 0/16/8 위주)
    if (s % 16 === 0) this.note(ROOT - 24, 0.45, 'triangle', 0.32);   // C2
    if (s === 8 || s === 24) this.note(ROOT - 17, 0.35, 'triangle', 0.26); // G2

    // 하이햇 비슷한 노이즈 — 2, 4박
    if (s % 8 === 4) this.noise(0.04, 0.18);

    // 멜로디 — 4스텝마다 펜타토닉 무작위 (꼬질꼬질 stumble)
    if (s % 4 === 0) {
      const idx = (Math.floor(s / 4) + (Math.random() < 0.4 ? 1 : 0)) % PENTA.length;
      const oct = Math.random() < 0.25 ? 12 : 0;
      this.note(ROOT + PENTA[idx] + oct, 0.18, 'square', 0.16);
    }

    // 가끔 비뚤거리는 추가 음 (15% 확률)
    if (Math.random() < 0.12) {
      const idx = Math.floor(Math.random() * PENTA.length);
      this.note(ROOT + PENTA[idx] + 12, 0.09, 'square', 0.10);
    }

    this.step++;
  }

  private note(midi: number, duration: number, type: OscillatorType, gain: number) {
    const ctx = getCtx();
    if (!ctx || !this.master) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = midiToHz(midi);
      // 꼬질꼬질 — 살짝 음정 흔들림 (±15 cent)
      osc.detune.value = (Math.random() - 0.5) * 30;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch { /* ignore */ }
  }

  private noise(duration: number, gain: number) {
    const ctx = getCtx();
    if (!ctx || !this.master) return;
    try {
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 4000;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      src.connect(filter).connect(g).connect(this.master);
      src.start(t);
      src.stop(t + duration);
    } catch { /* ignore */ }
  }
}

let instance: Bgm | null = null;
export function getBgm(): Bgm {
  if (!instance) instance = new Bgm();
  return instance;
}
