/** Fisher–Yates shuffle (pure, for choice options). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build unique multiple-choice labels: correct + up to `count` distinct distractors.
 * Dedupes pool so shared Chinese glosses (e.g. 爸爸) never appear twice.
 */
export function pickChoices(
  correct: string,
  pool: string[],
  count = 3,
  random: () => number = Math.random,
): string[] {
  const seen = new Set<string>([correct]);
  const uniquePool: string[] = [];
  for (const item of pool) {
    if (seen.has(item)) continue;
    seen.add(item);
    uniquePool.push(item);
  }
  const distractors = shuffleWith(uniquePool, random).slice(0, count);
  return shuffleWith([correct, ...distractors], random);
}

function shuffleWith<T>(arr: T[], random: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
