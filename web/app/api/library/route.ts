import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireChildProfile } from "@/lib/session-user";

export async function GET() {
  const ctx = await requireChildProfile();
  if (!ctx) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const themes = await prisma.theme.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      words: {
        include: {
          progress: {
            where: { childId: ctx.profile.id },
          },
        },
      },
    },
  });

  return NextResponse.json({
    themes: themes.map((t) => {
      const total = t.words.length;
      const mastered = t.words.filter((w) =>
        w.progress.some((p) => p.status === "mastered" || p.srsStep >= 4),
      ).length;
      return {
        id: t.id,
        slug: t.slug,
        nameZh: t.nameZh,
        emoji: t.emoji,
        sentenceTemplate: t.sentenceTemplate,
        total,
        mastered,
        words: t.words.map((w) => ({
          id: w.id,
          english: w.english,
          chinese: w.chinese,
          emoji: w.emoji,
          status: w.progress[0]?.status ?? "new",
          srsStep: w.progress[0]?.srsStep ?? 0,
        })),
      };
    }),
  });
}
