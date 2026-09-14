"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { VoicePicker } from "@/components/VoicePicker";
import { PetVisibleToggle } from "@/components/pet/PetVisibleToggle";

export default function MePage() {
  const [stats, setStats] = useState<{ total: number; mastered: number; wrong: number; dailyNewWords: number } | null>(null);
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [daily, setDaily] = useState(20);
  const [unlocked, setUnlocked] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/parent")
      .then((r) => {
        if (r.status === 401) window.location.href = "/login";
        return r.json();
      })
      .then((d) => {
        setStats(d.stats);
        setNickname(d.profile?.nickname || "");
        setDaily(d.stats?.dailyNewWords || 20);
      });
  }, []);

  async function unlock(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/parent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const d = await r.json();
    if (!r.ok) {
      setMsg(d.error || "PIN 错误");
      return;
    }
    setUnlocked(true);
    setMsg("家长模式已解锁");
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/parent", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, dailyNewWords: daily, nickname }),
    });
    const d = await r.json();
    setMsg(r.ok ? "已保存" : d.error || "保存失败");
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-52 pt-6">
      <h1 className="mb-4 text-2xl font-bold text-sky-900">🦊 我的</h1>

      <section className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "学过", value: stats?.total ?? "–", color: "bg-sky-100 text-sky-800" },
          { label: "掌握", value: stats?.mastered ?? "–", color: "bg-emerald-100 text-emerald-800" },
          { label: "错词", value: stats?.wrong ?? "–", color: "bg-rose-100 text-rose-800" },
        ].map((x) => (
          <div key={x.label} className={`rounded-3xl ${x.color} p-4 text-center`}>
            <div className="text-2xl font-bold">{x.value}</div>
            <div className="text-xs">{x.label}</div>
          </div>
        ))}
      </section>

      <div className="mb-4">
        <VoicePicker />
      </div>

      <PetVisibleToggle />

      <section className="rounded-3xl bg-white/85 p-5 shadow-sm">
        <h2 className="font-bold text-slate-800">家长模式</h2>
        <p className="mt-1 text-sm text-slate-500">默认 PIN：1234</p>
        {!unlocked ? (
          <form onSubmit={unlock} className="mt-3 flex gap-2">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={4}
              inputMode="numeric"
              placeholder="4 位 PIN"
              className="flex-1 rounded-2xl border-2 border-slate-100 px-3 py-2"
            />
            <button className="rounded-2xl bg-amber-400 px-4 py-2 font-bold text-white">解锁</button>
          </form>
        ) : (
          <form onSubmit={saveSettings} className="mt-3 space-y-3">
            <label className="block text-sm">
              昵称
              <input
                className="mt-1 w-full rounded-2xl border-2 border-slate-100 px-3 py-2"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              每日新词数（10–20）
              <input
                type="number"
                min={10}
                max={20}
                className="mt-1 w-full rounded-2xl border-2 border-slate-100 px-3 py-2"
                value={daily}
                onChange={(e) => setDaily(Number(e.target.value))}
              />
            </label>
            <button className="w-full rounded-2xl bg-emerald-500 py-3 font-bold text-white">保存设置</button>
          </form>
        )}
        {msg && <p className="mt-2 text-center text-sm text-sky-700">{msg}</p>}
      </section>

      <div className="mt-4 space-y-2">
        <Link href="/parent" className="block rounded-2xl bg-white/80 px-4 py-3 text-center font-semibold text-slate-700">
          家长说明与进度建议
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full rounded-2xl bg-slate-200 py-3 font-semibold text-slate-700"
        >
          退出登录
        </button>
      </div>
      <BottomNav />
    </main>
  );
}
