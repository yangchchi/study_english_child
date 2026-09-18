import { describe, expect, it } from "vitest";
import { themes } from "./seed-vocab";
import { phoneticFor } from "./phonetics";

const IPA_RE = /^\/[^/]+\/$/;

describe("seed vocabulary phonetics", () => {
  it("provides textbook-style IPA for every seed word", () => {
    const missing: string[] = [];
    const invalid: string[] = [];

    for (const theme of themes) {
      for (const word of theme.words) {
        const phonetic = phoneticFor(word.english) ?? word.phonetic;
        if (!phonetic) {
          missing.push(`${theme.slug}:${word.english}`);
          continue;
        }
        if (!IPA_RE.test(phonetic)) {
          invalid.push(`${word.english} -> ${phonetic}`);
        }
      }
    }

    expect(missing, `missing phonetics: ${missing.join(", ")}`).toEqual([]);
    expect(invalid, `invalid phonetics: ${invalid.join(", ")}`).toEqual([]);
  });
});
