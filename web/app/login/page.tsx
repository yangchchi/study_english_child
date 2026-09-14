"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("用户名或密码不对哦");
      return;
    }
    router.push("/today");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mb-3 text-5xl">🦊🎯</div>
        <h1 className="text-4xl font-bold text-sky-800">单词抓抓乐</h1>
        <p className="mt-2 text-lg text-slate-600">今天来抓几个单词吧！</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white/80 p-6 shadow-lg shadow-sky-100">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-600">用户名</span>
          <input
            className="w-full rounded-2xl border-2 border-sky-100 bg-sky-50 px-4 py-3 text-lg outline-none focus:border-sky-400"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-600">密码</span>
          <input
            type="password"
            className="w-full rounded-2xl border-2 border-sky-100 bg-sky-50 px-4 py-3 text-lg outline-none focus:border-sky-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="text-center text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-sky-500 py-3.5 text-lg font-bold text-white shadow-md shadow-sky-200 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "进入中…" : "开始抓词"}
        </button>
      </form>
      <p className="mt-6 text-center text-slate-600">
        还没有账号？{" "}
        <Link href="/register" className="font-bold text-emerald-600">
          注册一个
        </Link>
      </p>
    </main>
  );
}
