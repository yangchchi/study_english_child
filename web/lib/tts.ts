"use client";

export type VoiceGender = "female" | "male";

export type VoicePreset = {
  id: VoiceGender;
  label: string;
  emoji: string;
  desc: string;
  /** Preferred Web Speech / system voice name fragments, best-first */
  nameHints: string[];
  langHints: string[];
  rate: number;
  pitch: number;
};

/**
 * 女声候选来自用户清单（Allison / Ava / Victoria / Susan / Serena / Tessa / Martha）。
 * 适合小朋友的排序依据：清晰度、美式小学教材常用、语气亲切、口音不过偏。
 * 男声清单未提供，选用教育场景常见的清晰英式 Daniel（美式回退 Alex / Fred）。
 */
export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: "female",
    label: "女老师 Ava",
    emoji: "👩‍🏫",
    desc: "美式、清晰亲切（首选 Ava，其次 Allison）",
    nameHints: [
      "Ava",
      "Allison",
      "Serena",
      "Susan",
      "Samantha",
      "Google US English",
      "Microsoft Aria",
      "Microsoft Jenny",
      "Kathy",
      "Tessa",
      "Victoria",
      "Martha",
    ],
    langHints: ["en-US", "en_US", "en-GB", "en_GB"],
    rate: 0.88,
    pitch: 1.05,
  },
  {
    id: "male",
    label: "男老师 Daniel",
    emoji: "👨‍🏫",
    desc: "清晰标准英式（适合对比听音）",
    nameHints: [
      "Daniel",
      "Alex",
      "Aaron",
      "Tom",
      "Google UK English Male",
      "Microsoft Guy",
      "Microsoft Ryan",
      "Fred",
    ],
    langHints: ["en-GB", "en_GB", "en-US", "en_US"],
    rate: 0.9,
    pitch: 0.95,
  },
];

const STORAGE_KEY = "wordcatch-voice-gender";

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
  const lang = (voice.lang || "").replace("_", "-");
  let score = 0;

  preset.nameHints.forEach((hint, i) => {
    if (name.toLowerCase().includes(hint.toLowerCase())) {
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

  if (voice.localService) score += 5;
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
  // If nothing matched hints, still return a reasonable English voice
  if (bestScore <= 0) {
    return (
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
      // Safari sometimes needs a tick
      setTimeout(() => resolve(read()), 500);
    });
  }
  return voicesReady;
}

export async function speakEnglish(
  text: string,
  gender: VoiceGender = getSavedVoiceGender(),
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
  u.rate = preset.rate;
  u.pitch = preset.pitch;
  window.speechSynthesis.speak(u);
  return voice?.name ?? null;
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
