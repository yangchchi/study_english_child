import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireChildProfile } from "@/lib/session-user";

export async function GET() {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const rows = await prisma.wordProgress.findMany({
    where: { childId: ctx.profile.id, wrongCount: { gt: 0 } },
    include: { word: { include: { theme: true } } },
    orderBy: [{ wrongCount: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });

  return NextResponse.json({
    words: rows.map((r) => ({
      id: r.word.id,
      english: r.word.english,
      chinese: r.word.chinese,
      phonetic: r.word.phonetic,
      emoji: r.word.emoji,
      wrongCount: r.wrongCount,
      themeName: r.word.theme.nameZh,
      sentenceTemplate: r.word.theme.sentenceTemplate,
      example: r.word.example,
      collocation: r.word.collocation,
    })),
  });
}
