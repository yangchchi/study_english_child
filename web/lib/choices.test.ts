import { describe, expect, it } from "vitest";
import { pickChoices } from "./choices";

describe("pickChoices", () => {
  it("never includes duplicate labels even when pool repeats glosses", () => {
    const choices = pickChoices(
      "爸爸",
      ["爸爸", "妈妈", "爸爸", "哥哥", "妈妈", "姐姐"],
      3,
      () => 0.1,
    );
    expect(new Set(choices).size).toBe(choices.length);
    expect(choices).toContain("爸爸");
    expect(choices.length).toBeLessThanOrEqual(4);
  });

  it("keeps the correct answer when pool is short", () => {
    const choices = pickChoices("apple", ["banana"], 3, () => 0);
    expect(choices).toContain("apple");
    expect(choices).toContain("banana");
    expect(choices).toHaveLength(2);
  });
});
