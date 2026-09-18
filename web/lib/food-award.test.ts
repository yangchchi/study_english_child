import { describe, expect, it } from "vitest";
import {
  computeRoundFoodAward,
  GRAIN_FOOD_AWARD,
  isGrainDateKey,
  TODAY_FOOD_AWARD,
} from "./pet";

describe("computeRoundFoodAward", () => {
  it("awards 20 when today round becomes fully complete", () => {
    expect(
      computeRoundFoodAward({
        firstCompleteThisPhase: true,
        allPhasesComplete: true,
        mode: "today",
      }),
    ).toBe(TODAY_FOOD_AWARD);
  });

  it("awards 10 when grain round becomes fully complete", () => {
    expect(
      computeRoundFoodAward({
        firstCompleteThisPhase: true,
        allPhasesComplete: true,
        mode: "grain",
      }),
    ).toBe(GRAIN_FOOD_AWARD);
  });

  it("awards 0 unless this completion finishes the round", () => {
    expect(
      computeRoundFoodAward({
        firstCompleteThisPhase: true,
        allPhasesComplete: false,
        mode: "today",
      }),
    ).toBe(0);
    expect(
      computeRoundFoodAward({
        firstCompleteThisPhase: false,
        allPhasesComplete: true,
        mode: "grain",
      }),
    ).toBe(0);
  });
});

describe("isGrainDateKey", () => {
  it("detects grain round keys", () => {
    expect(isGrainDateKey("grain:abc")).toBe(true);
    expect(isGrainDateKey("2026-09-18")).toBe(false);
  });
});
