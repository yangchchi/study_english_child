import Link from "next/link";

export default function ParentHelpPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <Link href="/me" className="font-semibold text-sky-700">
        ← 返回
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-800">给家长的小抄</h1>
      <ul className="mt-4 space-y-3 text-slate-700">
        <li className="rounded-2xl bg-white/80 p-4">🌅 早晨：一起建立，听读即可，不必抄写。</li>
        <li className="rounded-2xl bg-white/80 p-4">☀️ 下午：让孩子主动想；卡住就给 3 秒，再闪看。</li>
        <li className="rounded-2xl bg-white/80 p-4">🌙 晚上：句子 + 跟读；重点盯错词岛。</li>
        <li className="rounded-2xl bg-white/80 p-4">📌 家长真正要做的：制造反馈，而不是讲解搬运。</li>
        <li className="rounded-2xl bg-white/80 p-4">🎯 默认每天约 25 分钟，三返昼夜。</li>
      </ul>
    </main>
  );
}
