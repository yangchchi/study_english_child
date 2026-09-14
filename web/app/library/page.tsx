"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";

type Theme = {
  id: string;
  nameZh: string;
  emoji: string;
  total: number;
  mastered: number;
  sentenceTemplate: string;
  words: { id: string; english: string; chinese: string; emoji: string; status: string }[];
};

export default function LibraryPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/library")
      .then((r) => {
        if (r.status === 401) window.location.href = "/login";
        return r.json();
      })
      .then((d) => setThemes(d.themes || []));
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-28 pt-6">
      <h1 className="mb-2 text-2xl font-bold text-sky-900">📚 词库地图</h1>
      <p className="mb-5 text-slate-600">按主题成群学习，一句型带走一串词</p>
      <div className="space-y-3">
        {themes.map((t) => {
          const pct = t.total ? Math.round((t.mastered / t.total) * 100) : 0;
          const isOpen = open === t.id;
          return (
            <section key={t.id} className="overflow-hidden rounded-3xl bg-white/85 shadow-sm">
              <button
                className="flex w-full items-center gap-3 px-4 py-4 text-left"
                onClick={() => setOpen(isOpen ? null : t.id)}
              >
                <span className="text-3xl">{t.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">{t.nameZh}</div>
                  <div className="text-xs text-slate-500">
                    {t.sentenceTemplate} · {t.mastered}/{t.total}
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-sky-100">
                    <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-slate-400">{isOpen ? "▴" : "▾"}</span>
              </button>
              {isOpen && (
                <ul className="grid grid-cols-2 gap-2 border-t border-sky-50 px-4 py-3">
                  {t.words.map((w) => (
                    <li
                      key={w.id}
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        w.status === "new" ? "bg-slate-50 text-slate-500" : "bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      <span className="mr-1">{w.emoji}</span>
                      <b>{w.english}</b>
                      <div className="text-xs opacity-80">{w.chinese}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <BottomNav />
    </main>
  );
}
