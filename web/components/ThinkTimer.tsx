"use client";

import { useEffect, useState } from "react";
import { speakEnglish as speakWithVoice } from "@/lib/tts";

export function ThinkTimer({
  seconds = 3,
  active,
  onDone,
}: {
  seconds?: number;
  active: boolean;
  onDone: () => void;
}) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (!active) {
      setLeft(seconds);
      return;
    }
    setLeft(seconds);
    let remaining = seconds;
    const id = setInterval(() => {
      remaining -= 1;
      setLeft(remaining);
      // onDone 必须在 setState updater 之外调用，否则会在渲染期间更新父组件
      if (remaining <= 0) {
        clearInterval(id);
        onDone();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [active, seconds, onDone]);

  if (!active) return null;

  return (
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-300 bg-amber-50 text-2xl font-bold text-amber-700 shadow-inner">
      {left}
    </div>
  );
}

/** 使用当前选择的标准男女声朗读 */
export function speakEnglish(text: string) {
  void speakWithVoice(text);
}
