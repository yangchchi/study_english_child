import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireChildProfile } from "@/lib/session-user";
import { applyAnswer, dateKey } from "@/lib/srs";

const schema = z.object({
  wordId: z.string(),
  correct: z.boolean(),
  phase: z.enum(["morning", "afternoon", "evening"]),
});

export async function POST(req: Request) {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const { wordId, correct, phase } = parsed.data;
  const childId = ctx.profile.id;

  const existing = await prisma.wordProgress.findUnique({
    where: { childId_wordId: { childId, wordId } },
  });

  const base = existing ?? {
    status: "new" as const,
    srsStep: 0,
    nextReviewAt: null,
    wrongCount: 0,
    correctStreak: 0,
    lastResult: null,
  };

  // Morning "建立" always counts as soft correct exposure unless marked wrong
  const next = applyAnswer(
    {
      status: base.status as "new" | "learning" | "reviewing" | "mastered",
      srsStep: base.srsStep,
      nextReviewAt: base.nextReviewAt,
      wrongCount: base.wrongCount,
      correctStreak: base.correctStreak,
      lastResult: (base.lastResult as "correct" | "wrong" | null) ?? null,
    },
    phase === "morning" ? true : correct,
  );

  const progress = await prisma.wordProgress.upsert({
    where: { childId_wordId: { childId, wordId } },
    update: next,
    create: {
      childId,
      wordId,
      ...next,
    },
  });

  const key = dateKey();
  if (correct || phase === "morning") {
    await prisma.studySession.updateMany({
      where: { childId, dateKey: key, phase },
      data: { score: { increment: 1 } },
    });
  }

  return NextResponse.json({ progress });
}
