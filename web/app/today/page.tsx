"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";

type Plan = {
  profile: { nickname: string; avatarEmoji: string; dailyNewWords: number };
  plan: {
    dateKey: string;
    newCount: number;
    reviewCount: number;
    phases: Record<
      "morning" | "afternoon" | "evening",
      { completed: boolean; score: number; total: number }
    >;
  };
};

const cards = [
  {
    phase: "morning" as const,
    title: "早晨 · 建立",
    desc: "听一听、看一看、说一说",
    emoji: "🌅",
    color: "from-amber-200 to-orange-100",
    btn: "bg-amber-500",
  },
  {
    phase: "afternoon" as const,
    title: "下午 · 打捞",
    desc: "中文想英文，主动抓回来",
    emoji: "☀️",
    color: "from-sky-200 to-cyan-100",
    btn: "bg-sky-500",
  },
  {
    phase: "evening" as const,
    title: "晚上 · 句型",
    desc: "放进句子，跟读一下",
    emoji: "🌙",
    color: "from-indigo-200 to-sky-100",
    btn: "bg-indigo-500",
  },
];

export default function TodayPage() {
  const [data, setData] = useState<Plan | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/today")
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return r.json();
      })
      .then((d) => d && setData(d))
      .catch(() => setError("加载失败，请刷新"));
  }, []);

  const doneCount = data
    ? cards.filter((c) => data.plan.phases[c.phase].completed).length
    : 0;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-52 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">你好呀</p>
          <h1 className="text-2xl font-bold text-sky-900">
            {data ? `${data.profile.avatarEmoji} ${data.profile.nickname}` : "加载中…"}
          </h1>
        </div>
        <div className="rounded-2xl bg-white/80 px-3 py-2 text-center shadow-sm">
          <div className="text-lg">{"⭐".repeat(doneCount) || "☆☆☆"}</div>
          <div className="text-xs text-slate-500">今日星星</div>
        </div>
      </header>

      {error && <p className="mb-4 text-rose-600">{error}</p>}

      {data && (
        <p className="mb-4 rounded-2xl bg-white/70 px-4 py-3 text-slate-700">
          今天准备抓 <b className="text-emerald-600">{data.plan.newCount}</b> 个新词，
          打捞 <b className="text-sky-600">{data.plan.reviewCount}</b> 个老朋友。
          一共约 {data.profile.dailyNewWords} 个目标！
        </p>
      )}

      <div className="space-y-4">
        {cards.map((c) => {
          const phase = data?.plan.phases[c.phase];
          const done = phase?.completed;
          return (
            <section
              key={c.phase}
              className={`rounded-3xl bg-gradient-to-br ${c.color} p-5 shadow-md bounce-in`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-3xl">{c.emoji}</div>
                  <h2 className="mt-1 text-xl font-bold text-slate-800">{c.title}</h2>
                  <p className="text-slate-600">{c.desc}</p>
                  {phase && (
                    <p className="mt-2 text-sm text-slate-500">
                      {done ? `完成！抓住 ${phase.score}/${phase.total}` : `待抓 ${phase.total} 个`}
                    </p>
                  )}
                </div>
                {done ? (
                  <span className="rounded-full bg-white/80 px-3 py-2 text-sm font-bold text-emerald-600">
                    已完成 ✓
                  </span>
                ) : (
                  <Link
                    href={`/session/${c.phase}`}
                    className={`rounded-2xl ${c.btn} px-4 py-3 text-sm font-bold text-white shadow active:scale-95`}
                  >
                    开始
                  </Link>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <BottomNav />
    </main>
  );
}
