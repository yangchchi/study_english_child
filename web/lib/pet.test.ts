import { describe, expect, it } from "vitest";
import {
  applyFeed,
  applyRevive,
  daysBetweenKeys,
  evaluatePet,
  getPetLine,
} from "./pet";

describe("daysBetweenKeys", () => {
  it("counts whole days across month boundary", () => {
    expect(daysBetweenKeys("2026-09-14", "2026-09-14")).toBe(0);
    expect(daysBetweenKeys("2026-09-11", "2026-09-14")).toBe(3);
    expect(daysBetweenKeys("2026-08-30", "2026-09-02")).toBe(3);
  });
});

describe("evaluatePet", () => {
  const adopted = "2026-09-11";

  it("is hungry on adopt day if never fed", () => {
    const view = evaluatePet({
      status: "alive",
      lastFedDateKey: null,
      adoptedDateKey: adopted,
      todayKey: "2026-09-11",
    });
    expect(view.status).toBe("alive");
    expect(view.mood).toBe("hungry");
    expect(view.daysUnfed).toBe(0);
    expect(view.fedToday).toBe(false);
  });

  it("is full when fed today", () => {
    const view = evaluatePet({
      status: "alive",
      lastFedDateKey: "2026-09-14",
      adoptedDateKey: adopted,
      todayKey: "2026-09-14",
    });
    expect(view.mood).toBe("full");
    expect(view.fedToday).toBe(true);
    expect(view.daysUnfed).toBe(0);
  });

  it("is hungry one day after last meal", () => {
    const view = evaluatePet({
      status: "alive",
      lastFedDateKey: "2026-09-13",
      adoptedDateKey: adopted,
      todayKey: "2026-09-14",
    });
    expect(view.mood).toBe("hungry");
    expect(view.daysUnfed).toBe(1);
  });

  it("is critical two days after last meal", () => {
    const view = evaluatePet({
      status: "alive",
      lastFedDateKey: "2026-09-12",
      adoptedDateKey: adopted,
      todayKey: "2026-09-14",
    });
    expect(view.mood).toBe("critical");
    expect(view.daysUnfed).toBe(2);
    expect(view.status).toBe("alive");
  });

  it("dies after three days unfed", () => {
    const view = evaluatePet({
      status: "alive",
      lastFedDateKey: "2026-09-11",
      adoptedDateKey: adopted,
      todayKey: "2026-09-14",
    });
    expect(view.status).toBe("dead");
    expect(view.mood).toBe("dead");
    expect(view.daysUnfed).toBe(3);
  });

  it("counts from adopt day when never fed", () => {
    const view = evaluatePet({
      status: "alive",
      lastFedDateKey: null,
      adoptedDateKey: "2026-09-11",
      todayKey: "2026-09-14",
    });
    expect(view.status).toBe("dead");
    expect(view.daysUnfed).toBe(3);
  });

  it("stays dead even if dates would look fresh", () => {
    const view = evaluatePet({
      status: "dead",
      lastFedDateKey: "2026-09-14",
      adoptedDateKey: adopted,
      todayKey: "2026-09-14",
    });
    expect(view.status).toBe("dead");
    expect(view.mood).toBe("dead");
  });
});

describe("applyFeed", () => {
  it("deducts one food and marks today fed", () => {
    const next = applyFeed(
      { status: "alive", foodBalance: 2, lastFedDateKey: "2026-09-13" },
      "2026-09-14",
    );
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.alreadyFed).toBe(false);
    expect(next.foodBalance).toBe(1);
    expect(next.lastFedDateKey).toBe("2026-09-14");
  });

  it("does not deduct when already fed today", () => {
    const next = applyFeed(
      { status: "alive", foodBalance: 4, lastFedDateKey: "2026-09-14" },
      "2026-09-14",
    );
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.alreadyFed).toBe(true);
    expect(next.foodBalance).toBe(4);
  });

  it("rejects when dead or out of food", () => {
    expect(
      applyFeed(
        { status: "dead", foodBalance: 5, lastFedDateKey: "2026-09-10" },
        "2026-09-14",
      ),
    ).toEqual({ ok: false, reason: "dead" });
    expect(
      applyFeed(
        { status: "alive", foodBalance: 0, lastFedDateKey: "2026-09-13" },
        "2026-09-14",
      ),
    ).toEqual({ ok: false, reason: "no_food" });
  });
});

describe("applyRevive", () => {
  it("costs 3 food and counts as fed today", () => {
    const next = applyRevive(
      { status: "dead", foodBalance: 5, lastFedDateKey: "2026-09-10" },
      "2026-09-14",
    );
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.status).toBe("alive");
    expect(next.foodBalance).toBe(2);
    expect(next.lastFedDateKey).toBe("2026-09-14");
  });

  it("rejects unless dead with at least 3 food", () => {
    expect(
      applyRevive(
        { status: "alive", foodBalance: 9, lastFedDateKey: "2026-09-14" },
        "2026-09-14",
      ),
    ).toEqual({ ok: false, reason: "not_dead" });
    expect(
      applyRevive(
        { status: "dead", foodBalance: 2, lastFedDateKey: "2026-09-10" },
        "2026-09-14",
      ),
    ).toEqual({ ok: false, reason: "no_food" });
  });
});

describe("getPetLine", () => {
  it("returns mood-aware encouragement for a context", () => {
    expect(getPetLine("full", "feed", 0)).toBe("好吃！谢谢你！");
    expect(getPetLine("critical", "idle", 0)).toBe("明天不喂会倒下！");
    expect(getPetLine("dead", "revive", 0)).toContain("回来");
  });
});
