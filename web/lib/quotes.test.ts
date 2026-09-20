import { describe, expect, it } from "vitest";
import { quoteForDateKey } from "./quotes";

describe("quoteForDateKey", () => {
  it("returns a stable quote for the same day", () => {
    const a = quoteForDateKey("2026-09-20");
    const b = quoteForDateKey("2026-09-20");
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it("can differ across days", () => {
    const pool = ["一", "二", "三", "四", "五", "六", "七", "八"];
    const a = quoteForDateKey("2026-09-20", pool);
    const b = quoteForDateKey("2026-09-21", pool);
    // Not guaranteed different for all pairs, but these two hashes diverge.
    expect(a).not.toBe(b);
  });
});
