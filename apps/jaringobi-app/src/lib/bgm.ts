// 절차 생성 BGM — 3가지 스타일 중 사용자가 선택.
// Settings sound 토글 OFF면 자동 정지. 첫 사용자 클릭 후에만 시작 (브라우저 autoplay 정책).
//
// 사용:
//   const bgm = getBgm();
//   bgm.setStyle('cheerful');  // 'default' | 'cheerful' | 'retro8'
//   bgm.start();
//   bgm.stop();
//   bgm.setVolumePercent(100);

// AudioContext 는 lib/audio.ts 의 공유 인스턴스 사용 — SFX 와 동일 컨텍스트
import { getAudioContext } from './audio';

function getCtx(): AudioContext | null {
  return getAudioContext();
}

export type BgmStyle = 'default' | 'cheerful' | 'retro8';

function midiToHz(m: number) { return 440 * Math.pow(2, (m - 69) / 12); }

// ─────────────────────────────────────────────────────────────
// 스타일 정의 — 각 스타일은 BPM, 마디 길이, 매 step 마다 어떤 노트/노이즈를 재생할지 결정.
// ─────────────────────────────────────────────────────────────

interface StyleDef {
  bpm: number;
  totalSteps: number;
  /** 0..totalSteps-1 인 step 에 대해 재생할 이벤트들을 반환 */
  schedule: (step: number) => Array<NoteEv | NoiseEv>;
}

interface NoteEv {
  kind: 'note';
  midi: number;
  dur: number;
  type: OscillatorType;
  gain: number;
  detuneCents?: number;
}
interface NoiseEv {
  kind: 'noise';
  dur: number;
  gain: number;
  hp?: number;
}

// 차분(꼬질꼬질) — 기존 스타일: C 마이너 펜타토닉 + 살짝 detune + 비정형 비트
const DEFAULT_PENTA = [0, 3, 5, 7, 10];
const DEFAULT_ROOT = 60; // C4

const DEFAULT_STYLE: StyleDef = {
  bpm: 92,
  totalSteps: 32,
  schedule: (step) => {
    const s = step % 32;
    const out: Array<NoteEv | NoiseEv> = [];
    if (s % 16 === 0) out.push({ kind: 'note', midi: DEFAULT_ROOT - 24, dur: 0.45, type: 'triangle', gain: 0.95, detuneCents: 8 });
    if (s === 8 || s === 24) out.push({ kind: 'note', midi: DEFAULT_ROOT - 17, dur: 0.35, type: 'triangle', gain: 0.78, detuneCents: 8 });
    if (s % 8 === 4) out.push({ kind: 'noise', dur: 0.04, gain: 0.54, hp: 4000 });
    if (s % 4 === 0) {
      const idx = (Math.floor(s / 4) + (Math.random() < 0.4 ? 1 : 0)) % DEFAULT_PENTA.length;
      const oct = Math.random() < 0.25 ? 12 : 0;
      out.push({ kind: 'note', midi: DEFAULT_ROOT + DEFAULT_PENTA[idx] + oct, dur: 0.18, type: 'square', gain: 0.48, detuneCents: 8 });
    }
    if (Math.random() < 0.05) {
      const idx = Math.floor(Math.random() * DEFAULT_PENTA.length);
      out.push({ kind: 'note', midi: DEFAULT_ROOT + DEFAULT_PENTA[idx] + 12, dur: 0.09, type: 'square', gain: 0.24, detuneCents: 8 });
    }
    return out;
  },
};

// 밝은 동요풍 — C 메이저 + sine 부드러운 음색 + 4마디 친근한 멜로디.
// 어린이 노래 느낌으로 detune 거의 없고, 같은 멜로디가 반복되며 정겨움.
// 멜로디 노트 시퀀스 (MIDI offset from C4): "솔미미 파레레 도레미파솔솔솔" 같은 단순 진행.
const CHEERFUL_ROOT = 60; // C4
const CHEERFUL_MELODY: number[] = [
  // 1마디 (16스텝, 매 2스텝마다 한 음 = 8음)
  7, 4, 4, -1, 5, 2, 2, -1,
  // 2마디
  0, 2, 4, 5, 7, 7, 7, -1,
  // 3마디
  9, 7, 5, 4, 2, 4, 5, -1,
  // 4마디
  7, 4, 5, 2, 0, 0, -1, -1,
];

const CHEERFUL_STYLE: StyleDef = {
  bpm: 110,
  totalSteps: 64, // 4마디 × 16스텝
  schedule: (step) => {
    const s = step % 64;
    const out: Array<NoteEv | NoiseEv> = [];
    // 베이스 — 매 4스텝(=8분음표) 마다 C 또는 G 도약 (C-G-C-G 패턴)
    // 게인 거듭 상향 + 옥타브 위 보강 + triangle 레이어를 함께 섞어
    // perceived loudness 를 추가로 올림. triangle 은 sine 보다 배음이 풍부해
    // 같은 RMS 대비 라우드니스가 더 크게 들림.
    if (s % 8 === 0) {
      const baseMidi = (s % 16 === 0) ? CHEERFUL_ROOT - 12 : CHEERFUL_ROOT - 5;
      out.push({ kind: 'note', midi: baseMidi, dur: 0.4, type: 'sine', gain: 2.0 });
      out.push({ kind: 'note', midi: baseMidi + 12, dur: 0.4, type: 'sine', gain: 0.9 });
      // triangle 레이어 — 배음 추가로 라우드니스 ↑ (음색은 부드럽게 유지)
      out.push({ kind: 'note', midi: baseMidi, dur: 0.4, type: 'triangle', gain: 0.55 });
    }
    // 멜로디 — 매 2스텝마다 1음 (총 32음 / 4마디)
    if (s % 2 === 0) {
      const idx = Math.floor(s / 2);
      const off = CHEERFUL_MELODY[idx];
      if (off >= 0) {
        out.push({ kind: 'note', midi: CHEERFUL_ROOT + off, dur: 0.24, type: 'sine', gain: 2.3 });
        out.push({ kind: 'note', midi: CHEERFUL_ROOT + off + 12, dur: 0.24, type: 'sine', gain: 1.2 });
        // triangle 레이어 — sine 만으론 부족한 배음 채워 라우드니스 추가 상향
        out.push({ kind: 'note', midi: CHEERFUL_ROOT + off, dur: 0.24, type: 'triangle', gain: 0.85 });
        // 5도 화음 — 동요 느낌 더 풍성하게
        out.push({ kind: 'note', midi: CHEERFUL_ROOT + off + 7, dur: 0.24, type: 'sine', gain: 0.85 });
      }
    }
    return out;
  },
};

// 8비트 레트로 — NES 칩튠 풍. square 만 사용, 빠른 BPM, 베이스 + 멜로디 + 아르페지오 + 하이햇 노이즈.
// C 메이저 키 (C, E, G 트라이어드 기반).
const RETRO_ROOT = 60;
// 16스텝 멜로디 (8분음표 단위) — 게임 BGM 처럼 통통 튀는 진행
const RETRO_MELODY: number[] = [
  0, 4, 7, 12, 7, 4, 7, 12,
  2, 5, 9, 14, 9, 5, 9, 14,
];
// 같은 길이의 베이스라인 (4분음표 단위로 동작 — 매 4스텝)
const RETRO_BASS: number[] = [0, 7, 0, 7, 2, 9, 2, 9]; // root–5도 진행

const RETRO_STYLE: StyleDef = {
  bpm: 132,
  totalSteps: 32, // 2마디
  schedule: (step) => {
    const s = step % 32;
    const out: Array<NoteEv | NoiseEv> = [];
    // 베이스 — 매 4스텝
    if (s % 4 === 0) {
      const idx = (s / 4) % RETRO_BASS.length;
      out.push({ kind: 'note', midi: RETRO_ROOT - 24 + RETRO_BASS[idx], dur: 0.28, type: 'square', gain: 0.65 });
    }
    // 멜로디 — 매 2스텝 (16분음표 2개씩 = 8분음표)
    if (s % 2 === 0) {
      const idx = (s / 2) % RETRO_MELODY.length;
      out.push({ kind: 'note', midi: RETRO_ROOT + RETRO_MELODY[idx], dur: 0.14, type: 'square', gain: 0.5 });
    }
    // 아르페지오 — 매 step 마다 1번 (16분 빠른 화음)
    {
      const arp = [0, 4, 7, 12];
      const idx = s % arp.length;
      out.push({ kind: 'note', midi: RETRO_ROOT + 12 + arp[idx], dur: 0.06, type: 'square', gain: 0.18 });
    }
    // 하이햇 노이즈 — 매 4스텝에서 +2 위치 (off-beat)
    if (s % 4 === 2) out.push({ kind: 'noise', dur: 0.05, gain: 0.4, hp: 5000 });
    // 킥 비슷한 저음 노이즈 — 매 8스텝
    if (s % 8 === 0) out.push({ kind: 'noise', dur: 0.06, gain: 0.7, hp: 100 });
    return out;
  },
};

const STYLES: Record<BgmStyle, StyleDef> = {
  default: DEFAULT_STYLE,
  cheerful: CHEERFUL_STYLE,
  retro8: RETRO_STYLE,
};

class Bgm {
  private master: GainNode | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private playing = false;
  private style: BgmStyle = 'default';
  // 0~100 사용자 볼륨을 audio gain 으로 매핑.
  // 안드로이드 WebView 출력이 데스크톱 대비 매우 작아 마스터 상한을 3.5 까지 올림.
  // Web Audio 는 gain > 1 도 허용 (destination 에서만 ±1 클립). 스타일별 노트 gain 이
  // 0.18~0.95 라 단일 활성 시 0.95*3.5=3.3 까지. 다성 합산 시 약간의 소프트 클리핑 발생할 수 있으나
  // 사용자가 들리지 않는다는 피드백이 더 큰 문제라 상한 유지.
  private targetVolume = 2.0;

  isPlaying() { return this.playing; }
  getStyle() { return this.style; }

  /** 스타일 변경 — 재생 중이면 step 만 리셋하고 동일 master 위에서 새 스타일 schedule 사용 */
  setStyle(style: BgmStyle) {
    if (this.style === style) return;
    this.style = style;
    this.step = 0;
    if (this.playing && this.timerId) {
      clearInterval(this.timerId);
      this.timerId = setInterval(() => this.tick(), this.stepMs());
    }
  }

  private stepMs() {
    const s = STYLES[this.style];
    return (60 / s.bpm / 4) * 1000;
  }

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
    this.timerId = setInterval(() => this.tick(), this.stepMs());
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

  /** 0~100 슬라이더 값을 받아 audio gain 으로 매핑 (0 → 무음, 100 → 3.5).
   *  안드로이드 WebView 가 데스크톱 대비 출력이 작아 상한 3.5 까지 올림. */
  setVolumePercent(percent: number) {
    const clamped = Math.max(0, Math.min(100, percent));
    this.targetVolume = (clamped / 100) * 3.5;
    const ctx = getCtx();
    if (ctx && this.master && this.playing) {
      this.master.gain.cancelScheduledValues(ctx.currentTime);
      this.master.gain.linearRampToValueAtTime(this.targetVolume, ctx.currentTime + 0.2);
    }
  }

  private tick() {
    const ctx = getCtx();
    if (!ctx || !this.master) return;
    const def = STYLES[this.style];
    const evs = def.schedule(this.step);
    for (const ev of evs) {
      if (ev.kind === 'note') this.note(ev.midi, ev.dur, ev.type, ev.gain, ev.detuneCents ?? 0);
      else this.noise(ev.dur, ev.gain, ev.hp ?? 4000);
    }
    this.step = (this.step + 1) % def.totalSteps;
  }

  private note(midi: number, duration: number, type: OscillatorType, gain: number, detuneCents: number) {
    const ctx = getCtx();
    if (!ctx || !this.master) return;
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = midiToHz(midi);
      // detune cents — 0 이면 정확한 음정, 양수면 ±cents 만큼 흔들림
      if (detuneCents > 0) osc.detune.value = (Math.random() - 0.5) * 2 * detuneCents;
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(g).connect(this.master);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    } catch { /* ignore */ }
  }

  private noise(duration: number, gain: number, hpFreq: number) {
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
      filter.frequency.value = hpFreq;
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
