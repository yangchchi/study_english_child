import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireChildProfile } from "@/lib/session-user";
import { dateKey } from "@/lib/srs";
import { awardSessionFood } from "@/lib/pet-store";

const schema = z.object({
  phase: z.enum(["morning", "afternoon", "evening"]),
});

export async function POST(req: Request) {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const key = dateKey();
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
      const updated = await tx.studySession.update({
        where: { id: session.id },
        data: { completedAt: session.completedAt ?? new Date() },
      });
      const foodAwarded = firstComplete ? await awardSessionFood(ctx.profile.id, tx) : 0;
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
