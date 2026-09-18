import { describe, expect, it } from "vitest";
import { rollFoodEarnedToday } from "./pet";

describe("rollFoodEarnedToday", () => {
  it("starts fresh on a new day", () => {
    expect(
      rollFoodEarnedToday({
        foodEarnedToday: 30,
        foodEarnedDateKey: "2026-09-17",
        todayKey: "2026-09-18",
        amount: 20,
      }),
    ).toEqual({ foodEarnedToday: 20, foodEarnedDateKey: "2026-09-18" });
  });

  it("accumulates on the same day", () => {
    expect(
      rollFoodEarnedToday({
        foodEarnedToday: 20,
        foodEarnedDateKey: "2026-09-18",
        todayKey: "2026-09-18",
        amount: 10,
      }),
    ).toEqual({ foodEarnedToday: 30, foodEarnedDateKey: "2026-09-18" });
  });

  it("reads 0 when date key is stale", () => {
    expect(
      rollFoodEarnedToday({
        foodEarnedToday: 40,
        foodEarnedDateKey: "2026-09-17",
        todayKey: "2026-09-18",
        amount: 0,
      }),
    ).toEqual({ foodEarnedToday: 0, foodEarnedDateKey: "2026-09-18" });
  });
});
