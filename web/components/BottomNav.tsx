"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/today", label: "今日", emoji: "🌟" },
  { href: "/library", label: "词库", emoji: "📚" },
  { href: "/wrong", label: "错词", emoji: "🏝️" },
  { href: "/me", label: "我的", emoji: "🦊" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-sky-100 bg-white/95 backdrop-blur safe-bottom">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-sm font-semibold transition ${
                  active ? "bg-sky-100 text-sky-800" : "text-slate-500"
                }`}
              >
                <span className="text-xl">{item.emoji}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
