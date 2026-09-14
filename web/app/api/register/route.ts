import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(4).max(64),
  nickname: z.string().min(1).max(20).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "请检查用户名和密码" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (exists) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const parentPinHash = await bcrypt.hash("1234", 10);

  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      passwordHash,
      parentPinHash,
      profiles: {
        create: {
          nickname: parsed.data.nickname ?? "小探险家",
          avatarEmoji: "🦊",
          dailyNewWords: 20,
        },
      },
    },
    include: { profiles: true },
  });

  return NextResponse.json({
    ok: true,
    userId: user.id,
    profileId: user.profiles[0]?.id,
  });
}
