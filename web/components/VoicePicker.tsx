"use client";

import { useEffect, useState } from "react";
import {
  getSavedVoiceGender,
  saveVoiceGender,
  speakEnglish,
  VoiceGender,
  VOICE_PRESETS,
} from "@/lib/tts";

export function VoicePicker({ compact = false }: { compact?: boolean }) {
  const [gender, setGender] = useState<VoiceGender>("female");
  const [matched, setMatched] = useState("");

  useEffect(() => {
    setGender(getSavedVoiceGender());
  }, []);

  async function choose(next: VoiceGender) {
    setGender(next);
    saveVoiceGender(next);
    const name = await speakEnglish("Hello! I like apples.", next);
    setMatched(name ? `当前音色：${name}` : "未找到偏好音色，已用系统默认");
  }

  if (compact) {
    return (
      <div className="flex gap-2">
        {VOICE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => choose(p.id)}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              gender === p.id
                ? "bg-sky-500 text-white"
                : "bg-white/80 text-slate-600"
            }`}
          >
            {p.emoji} {p.id === "female" ? "女声" : "男声"}
          </button>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-3xl bg-white/85 p-5 shadow-sm">
      <h2 className="font-bold text-slate-800">🔊 标准发音</h2>
      <p className="mt-1 text-sm text-slate-500">
        女声优选 Ava（其次 Allison）；男声用 Daniel，方便对比听音。
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {VOICE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => choose(p.id)}
            className={`rounded-2xl border-2 px-4 py-3 text-left transition ${
              gender === p.id
                ? "border-sky-400 bg-sky-50 shadow-sm"
                : "border-transparent bg-slate-50"
            }`}
          >
            <div className="text-lg font-bold">
              {p.emoji} {p.label}
            </div>
            <div className="mt-1 text-xs text-slate-500">{p.desc}</div>
            <div className="mt-2 text-sm font-semibold text-sky-700">试听 →</div>
          </button>
        ))}
      </div>
      {matched && <p className="mt-3 text-center text-sm text-emerald-700">{matched}</p>}
      <p className="mt-2 text-xs leading-relaxed text-slate-400">
        候选女声排序：Ava → Allison → Serena → Susan（Victoria / Martha / Tessa
        清晰度或口音略逊，作后备）。若本机未安装高级音色，会自动回退到浏览器可用的英语声。
      </p>
    </section>
  );
}
