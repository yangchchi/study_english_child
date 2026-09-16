"use client";

import {
  DEFAULT_SPEAK_RATE,
  PIPER_VOICES,
  getSavedSpeakRate,
  type VoiceGender,
} from "./piper-voices";

export type { VoiceGender };
export {
  DEFAULT_SPEAK_RATE,
  SPEAK_RATE_MAX,
  SPEAK_RATE_MIN,
  SPEAK_RATE_STEP,
  clampSpeakRate,
  getSavedSpeakRate,
  saveSpeakRate,
} from "./piper-voices";

export type VoicePreset = {
  id: VoiceGender;
  label: string;
  emoji: string;
  desc: string;
  /** Preferred Web Speech / system voice name fragments (fallback only) */
  nameHints: string[];
  langHints: string[];
  rate: number;
  pitch: number;
};

/**
 * Primary playback is Piper (local ONNX). Web Speech presets below are
 * fallback when Piper models / WASM fail to load.
 */
export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: "female",
    label: PIPER_VOICES.female.label,
    emoji: "👩‍🏫",
    desc: PIPER_VOICES.female.desc,
    nameHints: [
      "Samantha",
      "Google US English",
      "Microsoft Aria",
      "Microsoft Jenny",
      "Ava",
      "Allison",
      "Zoe",
      "Susan",
    ],
    langHints: ["en-US", "en_US", "en-GB", "en_GB"],
    rate: DEFAULT_SPEAK_RATE,
    pitch: 1,
  },
  {
    id: "male",
    label: PIPER_VOICES.male.label,
    emoji: "👨‍🏫",
    desc: PIPER_VOICES.male.desc,
    nameHints: [
      "Daniel",
      "Google UK English Male",
      "Microsoft Guy",
      "Alex",
      "Aaron",
      "Fred",
    ],
    langHints: ["en-US", "en_US", "en-GB", "en_GB"],
    rate: DEFAULT_SPEAK_RATE,
    pitch: 1,
  },
];

const STORAGE_KEY = "wordcatch-voice-gender";

const QUALITY_BOOST = [
  "premium",
  "enhanced",
  "neural",
  "natural",
  "online",
  "google",
  "microsoft",
];

const ROBOTIC_PENALTY = [
  "compact",
  "eloquence",
  "albert",
  "bad news",
  "bahh",
  "bells",
  "boing",
  "bubbles",
  "cellos",
  "good news",
  "jester",
  "organ",
  "superstar",
  "trinoids",
  "whisper",
  "zarvox",
  "junior",
];

export function getSavedVoiceGender(): VoiceGender {
  if (typeof window === "undefined") return "female";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "male" ? "male" : "female";
}

export function saveVoiceGender(gender: VoiceGender) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, gender);
}

export function getPreset(gender: VoiceGender = getSavedVoiceGender()): VoicePreset {
  return VOICE_PRESETS.find((p) => p.id === gender) ?? VOICE_PRESETS[0];
}

function scoreVoice(voice: SpeechSynthesisVoice, preset: VoicePreset): number {
  const name = voice.name || "";
  const lower = name.toLowerCase();
  const lang = (voice.lang || "").replace("_", "-");
  let score = 0;

  preset.nameHints.forEach((hint, i) => {
    if (lower.includes(hint.toLowerCase())) {
      score += 100 - i * 3;
    }
  });

  preset.langHints.forEach((hint, i) => {
    const h = hint.replace("_", "-");
    if (lang.toLowerCase().startsWith(h.toLowerCase().slice(0, 2))) {
      score += 8 - i;
    }
    if (lang.toLowerCase() === h.toLowerCase()) score += 12;
  });

  for (const tip of QUALITY_BOOST) {
    if (lower.includes(tip)) score += 40;
  }

  for (const tip of ROBOTIC_PENALTY) {
    if (lower.includes(tip)) score -= 80;
  }

  if (!voice.localService) score += 15;
  else score += 5;

  return score;
}

export function pickVoice(
  preset: VoicePreset,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang || ""));
  const pool = english.length ? english : voices;
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of pool) {
    const s = scoreVoice(v, preset);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  if (bestScore <= 0) {
    return (
      pool.find((v) => /premium|enhanced|neural|google|microsoft/i.test(v.name)) ||
      pool.find((v) => /en-US/i.test(v.lang)) ||
      pool.find((v) => /en-GB/i.test(v.lang)) ||
      pool[0] ||
      null
    );
  }
  return best;
}

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }
  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      const read = () => window.speechSynthesis.getVoices();
      const existing = read();
      if (existing.length) {
        resolve(existing);
        return;
      }
      const onChange = () => {
        const list = read();
        if (list.length) {
          window.speechSynthesis.onvoiceschanged = null;
          resolve(list);
        }
      };
      window.speechSynthesis.onvoiceschanged = onChange;
      setTimeout(() => resolve(read()), 500);
    });
  }
  return voicesReady;
}

async function speakWithWebSpeech(
  text: string,
  gender: VoiceGender,
): Promise<string | null> {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const preset = getPreset(gender);
  const voices = await loadVoices();
  const voice = pickVoice(preset, voices);

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang || "en-US";
  } else {
    u.lang = preset.langHints[0]?.replace("_", "-") || "en-US";
  }
  u.rate = getSavedSpeakRate();
  u.pitch = preset.pitch;
  window.speechSynthesis.speak(u);
  return voice?.name ?? "系统默认";
}

export async function speakEnglish(
  text: string,
  gender: VoiceGender = getSavedVoiceGender(),
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const { speakWithPiper } = await import("./piper-engine");
    return await speakWithPiper(text, gender);
  } catch (err) {
    console.warn("[tts] Piper failed, falling back to Web Speech", err);
    return speakWithWebSpeech(text, gender);
  }
}

export function listMatchedVoices(gender: VoiceGender): Promise<
  { name: string; lang: string; score: number }[]
> {
  const preset = getPreset(gender);
  return loadVoices().then((voices) =>
    voices
      .map((v) => ({ name: v.name, lang: v.lang, score: scoreVoice(v, preset) }))
      .filter((v) => v.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8),
  );
}
