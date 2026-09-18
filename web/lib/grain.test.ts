import { describe, expect, it } from "vitest";
import { makeGrainDateKey, pickRandomIds } from "./grain";

describe("pickRandomIds", () => {
  it("picks up to n unique ids", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const picked = pickRandomIds(ids, 3, () => 0.5);
    expect(picked).toHaveLength(3);
    expect(new Set(picked).size).toBe(3);
    for (const id of picked) expect(ids).toContain(id);
  });

  it("returns all when pool smaller than n", () => {
    expect(pickRandomIds(["a", "b"], 10, () => 0.1)).toEqual(["a", "b"]);
  });
});

describe("makeGrainDateKey", () => {
  it("prefixes grain round id", () => {
    expect(makeGrainDateKey("abc123")).toBe("grain:abc123");
  });
});
