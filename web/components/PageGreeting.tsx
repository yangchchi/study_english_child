"use client";

import { useMemo } from "react";
import { quoteForDateKey } from "@/lib/quotes";

export function PageGreeting({
  nickname,
  avatarEmoji,
  dateKey,
  loading = false,
  titleClassName = "text-sky-900",
}: {
  nickname?: string;
  avatarEmoji?: string;
  dateKey?: string;
  loading?: boolean;
  titleClassName?: string;
}) {
  const quote = useMemo(
    () => quoteForDateKey(dateKey ?? new Date().toISOString().slice(0, 10)),
    [dateKey],
  );

  return (
    <div className="min-w-0 pr-3">
      <p className="text-sm leading-snug text-slate-500">{quote}</p>
      <h1 className={`mt-1 text-2xl font-bold ${titleClassName}`}>
        {loading || !nickname
          ? "加载中…"
          : `${avatarEmoji ? `${avatarEmoji} ` : ""}${nickname}，你好呀！`}
      </h1>
    </div>
  );
}
