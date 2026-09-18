"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PhoneticText } from "@/components/PhoneticText";
import { ThinkTimer, speakEnglish } from "@/components/ThinkTimer";
import { VoicePicker } from "@/components/VoicePicker";
import { phoneticFor } from "@/data/phonetics";
import { pickChoices } from "@/lib/choices";
import { PET_FOOD_AWARD_KEY } from "@/lib/pet";

type Word = {
  id: string;
  english: string;
  chinese: string;
  phonetic: string | null;
  emoji: string;
  collocation: string | null;
  example: string | null;
  themeName: string;
  sentenceTemplate: string;
};

type Phase = "morning" | "afternoon" | "evening";

function SessionInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const phase = params.phase as Phase;
  const fromGrain = searchParams.get("from") === "grain";
  const grainDateKey = searchParams.get("dateKey") ?? "";
  const homeHref = fromGrain ? "/grain" : "/today";
  const planApi = fromGrain ? "/api/grain" : "/api/today";

  const [words, setWords] = useState<Word[]>([]);
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"ok" | "bad" | null>(null);
  const [thinking, setThinking] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    fetch(planApi)
      .then((r) => r.json())
      .then((d) => {
        if (!d.plan) {
          router.push("/login");
          return;
        }
        if (fromGrain && grainDateKey && d.plan.dateKey !== grainDateKey) {
          router.push("/grain");
          return;
        }
        setWords(d.plan.phases[phase].words);
      });
  }, [phase, router, planApi, fromGrain, grainDateKey]);

  const word = words[idx];

  const buildChoices = useCallback(
    (w: Word, all: Word[]) => {
      if (phase === "afternoon") {
        const pool = all.filter((x) => x.id !== w.id).map((x) => x.english);
        return pickChoices(w.english, pool);
      }
      const pool = all.filter((x) => x.id !== w.id).map((x) => x.chinese);
      return pickChoices(w.chinese, pool);
    },
    [phase],
  );

  useEffect(() => {
    if (!word || words.length === 0) return;
    setFeedback(null);
    setRevealed(false);
    if (phase === "afternoon") {
      setThinking(true);
      setChoices([]);
    } else if (phase === "evening") {
      setChoices(buildChoices(word, words));
      speakEnglish(word.english);
    } else {
      speakEnglish(word.english);
    }
  }, [word, words, phase, buildChoices]);

  const sentence = useMemo(() => {
    if (!word) return "";
    return word.example || word.sentenceTemplate.replace("_____", word.english);
  }, [word]);

  async function submit(correct: boolean) {
    if (!word) return;
    setFeedback(correct ? "ok" : "bad");
    await fetch("/api/session/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wordId: word.id,
        correct,
        phase,
        dateKey: fromGrain ? grainDateKey : undefined,
      }),
    });
    setTimeout(() => {
      if (idx + 1 >= words.length) {
        fetch("/api/session/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase,
            mode: fromGrain ? "grain" : "today",
            dateKey: fromGrain ? grainDateKey : undefined,
          }),
        })
          .then(async (r) => {
            const d = await r.json().catch(() => ({}));
            if (typeof d.foodAwarded === "number" && d.foodAwarded > 0) {
              sessionStorage.setItem(PET_FOOD_AWARD_KEY, String(d.foodAwarded));
            }
          })
          .finally(() => router.push(homeHref));
      } else {
        setIdx((i) => i + 1);
      }
    }, 650);
  }

  const onThinkDone = useCallback(() => {
    setThinking(false);
    if (word) setChoices(buildChoices(word, words));
  }, [word, words, buildChoices]);

  async function toggleRecord() {
    if (recording) {
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => stream.getTracks().forEach((t) => t.stop());
      rec.start();
      setRecording(true);
      setTimeout(() => {
        if (rec.state !== "inactive") rec.stop();
        setRecording(false);
      }, 3000);
    } catch {
      /* ignore mic denial */
    }
  }

  if (!word) {
    return (
      <main className="flex min-h-dvh items-center justify-center text-slate-500">
        准备词卡中…
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button onClick={() => router.push(homeHref)} className="text-sky-700 font-semibold">
          ← {fromGrain ? "回攒粮" : "回今日"}
        </button>
        <VoicePicker compact />
        <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-slate-600">
          {idx + 1} / {words.length}
        </span>
      </div>

      <div
        className={`flex flex-1 flex-col items-center justify-center rounded-3xl bg-white/85 p-6 shadow-lg ${
          feedback === "ok" ? "bounce-in" : feedback === "bad" ? "shake" : ""
        }`}
      >
        <div className="text-6xl">{word.emoji}</div>
        <p className="mt-2 text-sm text-slate-500">{word.themeName}</p>

        {phase === "morning" && (
          <>
            <h2 className="mt-3 text-4xl font-bold text-sky-800">{word.english}</h2>
            <PhoneticText phonetic={word.phonetic} className="mt-1" />
            <p className="mt-2 text-2xl text-slate-700">{word.chinese}</p>
            {word.collocation && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                搭配：{word.collocation}
              </p>
            )}
            <p className="mt-3 text-lg text-emerald-700">{sentence}</p>
            <button
              onClick={() => speakEnglish(word.english)}
              className="mt-4 rounded-2xl bg-sky-100 px-4 py-2 font-semibold text-sky-800"
            >
              🔊 再听一遍
            </button>
            <button
              onClick={() => submit(true)}
              className="mt-6 w-full rounded-2xl bg-emerald-500 py-4 text-lg font-bold text-white"
            >
              抓住了！✨
            </button>
          </>
        )}

        {phase === "afternoon" && (
          <>
            <h2 className="mt-3 text-3xl font-bold text-slate-800">{word.chinese}</h2>
            <p className="mt-2 text-slate-500">英文怎么说？先想 3 秒…</p>
            <div className="mt-4">
              <ThinkTimer active={thinking} onDone={onThinkDone} />
            </div>
            {revealed && (
              <div className="mt-3 text-center">
                <p className="text-2xl font-bold text-sky-700">{word.english}</p>
                <PhoneticText phonetic={word.phonetic} className="mt-1" />
              </div>
            )}
            <div className="mt-6 grid w-full grid-cols-1 gap-3">
              {choices.map((c, i) => {
                const choicePhonetic =
                  c === word.english ? word.phonetic : phoneticFor(c) ?? null;
                return (
                  <button
                    key={`${i}-${c}`}
                    disabled={thinking || feedback !== null}
                    onClick={() => submit(c === word.english)}
                    className="rounded-2xl border-2 border-sky-100 bg-sky-50 py-3 text-lg font-semibold text-sky-900 active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="block">{c}</span>
                    {choicePhonetic ? (
                      <span className="mt-0.5 block text-sm font-normal italic text-sky-600/80">
                        {choicePhonetic}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {!thinking && !feedback && (
              <button
                onClick={() => {
                  setRevealed(true);
                  setTimeout(() => setRevealed(false), 800);
                }}
                className="mt-4 text-sm text-slate-500 underline"
              >
                想不起来？偷看一眼再合上
              </button>
            )}
          </>
        )}

        {phase === "evening" && (
          <>
            <h2 className="mt-3 text-4xl font-bold text-indigo-800">{word.english}</h2>
            <PhoneticText phonetic={word.phonetic} className="mt-1" />
            <p className="mt-4 text-lg text-slate-600">中文意思是？</p>
            <div className="mt-4 grid w-full grid-cols-1 gap-3">
              {choices.map((c, i) => (
                <button
                  key={`${i}-${c}`}
                  disabled={feedback !== null}
                  onClick={() => submit(c === word.chinese)}
                  className="rounded-2xl border-2 border-indigo-100 bg-indigo-50 py-3 text-lg font-semibold disabled:opacity-50"
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-6 w-full rounded-2xl bg-emerald-50 p-4 text-center">
              <p className="text-sm text-emerald-700">用句子说出来</p>
              <p className="mt-1 text-lg font-bold text-emerald-900">{sentence}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => speakEnglish(sentence)}
                  className="flex-1 rounded-xl bg-white py-2 font-semibold text-sky-700"
                >
                  🔊 听句子
                </button>
                <button
                  onClick={toggleRecord}
                  className={`flex-1 rounded-xl py-2 font-semibold ${
                    recording ? "bg-rose-400 text-white" : "bg-white text-rose-600"
                  }`}
                >
                  {recording ? "录音中…" : "🎤 跟读"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">跟读后点选项即可；录音可选</p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center text-slate-500">
          准备词卡中…
        </main>
      }
    >
      <SessionInner />
    </Suspense>
  );
}
