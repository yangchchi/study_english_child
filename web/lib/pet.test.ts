import { describe, expect, it } from "vitest";
import {
  applyFeed,
  applyRevive,
  DAILY_CONSUME,
  FEED_COST,
  REVIVE_COST,
  settleFoodConsumption,
  evaluatePet,
  getPetLine,
} from "./pet";

const MS_PER_DAY = 86_400_000;

describe("settleFoodConsumption", () => {
  const t0 = new Date("2026-09-14T10:00:00.000Z");

  it("does nothing within 24 hours", () => {
    const now = new Date(t0.getTime() + MS_PER_DAY - 1);
    const next = settleFoodConsumption(40, t0, now);
    expect(next.foodBalance).toBe(40);
    expect(next.lastSettledAt.getTime()).toBe(t0.getTime());
    expect(next.periods).toBe(0);
  });

  it("deducts 20 per full 24h period", () => {
    const now = new Date(t0.getTime() + MS_PER_DAY * 2 + 1000);
    const next = settleFoodConsumption(60, t0, now);
    expect(next.foodBalance).toBe(20);
    expect(next.periods).toBe(2);
    expect(next.lastSettledAt.getTime()).toBe(t0.getTime() + MS_PER_DAY * 2);
  });

  it("stops at 0 and does not go negative", () => {
    const now = new Date(t0.getTime() + MS_PER_DAY * 3);
    const next = settleFoodConsumption(30, t0, now);
    expect(next.foodBalance).toBe(0);
    expect(next.periods).toBe(2);
  });
});

describe("evaluatePet", () => {
  it("is dead when status dead or food is 0", () => {
    expect(
      evaluatePet({
        status: "dead",
        foodBalance: 40,
        lastFedDateKey: "2026-09-14",
        todayKey: "2026-09-14",
      }).status,
    ).toBe("dead");
    expect(
      evaluatePet({
        status: "alive",
        foodBalance: 0,
        lastFedDateKey: "2026-09-14",
        todayKey: "2026-09-14",
      }),
    ).toMatchObject({ status: "dead", mood: "dead" });
  });

  it("is full when fed today with food left", () => {
    const view = evaluatePet({
      status: "alive",
      foodBalance: 40,
      lastFedDateKey: "2026-09-14",
      todayKey: "2026-09-14",
    });
    expect(view.mood).toBe("full");
    expect(view.fedToday).toBe(true);
  });

  it("is critical when next auto-consume would deplete", () => {
    const view = evaluatePet({
      status: "alive",
      foodBalance: DAILY_CONSUME,
      lastFedDateKey: "2026-09-13",
      todayKey: "2026-09-14",
    });
    expect(view.mood).toBe("critical");
    expect(view.status).toBe("alive");
  });

  it("is hungry when food is above one daily consume", () => {
    const view = evaluatePet({
      status: "alive",
      foodBalance: 40,
      lastFedDateKey: "2026-09-13",
      todayKey: "2026-09-14",
    });
    expect(view.mood).toBe("hungry");
  });
});

describe("applyFeed", () => {
  it("deducts 20 food and marks today fed", () => {
    const next = applyFeed(
      { status: "alive", foodBalance: 50, lastFedDateKey: "2026-09-13" },
      "2026-09-14",
    );
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.alreadyFed).toBe(false);
    expect(next.foodBalance).toBe(50 - FEED_COST);
    expect(next.lastFedDateKey).toBe("2026-09-14");
  });

  it("does not deduct when already fed today", () => {
    const next = applyFeed(
      { status: "alive", foodBalance: 40, lastFedDateKey: "2026-09-14" },
      "2026-09-14",
    );
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.alreadyFed).toBe(true);
    expect(next.foodBalance).toBe(40);
  });

  it("rejects when dead or under 20 food", () => {
    expect(
      applyFeed(
        { status: "dead", foodBalance: 40, lastFedDateKey: "2026-09-10" },
        "2026-09-14",
      ),
    ).toEqual({ ok: false, reason: "dead" });
    expect(
      applyFeed(
        { status: "alive", foodBalance: 19, lastFedDateKey: "2026-09-13" },
        "2026-09-14",
      ),
    ).toEqual({ ok: false, reason: "no_food" });
  });
});

describe("applyRevive", () => {
  it("costs 20 food, revives, and marks fed today", () => {
    const next = applyRevive(
      { status: "dead", foodBalance: 45, lastFedDateKey: "2026-09-10" },
      "2026-09-14",
    );
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.status).toBe("alive");
    expect(next.foodBalance).toBe(45 - REVIVE_COST);
    expect(next.lastFedDateKey).toBe("2026-09-14");
  });

  it("rejects unless dead with at least 20 food", () => {
    expect(
      applyRevive(
        { status: "alive", foodBalance: 40, lastFedDateKey: "2026-09-14" },
        "2026-09-14",
      ),
    ).toEqual({ ok: false, reason: "not_dead" });
    expect(
      applyRevive(
        { status: "dead", foodBalance: 19, lastFedDateKey: "2026-09-10" },
        "2026-09-14",
      ),
    ).toEqual({ ok: false, reason: "no_food" });
  });
});

describe("getPetLine", () => {
  it("returns mood-aware encouragement for a context", () => {
    expect(getPetLine("full", "feed", 0)).toBe("好吃！谢谢你！");
    expect(getPetLine("critical", "idle", 0)).toContain("倒下");
    expect(getPetLine("dead", "revive", 0)).toContain("回来");
  });
});
