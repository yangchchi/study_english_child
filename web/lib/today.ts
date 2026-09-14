import { prisma } from "./prisma";
import { dateKey } from "./srs";

export type Phase = "morning" | "afternoon" | "evening";

/** StudySession.wordIds is Json (string[]) under SQLite */
function asWordIds(value: unknown): string[] {
  if (Array.isArray(value) && value.every((x) => typeof x === "string")) {
    return value;
  }
  return [];
}

export type TodayWord = {
  id: string;
  english: string;
  chinese: string;
  emoji: string;
  collocation: string | null;
  example: string | null;
  themeName: string;
  sentenceTemplate: string;
};

export type TodayPlan = {
  dateKey: string;
  dailyNewWords: number;
  phases: Record<
    Phase,
    {
      completed: boolean;
      score: number;
      total: number;
      words: TodayWord[];
    }
  >;
  reviewCount: number;
  newCount: number;
};

function mapWord(w: {
  id: string;
  english: string;
  chinese: string;
  emoji: string;
  collocation: string | null;
  example: string | null;
  theme: { nameZh: string; sentenceTemplate: string };
}): TodayWord {
  return {
    id: w.id,
    english: w.english,
    chinese: w.chinese,
    emoji: w.emoji,
    collocation: w.collocation,
    example: w.example,
    themeName: w.theme.nameZh,
    sentenceTemplate: w.theme.sentenceTemplate,
  };
}

export async function buildTodayPlan(childId: string, when: Date = new Date()): Promise<TodayPlan> {
  const key = dateKey(when);
  const child = await prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
  const quota = Math.min(20, Math.max(10, child.dailyNewWords));

  const sessions = await prisma.studySession.findMany({
    where: { childId, dateKey: key },
  });
  const sessionMap = Object.fromEntries(sessions.map((s) => [s.phase, s]));

  // If morning already planned, reuse its word ids for afternoon/evening.
  const morningSession = sessionMap["morning"];
  let wordIds: string[] = asWordIds(morningSession?.wordIds);

  if (wordIds.length === 0) {
    const startOfDay = new Date(when);
    startOfDay.setHours(0, 0, 0, 0);

    const due = await prisma.wordProgress.findMany({
      where: {
        childId,
        OR: [
          { nextReviewAt: { lte: startOfDay } },
          { nextReviewAt: null, status: { in: ["learning", "reviewing"] } },
        ],
      },
      include: { word: { include: { theme: true } } },
      orderBy: [{ wrongCount: "desc" }, { updatedAt: "asc" }],
      take: Math.ceil(quota / 2),
    });

    const knownIds = (
      await prisma.wordProgress.findMany({
        where: { childId },
        select: { wordId: true },
      })
    ).map((p) => p.wordId);

    const newWords = await prisma.word.findMany({
      where: {
        id: { notIn: knownIds },
      },
      include: { theme: true },
      orderBy: [{ theme: { sortOrder: "asc" } }, { level: "asc" }, { english: "asc" }],
      take: quota - due.length,
    });

    // Ensure progress rows for new words
    for (const w of newWords) {
      await prisma.wordProgress.upsert({
        where: { childId_wordId: { childId, wordId: w.id } },
        update: {},
        create: {
          childId,
          wordId: w.id,
          status: "new",
          srsStep: 0,
          nextReviewAt: startOfDay,
        },
      });
    }

    const combined = [...due.map((d) => d.word), ...newWords];
    // Prefer wrong words first among due
    wordIds = combined.map((w) => w.id);

    // Pad if somehow empty (fresh DB edge)
    if (wordIds.length === 0) {
      const fallback = await prisma.word.findMany({
        take: quota,
        orderBy: [{ theme: { sortOrder: "asc" } }, { english: "asc" }],
      });
      for (const w of fallback) {
        await prisma.wordProgress.upsert({
          where: { childId_wordId: { childId, wordId: w.id } },
          update: {},
          create: { childId, wordId: w.id, status: "new", srsStep: 0, nextReviewAt: startOfDay },
        });
      }
      wordIds = fallback.map((w) => w.id);
    }

    await prisma.studySession.upsert({
      where: { childId_dateKey_phase: { childId, dateKey: key, phase: "morning" } },
      update: { wordIds, total: wordIds.length },
      create: {
        childId,
        dateKey: key,
        phase: "morning",
        wordIds,
        total: wordIds.length,
      },
    });
  }

  // Mirror wordIds into afternoon/evening session shells
  for (const phase of ["afternoon", "evening"] as Phase[]) {
    await prisma.studySession.upsert({
      where: { childId_dateKey_phase: { childId, dateKey: key, phase } },
      update: { wordIds, total: wordIds.length },
      create: {
        childId,
        dateKey: key,
        phase,
        wordIds,
        total: wordIds.length,
      },
    });
  }

  const words = await prisma.word.findMany({
    where: { id: { in: wordIds } },
    include: { theme: true },
  });
  const byId = Object.fromEntries(words.map((w) => [w.id, mapWord(w)]));
  const ordered = wordIds.map((id) => byId[id]).filter(Boolean);

  const refreshed = await prisma.studySession.findMany({
    where: { childId, dateKey: key },
  });
  const map = Object.fromEntries(refreshed.map((s) => [s.phase, s]));

  const makePhase = (phase: Phase) => {
    const s = map[phase];
    return {
      completed: Boolean(s?.completedAt),
      score: s?.score ?? 0,
      total: s?.total ?? ordered.length,
      words: ordered,
    };
  };

  const progressRows = await prisma.wordProgress.findMany({
    where: { childId, wordId: { in: wordIds } },
  });
  const reviewCount = progressRows.filter((p) => p.status !== "new").length;
  const newCount = wordIds.length - reviewCount;

  return {
    dateKey: key,
    dailyNewWords: quota,
    phases: {
      morning: makePhase("morning"),
      afternoon: makePhase("afternoon"),
      evening: makePhase("evening"),
    },
    reviewCount,
    newCount,
  };
}
