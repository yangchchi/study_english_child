import { NextResponse } from "next/server";
import { requireChildProfile } from "@/lib/session-user";
import { buildTodayPlan } from "@/lib/today";

export async function GET() {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const plan = await buildTodayPlan(ctx.profile.id);
  return NextResponse.json({
    profile: {
      id: ctx.profile.id,
      nickname: ctx.profile.nickname,
      avatarEmoji: ctx.profile.avatarEmoji,
      dailyNewWords: ctx.profile.dailyNewWords,
    },
    plan,
  });
}
