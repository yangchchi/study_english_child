"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("小探险家");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, nickname }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "注册失败");
      return;
    }
    const login = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      setError("注册成功，但自动登录失败，请手动登录");
      return;
    }
    router.push("/today");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mb-3 text-5xl">🌈</div>
        <h1 className="text-3xl font-bold text-emerald-700">创建探险小队</h1>
        <p className="mt-2 text-slate-600">默认家长 PIN：1234（可在「我的」修改）</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white/80 p-6 shadow-lg shadow-emerald-100">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">孩子昵称</span>
          <input
            className="w-full rounded-2xl border-2 border-emerald-100 bg-emerald-50 px-4 py-3 text-lg outline-none focus:border-emerald-400"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">用户名</span>
          <input
            className="w-full rounded-2xl border-2 border-emerald-100 bg-emerald-50 px-4 py-3 text-lg outline-none focus:border-emerald-400"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">密码（至少 4 位）</span>
          <input
            type="password"
            className="w-full rounded-2xl border-2 border-emerald-100 bg-emerald-50 px-4 py-3 text-lg outline-none focus:border-emerald-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={4}
            required
          />
        </label>
        {error && <p className="text-center text-rose-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-emerald-500 py-3.5 text-lg font-bold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "创建中…" : "出发！"}
        </button>
      </form>
      <p className="mt-6 text-center">
        已有账号？{" "}
        <Link href="/login" className="font-bold text-sky-600">
          去登录
        </Link>
      </p>
    </main>
  );
}
