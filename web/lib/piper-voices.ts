export type VoiceGender = "female" | "male";

export type PiperVoiceConfig = {
  id: string;
  label: string;
  desc: string;
  /** Filename stem under /piper-voices/ */
  fileStem: string;
};

export const PIPER_VOICES: Record<VoiceGender, PiperVoiceConfig> = {
  female: {
    id: "en_US-hfc_female-medium",
    label: "女老师 HFC",
    desc: "美式女声，清晰自然（Piper 本地模型）",
    fileStem: "en_US-hfc_female-medium",
  },
  male: {
    id: "en_US-ryan-medium",
    label: "男老师 Ryan",
    desc: "美式男声，标准清晰（Piper 本地模型）",
    fileStem: "en_US-ryan-medium",
  },
};

/** Default playback speed for kids (configurable on 我的). */
export const DEFAULT_SPEAK_RATE = 0.7;
export const SPEAK_RATE_MIN = 0.5;
export const SPEAK_RATE_MAX = 1;
export const SPEAK_RATE_STEP = 0.05;

const RATE_STORAGE_KEY = "wordcatch-speak-rate";

export function clampSpeakRate(rate: number): number {
  if (!Number.isFinite(rate)) return DEFAULT_SPEAK_RATE;
  const stepped = Math.round(rate / SPEAK_RATE_STEP) * SPEAK_RATE_STEP;
  const clamped = Math.min(SPEAK_RATE_MAX, Math.max(SPEAK_RATE_MIN, stepped));
  return Math.round(clamped * 100) / 100;
}

export function getSavedSpeakRate(): number {
  if (typeof window === "undefined") return DEFAULT_SPEAK_RATE;
  const raw = window.localStorage.getItem(RATE_STORAGE_KEY);
  if (raw == null || raw === "") return DEFAULT_SPEAK_RATE;
  return clampSpeakRate(Number(raw));
}

export function saveSpeakRate(rate: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RATE_STORAGE_KEY, String(clampSpeakRate(rate)));
}

export function getPiperVoiceId(gender: VoiceGender): string {
  return PIPER_VOICES[gender].id;
}

export function localPiperAssetUrls(gender: VoiceGender): {
  onnx: string;
  json: string;
} {
  const stem = PIPER_VOICES[gender].fileStem;
  return {
    onnx: `/piper-voices/${stem}.onnx`,
    json: `/piper-voices/${stem}.onnx.json`,
  };
}

/** HF URL basename keys used by @mintplex-labs/piper-tts-web OPFS cache */
export function piperOpfsBasenames(gender: VoiceGender): {
  onnx: string;
  json: string;
} {
  const stem = PIPER_VOICES[gender].fileStem;
  return {
    onnx: `${stem}.onnx`,
    json: `${stem}.onnx.json`,
  };
}
