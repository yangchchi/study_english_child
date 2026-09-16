"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_SPEAK_RATE,
  SPEAK_RATE_MAX,
  SPEAK_RATE_MIN,
  SPEAK_RATE_STEP,
  getSavedSpeakRate,
  getSavedVoiceGender,
  saveSpeakRate,
  saveVoiceGender,
  speakEnglish,
  VoiceGender,
  VOICE_PRESETS,
} from "@/lib/tts";

function formatRate(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

export function VoicePicker({ compact = false }: { compact?: boolean }) {
  const [gender, setGender] = useState<VoiceGender>("female");
  const [rate, setRate] = useState(DEFAULT_SPEAK_RATE);
  const [matched, setMatched] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setGender(getSavedVoiceGender());
    setRate(getSavedSpeakRate());
  }, []);

  async function choose(next: VoiceGender) {
    setGender(next);
    saveVoiceGender(next);
    setBusy(true);
    setMatched("正在加载本地人声模型…");
    try {
      const name = await speakEnglish("Hello! I like apples.", next);
      setMatched(name ? `当前音色：${name}` : "播放失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  function onRateChange(next: number) {
    setRate(next);
    saveSpeakRate(next);
  }

  async function previewRate() {
    setBusy(true);
    setMatched(`语速 ${formatRate(rate)}，试听中…`);
    try {
      const name = await speakEnglish("Hello! I like apples.", gender);
      setMatched(
        name
          ? `语速 ${formatRate(rate)} · ${name}`
          : `语速已设为 ${formatRate(rate)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    return (
      <div className="flex gap-2">
        {VOICE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy}
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
        本地 Piper 人声：女老师 HFC / 男老师 Ryan（首次加载约需几秒）。
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {VOICE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy}
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

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="speak-rate" className="text-sm font-bold text-slate-800">
            语速（适合小朋友）
          </label>
          <span className="text-sm font-semibold text-sky-700">{formatRate(rate)}</span>
        </div>
        <input
          id="speak-rate"
          type="range"
          min={SPEAK_RATE_MIN}
          max={SPEAK_RATE_MAX}
          step={SPEAK_RATE_STEP}
          value={rate}
          disabled={busy}
          onChange={(e) => onRateChange(Number(e.target.value))}
          className="mt-2 w-full accent-sky-500"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>更慢 {formatRate(SPEAK_RATE_MIN)}</span>
          <span>默认 {formatRate(DEFAULT_SPEAK_RATE)}</span>
          <span>正常 {formatRate(SPEAK_RATE_MAX)}</span>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => previewRate()}
          className="mt-3 w-full rounded-xl bg-sky-500 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          用当前语速试听
        </button>
      </div>

      {matched && <p className="mt-3 text-center text-sm text-emerald-700">{matched}</p>}
      <p className="mt-2 text-xs leading-relaxed text-slate-400">
        语速保存在本机，学习页发音会跟着这里的设置走。人声模型在{" "}
        <code>public/piper-voices/</code>
        ；缺失时会尝试联网缓存，仍失败则回退系统发音。
      </p>
    </section>
  );
}
