"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { PhoneticText } from "@/components/PhoneticText";
import { speakEnglish } from "@/components/ThinkTimer";

type WrongWord = {
  id: string;
  english: string;
  chinese: string;
  phonetic: string | null;
  emoji: string;
  wrongCount: number;
  themeName: string;
};

export default function WrongPage() {
  const [words, setWords] = useState<WrongWord[]>([]);

  useEffect(() => {
    fetch("/api/wrong-words")
      .then((r) => {
        if (r.status === 401) window.location.href = "/login";
        return r.json();
      })
      .then((d) => setWords(d.words || []));
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-52 pt-6">
      <h1 className="mb-2 text-2xl font-bold text-rose-700">🏝️ 错词岛</h1>
      <p className="mb-5 text-slate-600">能量只攻击薄弱点——再抓一次！</p>

      {words.length === 0 ? (
        <div className="rounded-3xl bg-white/80 p-8 text-center shadow-sm">
          <div className="text-5xl">🎉</div>
          <p className="mt-3 text-lg font-semibold text-emerald-700">岛上暂时没有错词</p>
          <p className="mt-1 text-slate-500">去今日任务继续抓词吧</p>
          <Link href="/today" className="mt-4 inline-block rounded-2xl bg-sky-500 px-5 py-3 font-bold text-white">
            回今日
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {words.map((w) => (
            <li key={w.id} className="flex items-center gap-3 rounded-3xl bg-white/85 p-4 shadow-sm">
              <span className="text-3xl">{w.emoji}</span>
              <div className="flex-1">
                <div className="font-bold text-slate-800">
                  {w.english} · {w.chinese}
                </div>
                <PhoneticText phonetic={w.phonetic} className="mt-0.5 text-sm" />
                <div className="text-xs text-slate-500">
                  {w.themeName} · 错过 {w.wrongCount} 次
                </div>
              </div>
              <button
                onClick={() => speakEnglish(w.english)}
                className="rounded-xl bg-sky-100 px-3 py-2 text-sky-800"
              >
                🔊
              </button>
            </li>
          ))}
        </ul>
      )}
      <BottomNav />
    </main>
  );
}
