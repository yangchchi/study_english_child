/** SRS intervals in days after a correct answer at each step index. */
export const SRS_INTERVALS_DAYS = [0, 1, 2, 4, 7, 14, 30] as const;

export type SrsState = {
  status: "new" | "learning" | "reviewing" | "mastered";
  srsStep: number;
  nextReviewAt: Date | null;
  wrongCount: number;
  correctStreak: number;
  lastResult: "correct" | "wrong" | null;
};

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

export function nextReviewDate(step: number, from: Date = new Date()): Date {
  const idx = Math.min(Math.max(step, 0), SRS_INTERVALS_DAYS.length - 1);
  return addDays(from, SRS_INTERVALS_DAYS[idx]);
}

export function applyAnswer(
  current: SrsState,
  correct: boolean,
  now: Date = new Date(),
): SrsState {
  if (correct) {
    const nextStep = Math.min(current.srsStep + 1, SRS_INTERVALS_DAYS.length - 1);
    const streak = current.correctStreak + 1;
    const mastered = nextStep >= SRS_INTERVALS_DAYS.length - 1 && streak >= 2;
    return {
      status: mastered ? "mastered" : nextStep <= 1 ? "learning" : "reviewing",
      srsStep: nextStep,
      nextReviewAt: nextReviewDate(nextStep, now),
      wrongCount: current.wrongCount,
      correctStreak: streak,
      lastResult: "correct",
    };
  }

  const nextStep = Math.max(0, current.srsStep - 1);
  return {
    status: "learning",
    srsStep: nextStep,
    nextReviewAt: nextReviewDate(0, now), // due again today/soon
    wrongCount: current.wrongCount + 1,
    correctStreak: 0,
    lastResult: "wrong",
  };
}

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
