import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireChildProfile } from "@/lib/session-user";
import { dateKey } from "@/lib/srs";
import { awardFood } from "@/lib/pet-store";
import { computeRoundFoodAward, isGrainDateKey, type StudyMode } from "@/lib/pet";

const schema = z.object({
  phase: z.enum(["morning", "afternoon", "evening"]),
  mode: z.enum(["today", "grain"]).optional().default("today"),
  dateKey: z.string().optional(),
});

const PHASES = ["morning", "afternoon", "evening"] as const;

export async function POST(req: Request) {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const mode: StudyMode = parsed.data.mode;
  const key =
    mode === "grain"
      ? parsed.data.dateKey
      : parsed.data.dateKey ?? dateKey();

  if (!key) {
    return NextResponse.json({ error: "缺少学习轮次" }, { status: 400 });
  }
  if (mode === "grain" && !isGrainDateKey(key)) {
    return NextResponse.json({ error: "攒粮轮次无效" }, { status: 400 });
  }
  if (mode === "today" && isGrainDateKey(key)) {
    return NextResponse.json({ error: "今日轮次无效" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const session = await tx.studySession.findUnique({
        where: {
          childId_dateKey_phase: {
            childId: ctx.profile.id,
            dateKey: key,
            phase: parsed.data.phase,
          },
        },
      });
      if (!session) return null;
      const firstComplete = !session.completedAt;
      await tx.studySession.update({
        where: { id: session.id },
        data: { completedAt: session.completedAt ?? new Date() },
      });

      const allSessions = await tx.studySession.findMany({
        where: {
          childId: ctx.profile.id,
          dateKey: key,
          phase: { in: [...PHASES] },
        },
      });
      const allPhasesComplete = PHASES.every((p) =>
        Boolean(allSessions.find((row) => row.phase === p)?.completedAt),
      );

      const award = computeRoundFoodAward({
        firstCompleteThisPhase: firstComplete,
        allPhasesComplete,
        mode,
      });
      const foodAwarded = award > 0 ? await awardFood(ctx.profile.id, award, tx) : 0;
      const updated = await tx.studySession.findUniqueOrThrow({ where: { id: session.id } });
      return { session: updated, foodAwarded };
    });

    if (!result) {
      return NextResponse.json({ error: "还没有开始这一关" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "还没有开始这一关" }, { status: 404 });
  }
}
