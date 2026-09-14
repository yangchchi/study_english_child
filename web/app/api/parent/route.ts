import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireChildProfile, requireUser } from "@/lib/session-user";

export async function POST(req: Request) {
  const ctx = await requireUser();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = z
    .object({ pin: z.string().length(4) })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "PIN 格式错误" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user?.parentPinHash) {
    return NextResponse.json({ error: "未设置家长 PIN" }, { status: 400 });
  }
  const ok = await bcrypt.compare(body.data.pin, user.parentPinHash);
  if (!ok) return NextResponse.json({ error: "PIN 错误" }, { status: 403 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = z
    .object({
      pin: z.string().length(4),
      dailyNewWords: z.number().int().min(10).max(20).optional(),
      newPin: z.string().length(4).optional(),
      nickname: z.string().min(1).max(20).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "参数错误" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user?.parentPinHash) return NextResponse.json({ error: "未设置 PIN" }, { status: 400 });
  const ok = await bcrypt.compare(body.data.pin, user.parentPinHash);
  if (!ok) return NextResponse.json({ error: "PIN 错误" }, { status: 403 });

  if (body.data.newPin) {
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { parentPinHash: await bcrypt.hash(body.data.newPin, 10) },
    });
  }

  const profile = await prisma.childProfile.update({
    where: { id: ctx.profile.id },
    data: {
      dailyNewWords: body.data.dailyNewWords,
      nickname: body.data.nickname,
    },
  });

  const weak = await prisma.wordProgress.groupBy({
    by: ["wordId"],
    where: { childId: ctx.profile.id, wrongCount: { gt: 0 } },
    _sum: { wrongCount: true },
    orderBy: { _sum: { wrongCount: "desc" } },
    take: 5,
  });

  return NextResponse.json({ profile, weakCount: weak.length });
}

export async function GET() {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const total = await prisma.wordProgress.count({ where: { childId: ctx.profile.id } });
  const mastered = await prisma.wordProgress.count({
    where: { childId: ctx.profile.id, OR: [{ status: "mastered" }, { srsStep: { gte: 4 } }] },
  });
  const wrong = await prisma.wordProgress.count({
    where: { childId: ctx.profile.id, wrongCount: { gt: 0 } },
  });

  return NextResponse.json({
    stats: { total, mastered, wrong, dailyNewWords: ctx.profile.dailyNewWords },
    profile: ctx.profile,
  });
}
