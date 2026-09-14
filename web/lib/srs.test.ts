import { describe, expect, it } from "vitest";
import { applyAnswer, nextReviewDate, SRS_INTERVALS_DAYS } from "./srs";

describe("srs", () => {
  it("advances step on correct", () => {
    const next = applyAnswer(
      {
        status: "new",
        srsStep: 0,
        nextReviewAt: null,
        wrongCount: 0,
        correctStreak: 0,
        lastResult: null,
      },
      true,
      new Date("2026-09-11T08:00:00"),
    );
    expect(next.srsStep).toBe(1);
    expect(next.lastResult).toBe("correct");
    expect(next.correctStreak).toBe(1);
  });

  it("decrements step and increments wrongCount on wrong", () => {
    const next = applyAnswer(
      {
        status: "reviewing",
        srsStep: 3,
        nextReviewAt: new Date(),
        wrongCount: 1,
        correctStreak: 2,
        lastResult: "correct",
      },
      false,
    );
    expect(next.srsStep).toBe(2);
    expect(next.wrongCount).toBe(2);
    expect(next.correctStreak).toBe(0);
    expect(next.status).toBe("learning");
  });

  it("maps intervals", () => {
    const from = new Date("2026-09-11T12:00:00");
    expect(nextReviewDate(0, from).getDate()).toBe(11);
    expect(nextReviewDate(3, from).getDate()).toBe(15); // +4 days
    expect(SRS_INTERVALS_DAYS[SRS_INTERVALS_DAYS.length - 1]).toBe(30);
  });
});
