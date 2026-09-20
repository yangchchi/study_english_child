"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { FoodStatsBadge } from "@/components/FoodStatsBadge";
import { PageGreeting } from "@/components/PageGreeting";

type Plan = {
  profile: { nickname: string; avatarEmoji: string };
  plan: {
    dateKey: string;
    newCount: number;
    reviewCount: number;
    roundComplete: boolean;
    phases: Record<
      "morning" | "afternoon" | "evening",
      { completed: boolean; score: number; total: number }
    >;
  };
  food?: { foodBalance: number; foodEarnedToday: number };
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

export default function GrainPage() {
  const [data, setData] = useState<Plan | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/grain")
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

  useEffect(() => {
    load();
  }, [load]);

  async function restart() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/grain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart" }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "再开一轮失败");
        return;
      }
      setData(d);
    } catch {
      setError("再开一轮失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-52 pt-6">
      <header className="mb-6 flex items-center justify-between gap-2">
        <PageGreeting
          nickname={data?.profile.nickname}
          avatarEmoji={data?.profile.avatarEmoji}
          dateKey={data?.plan.dateKey?.startsWith("grain:") ? undefined : data?.plan.dateKey}
          loading={!data}
          titleClassName="text-emerald-900"
        />
        <FoodStatsBadge
          foodBalance={data?.food?.foodBalance ?? 0}
          foodEarnedToday={data?.food?.foodEarnedToday ?? 0}
        />
      </header>

      {error && <p className="mb-4 text-rose-600">{error}</p>}

      <p className="mb-4 rounded-2xl bg-white/70 px-4 py-3 text-slate-700">
        随机抓 <b className="text-emerald-600">10</b> 个词，三关全过得{" "}
        <b className="text-amber-600">10 粮</b>，可一直练。
      </p>

      {data?.plan.roundComplete && (
        <button
          type="button"
          disabled={busy}
          onClick={restart}
          className="mb-4 w-full rounded-2xl bg-emerald-500 py-3 text-lg font-bold text-white shadow active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? "准备中…" : "再来一轮 🌾 +10"}
        </button>
      )}

      <div className="space-y-4">
        {cards.map((c) => {
          const phase = data?.plan.phases[c.phase];
          const done = phase?.completed;
          const dateKey = data?.plan.dateKey;
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
                    href={`/session/${c.phase}?from=grain&dateKey=${encodeURIComponent(dateKey ?? "")}`}
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
