import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireChildProfile } from "@/lib/session-user";
import { dateKey } from "@/lib/srs";

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
  const session = await prisma.studySession.update({
    where: {
      childId_dateKey_phase: {
        childId: ctx.profile.id,
        dateKey: key,
        phase: parsed.data.phase,
      },
    },
    data: { completedAt: new Date() },
  });

  return NextResponse.json({ session });
}
