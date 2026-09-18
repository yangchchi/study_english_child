import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChildProfile } from "@/lib/session-user";
import { createGrainRound, getOrCreateGrainPlan } from "@/lib/grain";
import { getFoodStats } from "@/lib/pet-store";

export async function GET() {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const [plan, food] = await Promise.all([
    getOrCreateGrainPlan(ctx.profile.id),
    getFoodStats(ctx.profile.id),
  ]);
  return NextResponse.json({
    profile: {
      id: ctx.profile.id,
      nickname: ctx.profile.nickname,
      avatarEmoji: ctx.profile.avatarEmoji,
      dailyNewWords: ctx.profile.dailyNewWords,
    },
    plan,
    food,
  });
}

export async function POST(req: Request) {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = z
    .object({ action: z.enum(["restart"]) })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const [plan, food] = await Promise.all([
    createGrainRound(ctx.profile.id),
    getFoodStats(ctx.profile.id),
  ]);
  return NextResponse.json({
    profile: {
      id: ctx.profile.id,
      nickname: ctx.profile.nickname,
      avatarEmoji: ctx.profile.avatarEmoji,
      dailyNewWords: ctx.profile.dailyNewWords,
    },
    plan: { ...plan, roundComplete: false },
    food,
  });
}
