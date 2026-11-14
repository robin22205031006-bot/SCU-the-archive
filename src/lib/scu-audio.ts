/**
 * SCU SFX engine — all sounds are synthesized with the Web Audio API.
 * No audio assets, no network fetches, sub-5ms latency, tiny CPU cost.
 * Every public sound checks the global mute flag (localStorage "scu-muted")
 * before touching the AudioContext, so playback is always silent when muted.
 */

const MUTE_KEY = "scu-muted";
const MUTE_EVENT = "scu-mute-change";

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* storage unavailable — mute simply won't persist */
  }
  window.dispatchEvent(new Event(MUTE_EVENT));
}

export function onMuteChange(handler: () => void): () => void {
  window.addEventListener(MUTE_EVENT, handler);
  return () => window.removeEventListener(MUTE_EVENT, handler);
}

let ctx: AudioContext | null = null;
const noiseBufferCache = new Map<number, AudioBuffer>();
const decodedAudioCache = new Map<string, AudioBuffer>();
const decodingPromises = new Map<string, Promise<AudioBuffer | null>>();

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx && ctx.state === "closed") {
    ctx = null;
    noiseBufferCache.clear();
    decodedAudioCache.clear();
  }
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume?.().catch(() => {});
  return ctx;
}

function getOrCreateNoiseBuffer(c: AudioContext, dur: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const existing = noiseBufferCache.get(len);
  if (existing) return existing;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  noiseBufferCache.set(len, buf);
  return buf;
}

interface ToneOpts {
  freq: number;
  freqEnd?: number;
  type?: OscillatorType;
  dur?: number;
  vol?: number;
  delay?: number;
  attack?: number;
}

function tone({
  freq,
  freqEnd,
  type = "sine",
  dur = 0.08,
  vol = 0.08,
  delay = 0,
  attack = 0.004,
}: ToneOpts): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

interface NoiseOpts {
  dur?: number;
  vol?: number;
  freq?: number;
  q?: number;
  delay?: number;
  type?: BiquadFilterType;
}

function noise({
  dur = 0.06,
  vol = 0.05,
  freq = 3000,
  q = 1,
  delay = 0,
  type = "bandpass",
}: NoiseOpts): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = getOrCreateNoiseBuffer(c, dur);
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

function ready(fn: () => void): void {
  if (isMuted()) return;
  try {
    fn();
  } catch {
    /* audio must never break the UI */
  }
}

// ---- Admin-uploaded audio files (data URLs persisted in app_settings) ----
let audioFiles: Record<string, string> = {};
let ambientFileAudio: HTMLAudioElement | null = null;

function dataUrlToArrayBuffer(url: string): ArrayBuffer | null {
  const comma = url.indexOf(",");
  if (comma === -1) return null;
  const meta = url.slice(0, comma);
  const body = url.slice(comma + 1);
  if (!meta.includes(";base64")) return null;
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function decodeUrlIntoCache(key: string, url: string): Promise<AudioBuffer | null> {
  const existing = decodedAudioCache.get(key) ?? decodedAudioCache.get(url);
  if (existing) {
    decodedAudioCache.set(key, existing);
    return existing;
  }
  const inFlight = decodingPromises.get(url);
  if (inFlight) {
    const buf = await inFlight;
    if (buf) decodedAudioCache.set(key, buf);
    return buf;
  }
  const c = ac();
  if (!c || typeof c.decodeAudioData !== "function") return null;

  const task = (async (): Promise<AudioBuffer | null> => {
    try {
      let raw: ArrayBuffer | null = null;
      if (url.startsWith("data:")) {
        raw = dataUrlToArrayBuffer(url);
      } else if (typeof fetch === "function") {
        const res = await fetch(url);
        if (!res.ok) return null;
        raw = await res.arrayBuffer();
      }
      if (!raw) return null;
      const decoded = await c.decodeAudioData(raw);
      decodedAudioCache.set(url, decoded);
      decodedAudioCache.set(key, decoded);
      return decoded;
    } catch {
      return null;
    } finally {
      decodingPromises.delete(url);
    }
  })();

  decodingPromises.set(url, task);
  return task;
}

const CORE_NOISE_DURATIONS = [
  0.014, 0.015, 0.02, 0.022, 0.028, 0.038, 0.045, 0.068, 0.085, 0.09, 0.16, 0.22,
] as const;

export interface AudioPreloadResult {
  initialized: boolean;
  warmedNoiseCount: number;
  decodedCount: number;
}

/** Pre-warms synthesized PCM noise buffers and decodes custom/external audio buffers at startup. */
export async function preloadAudioBuffers(
  extraSources?: Record<string, string>,
): Promise<AudioPreloadResult> {
  const c = ac();
  if (!c) {
    return { initialized: false, warmedNoiseCount: 0, decodedCount: 0 };
  }

  let warmedNoiseCount = 0;
  try {
    for (const dur of CORE_NOISE_DURATIONS) {
      getOrCreateNoiseBuffer(c, dur);
      warmedNoiseCount++;
    }
  } catch {
    /* ignore buffer allocation issues on restricted environments */
  }

  const combined: Record<string, string> = { ...audioFiles, ...(extraSources ?? {}) };
  const entries = Object.entries(combined).filter(([, url]) => Boolean(url));
  const results = await Promise.all(entries.map(([key, url]) => decodeUrlIntoCache(key, url)));
  const decodedCount = results.filter(Boolean).length;

  return { initialized: true, warmedNoiseCount, decodedCount };
}

export function getDecodedAudioBuffer(keyOrUrl: string): AudioBuffer | undefined {
  return decodedAudioCache.get(keyOrUrl);
}

export function resumeAudioContext(): void {
  try {
    const c = ac();
    if (c && c.state === "suspended") {
      void c.resume?.().catch(() => {});
    }
  } catch {
    /* audio resume must never throw */
  }
}

export function resetAudioBufferCache(): void {
  noiseBufferCache.clear();
  decodedAudioCache.clear();
  decodingPromises.clear();
}

export function setAudioFiles(map: Record<string, string> | null | undefined) {
  audioFiles = map ?? {};
  if (ambientFileAudio && !audioFiles["ambient"]) {
    ambientFileAudio.pause();
    ambientFileAudio = null;
  }
  if (Object.keys(audioFiles).length > 0) {
    void preloadAudioBuffers(audioFiles);
  }
}

/** Play an uploaded file by key ("welcome", "ambient", "sfx:click", …). Returns true if played. */
export function playAudioFile(key: string, loop = false): boolean {
  const url = audioFiles[key];
  if (!url || isMuted()) return false;
  if (!loop) {
    const c = ac();
    const cached = decodedAudioCache.get(key) ?? decodedAudioCache.get(url);
    if (c && cached) {
      try {
        const src = c.createBufferSource();
        src.buffer = cached;
        const gain = c.createGain();
        gain.gain.value = 0.8;
        src.connect(gain).connect(c.destination);
        src.start(0);
        return true;
      } catch {
        /* fall back to HTMLAudioElement */
      }
    }
  }
  try {
    const a = new Audio(url);
    a.loop = loop;
    a.volume = 0.8;
    void a.play().catch(() => {});
    return true;
  } catch {
    return false;
  }
}

/** Post-login welcome track — uploaded file wins, else synthesized boot tone. */
export function playWelcome() {
  if (playAudioFile("welcome")) return;
  sfx.welcome();
}

/** SFX override check — call at the top of each synth preset. */
function fileOverride(key: string): boolean {
  return playAudioFile(`sfx:${key}`);
}

// ---- Ambient drone (low-pitch background atmosphere) ----
let ambientNodes: { osc: OscillatorNode; gain: GainNode }[] | null = null;

export function ambientPlaying(): boolean {
  return ambientNodes !== null || ambientFileAudio !== null;
}

export function ambientStart() {
  if (ambientNodes || ambientFileAudio || isMuted()) return;
  if (audioFiles["ambient"]) {
    try {
      ambientFileAudio = new Audio(audioFiles["ambient"]);
      ambientFileAudio.loop = true;
      ambientFileAudio.volume = 0.5;
      void ambientFileAudio.play().catch(() => {
        ambientFileAudio = null;
      });
      return;
    } catch {
      /* fall through to synth */
    }
  }
  const c = ac();
  if (!c) return;
  try {
    const mk = (freq: number, type: OscillatorType, vol: number) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(vol, c.currentTime + 2.5);
      osc.connect(gain).connect(c.destination);
      osc.start();
      return { osc, gain };
    };
    ambientNodes = [mk(55, "sine", 0.035), mk(82.4, "sine", 0.022), mk(110, "triangle", 0.012)];
    // Slow breathing LFO on the master-ish gain.
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain);
    for (const n of ambientNodes) lfoGain.connect(n.gain.gain);
    lfo.start();
    ambientNodes.push({ osc: lfo, gain: lfoGain });
  } catch {
    ambientNodes = null;
  }
}

export function ambientStop() {
  if (ambientFileAudio) {
    ambientFileAudio.pause();
    ambientFileAudio = null;
  }
  if (!ambientNodes) return;
  const c = ctx;
  for (const n of ambientNodes) {
    try {
      n.gain.gain.linearRampToValueAtTime(0, (c?.currentTime ?? 0) + 0.8);
      n.osc.stop((c?.currentTime ?? 0) + 1);
    } catch {
      /* already stopped */
    }
  }
  ambientNodes = null;
}

export const sfx = {
  /** Subtle tactical tick for buttons, tabs, and generic presses. */
  click() {
    if (fileOverride("click")) return;
    ready(() => {
      tone({ freq: 1900, freqEnd: 1400, type: "square", dur: 0.025, vol: 0.025 });
      noise({ dur: 0.015, vol: 0.012, freq: 5000, q: 2 });
    });
  },

  /** Rising confirmation blip for creates/adds. */
  add() {
    if (fileOverride("add")) return;
    ready(() => {
      tone({ freq: 520, freqEnd: 880, type: "triangle", dur: 0.09, vol: 0.06 });
      tone({ freq: 1040, freqEnd: 1560, type: "sine", dur: 0.1, vol: 0.045, delay: 0.06 });
    });
  },

  /** Descending tech hum for deletes/removals. */
  remove() {
    if (fileOverride("remove")) return;
    ready(() => {
      tone({ freq: 220, freqEnd: 70, type: "sawtooth", dur: 0.22, vol: 0.045 });
      noise({ dur: 0.12, vol: 0.03, freq: 900, q: 0.8, type: "lowpass" });
    });
  },

  /** Layered digital convergence for entity merges. */
  merge() {
    if (fileOverride("merge")) return;
    ready(() => {
      tone({ freq: 300, freqEnd: 1200, type: "sine", dur: 0.28, vol: 0.05 });
      tone({ freq: 450, freqEnd: 1800, type: "triangle", dur: 0.24, vol: 0.035, delay: 0.05 });
      tone({ freq: 900, freqEnd: 300, type: "sine", dur: 0.3, vol: 0.04, delay: 0.12 });
      noise({ dur: 0.2, vol: 0.02, freq: 2400, q: 3, delay: 0.08 });
    });
  },

  /** Air-sweep whoosh for card swipes, drawer opens and transitions. */
  whoosh() {
    if (fileOverride("whoosh")) return;
    ready(() => {
      noise({ dur: 0.22, vol: 0.05, freq: 1200, q: 0.7, type: "bandpass" });
      noise({ dur: 0.16, vol: 0.03, freq: 2600, q: 1.4, delay: 0.03 });
      tone({ freq: 300, freqEnd: 90, type: "sine", dur: 0.2, vol: 0.03 });
    });
  },

  /** Celestial harp-ish chime for Angle (Angel) tier reveals. */
  angel() {
    if (fileOverride("angel")) return;
    ready(() => {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ freq: f, type: "sine", dur: 0.7, vol: 0.04, delay: i * 0.07, attack: 0.01 }),
      );
      tone({ freq: 1568, type: "triangle", dur: 0.5, vol: 0.02, delay: 0.3, attack: 0.01 });
    });
  },

  /** Deep crimson energy pulse for Mythic tier reveals. */
  mythic() {
    if (fileOverride("mythic")) return;
    ready(() => {
      tone({ freq: 55, freqEnd: 38, type: "sawtooth", dur: 0.7, vol: 0.06, attack: 0.02 });
      tone({ freq: 110, freqEnd: 55, type: "square", dur: 0.5, vol: 0.035, delay: 0.05 });
      noise({ dur: 0.4, vol: 0.04, freq: 220, q: 0.6, type: "lowpass", delay: 0.02 });
      tone({ freq: 880, freqEnd: 220, type: "sine", dur: 0.35, vol: 0.03, delay: 0.1 });
    });
  },

  /** Futuristic HUD blip for Legendary/Guardian/Heroic and generic UI pops. */
  hud() {
    if (fileOverride("hud")) return;
    ready(() => {
      tone({ freq: 1400, freqEnd: 2100, type: "square", dur: 0.05, vol: 0.03 });
      tone({ freq: 700, type: "sine", dur: 0.08, vol: 0.025, delay: 0.04 });
    });
  },

  /** Comic ink swipe — papery noise burst with a falling pitch chirp (Mode C). */
  comic() {
    if (fileOverride("comic")) return;
    ready(() => {
      noise({ dur: 0.09, vol: 0.05, freq: 1800, q: 0.8, type: "highpass" });
      tone({ freq: 900, freqEnd: 300, type: "sawtooth", dur: 0.1, vol: 0.03 });
    });
  },

  /** Soft acoustic pop for ability badge / rarity filter taps. */
  pop() {
    if (fileOverride("pop")) return;
    ready(() => {
      tone({ freq: 660, freqEnd: 990, type: "triangle", dur: 0.07, vol: 0.05 });
      noise({ dur: 0.03, vol: 0.02, freq: 4000, q: 2 });
    });
  },

  /** Play the SFX matching a character's tier. */
  tierReveal(tier: string | null | undefined) {
    switch ((tier ?? "").toLowerCase()) {
      case "mythic":
        return this.mythic();
      case "angle":
      case "angel":
        return this.angel();
      case "legendary":
      case "guardian":
      case "heroic":
        return this.hud();
      default:
        return this.whoosh();
    }
  },

  /** Tactile vintage parchment snap & warm wooden chime for Fantasy / Grimoire page & tab turns. */
  parchmentSnap() {
    if (fileOverride("parchment")) return;
    ready(() => {
      noise({ dur: 0.085, vol: 0.045, freq: 1650, q: 1.1, type: "bandpass" });
      noise({ dur: 0.045, vol: 0.03, freq: 3400, q: 1.8, delay: 0.025, type: "highpass" });
      tone({ freq: 290, freqEnd: 185, type: "triangle", dur: 0.065, vol: 0.04 });
      tone({ freq: 587.33, type: "sine", dur: 0.14, vol: 0.028, delay: 0.02, attack: 0.005 });
    });
  },

  /** Warm vellum & brass seal tap for Fantasy / Isekai / Ghibli button interactions. */
  parchmentClick() {
    if (fileOverride("parchment-click")) return;
    ready(() => {
      noise({ dur: 0.038, vol: 0.034, freq: 2200, q: 1.4, type: "bandpass" });
      tone({ freq: 380, freqEnd: 240, type: "triangle", dur: 0.04, vol: 0.036, attack: 0.002 });
      tone({ freq: 784, type: "sine", dur: 0.055, vol: 0.018, delay: 0.008, attack: 0.003 });
    });
  },

  /** Crisp precision terminal click for Nexus / Sci-Fi Anime UI telemetry. */
  terminalClick() {
    if (fileOverride("terminal")) return;
    ready(() => {
      tone({ freq: 2450, freqEnd: 1620, type: "square", dur: 0.022, vol: 0.024 });
      tone({ freq: 980, freqEnd: 1320, type: "sine", dur: 0.04, vol: 0.022, delay: 0.015 });
      noise({ dur: 0.014, vol: 0.012, freq: 6200, q: 2.4, type: "highpass" });
    });
  },

  /** Digital-sharp dual telemetry lock-in snap for Nexus HUD opens, tab changes & drawer locks. */
  terminalSnap() {
    if (fileOverride("terminal-snap")) return;
    ready(() => {
      tone({ freq: 2800, freqEnd: 1850, type: "square", dur: 0.024, vol: 0.026 });
      tone({ freq: 1480, freqEnd: 2240, type: "sine", dur: 0.05, vol: 0.028, delay: 0.018 });
      noise({ dur: 0.02, vol: 0.018, freq: 7200, q: 2.8, type: "highpass", delay: 0.01 });
    });
  },

  /** Crisp manga brush-stroke & heavy card paper snap for Shounen / Dark Fantasy navigation. */
  inkSnap() {
    if (fileOverride("ink-snap")) return;
    ready(() => {
      noise({ dur: 0.068, vol: 0.046, freq: 2100, q: 0.9, type: "highpass" });
      tone({ freq: 640, freqEnd: 260, type: "sawtooth", dur: 0.065, vol: 0.028 });
      tone({ freq: 180, freqEnd: 95, type: "triangle", dur: 0.05, vol: 0.032, delay: 0.012 });
    });
  },

  /** Focused dry-nib ink tap for Manga / Shounen / Dark Fantasy UI buttons. */
  inkClick() {
    if (fileOverride("ink-click")) return;
    ready(() => {
      noise({ dur: 0.022, vol: 0.028, freq: 3600, q: 1.6, type: "bandpass" });
      tone({ freq: 820, freqEnd: 460, type: "triangle", dur: 0.028, vol: 0.03 });
    });
  },

  /** Soft cinematic HUD boot tone — played once per session on first interaction. */
  welcome() {
    ready(() => {
      tone({ freq: 196, type: "sine", dur: 0.9, vol: 0.05, attack: 0.15 });
      tone({ freq: 294, type: "sine", dur: 0.9, vol: 0.04, attack: 0.2, delay: 0.08 });
      tone({ freq: 392, type: "triangle", dur: 0.7, vol: 0.025, attack: 0.25, delay: 0.16 });
      noise({ dur: 0.5, vol: 0.008, freq: 6000, q: 0.6, delay: 0.1, type: "highpass" });
    });
  },
};
