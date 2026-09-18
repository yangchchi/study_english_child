import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import type { Phase, TodayPlan, TodayWord } from "./today";

export const GRAIN_WORD_COUNT = 10;

export function makeGrainDateKey(roundId: string): string {
  return `grain:${roundId}`;
}

function newRoundId(): string {
  return randomBytes(8).toString("hex");
}

/** Fisher–Yates style pick with injectable RNG for tests. */
export function pickRandomIds(
  ids: string[],
  n: number,
  random: () => number = Math.random,
): string[] {
  if (ids.length <= n) return [...ids];
  const copy = [...ids];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function mapWord(w: {
  id: string;
  english: string;
  chinese: string;
  phonetic: string | null;
  emoji: string;
  collocation: string | null;
  example: string | null;
  theme: { nameZh: string; sentenceTemplate: string };
}): TodayWord {
  return {
    id: w.id,
    english: w.english,
    chinese: w.chinese,
    phonetic: w.phonetic,
    emoji: w.emoji,
    collocation: w.collocation,
    example: w.example,
    themeName: w.theme.nameZh,
    sentenceTemplate: w.theme.sentenceTemplate,
  };
}

function asWordIds(value: unknown): string[] {
  if (Array.isArray(value) && value.every((x) => typeof x === "string")) {
    return value;
  }
  return [];
}

async function loadPlanForDateKey(childId: string, key: string): Promise<TodayPlan> {
  const sessions = await prisma.studySession.findMany({
    where: { childId, dateKey: key },
  });
  const map = Object.fromEntries(sessions.map((s) => [s.phase, s]));
  const morning = map["morning"];
  const wordIds = asWordIds(morning?.wordIds);

  const words = await prisma.word.findMany({
    where: { id: { in: wordIds } },
    include: { theme: true },
  });
  const byId = Object.fromEntries(words.map((w) => [w.id, mapWord(w)]));
  const ordered = wordIds.map((id) => byId[id]).filter(Boolean);

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
    dailyNewWords: GRAIN_WORD_COUNT,
    phases: {
      morning: makePhase("morning"),
      afternoon: makePhase("afternoon"),
      evening: makePhase("evening"),
    },
    reviewCount,
    newCount,
  };
}

export async function createGrainRound(childId: string): Promise<TodayPlan> {
  const allIds = (
    await prisma.word.findMany({ select: { id: true }, orderBy: { english: "asc" } })
  ).map((w) => w.id);
  const wordIds = pickRandomIds(allIds, GRAIN_WORD_COUNT);
  const key = makeGrainDateKey(newRoundId());

  for (const phase of ["morning", "afternoon", "evening"] as Phase[]) {
    await prisma.studySession.create({
      data: {
        childId,
        dateKey: key,
        phase,
        wordIds,
        total: wordIds.length,
      },
    });
  }

  // Ensure progress rows exist so answers update SRS like today
  for (const wordId of wordIds) {
    await prisma.wordProgress.upsert({
      where: { childId_wordId: { childId, wordId } },
      update: {},
      create: {
        childId,
        wordId,
        status: "new",
        srsStep: 0,
        nextReviewAt: new Date(),
      },
    });
  }

  return loadPlanForDateKey(childId, key);
}

export async function getOrCreateGrainPlan(childId: string): Promise<TodayPlan & { roundComplete: boolean }> {
  const latest = await prisma.studySession.findFirst({
    where: { childId, dateKey: { startsWith: "grain:" }, phase: "morning" },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) {
    const plan = await createGrainRound(childId);
    return { ...plan, roundComplete: false };
  }

  const plan = await loadPlanForDateKey(childId, latest.dateKey);
  const roundComplete = (["morning", "afternoon", "evening"] as Phase[]).every(
    (p) => plan.phases[p].completed,
  );
  return { ...plan, roundComplete };
}
