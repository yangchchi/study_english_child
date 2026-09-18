import { NextResponse } from "next/server";
import { z } from "zod";
import { requireChildProfile } from "@/lib/session-user";
import {
  adoptPet,
  feedPet,
  getSettledPet,
  isPetSpecies,
  revivePet,
  setPetVisible,
} from "@/lib/pet-store";

const errors = {
  missing: "还没有宠物",
  exists: "已经有宠物了",
  dead: "它已经倒下了，先复活吧",
  no_food: "粮食不够，先去学习攒粮吧",
  not_dead: "它还活着哦",
} as const;

function fail(reason: keyof typeof errors, extra?: { noFoodRevive?: boolean }) {
  const message =
    extra?.noFoodRevive && reason === "no_food" ? "复活需要 20 份粮食" : errors[reason];
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const pet = await getSettledPet(ctx.profile.id);
  return NextResponse.json({ pet });
}

export async function POST(req: Request) {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = z
    .object({
      action: z.enum(["adopt", "feed", "revive"]),
      species: z.string().optional(),
      name: z.string().max(8).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  if (body.data.action === "adopt") {
    if (!body.data.species || !isPetSpecies(body.data.species)) {
      return NextResponse.json({ error: "请选择小猫或小狗" }, { status: 400 });
    }
    const result = await adoptPet(ctx.profile.id, body.data.species, body.data.name);
    if (!result.ok) {
      return NextResponse.json({ error: errors.exists }, { status: 409 });
    }
    return NextResponse.json({ pet: result.pet });
  }

  if (body.data.action === "feed") {
    const result = await feedPet(ctx.profile.id);
    if (!result.ok) return fail(result.reason);
    return NextResponse.json({ pet: result.pet, alreadyFed: result.alreadyFed });
  }

  const result = await revivePet(ctx.profile.id);
  if (!result.ok) {
    return fail(result.reason, { noFoodRevive: result.reason === "no_food" });
  }
  return NextResponse.json({ pet: result.pet });
}

export async function PATCH(req: Request) {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const body = z
    .object({ visible: z.boolean() })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const result = await setPetVisible(ctx.profile.id, body.data.visible);
  if (!result.ok) return fail(result.reason);
  return NextResponse.json({ pet: result.pet });
}
