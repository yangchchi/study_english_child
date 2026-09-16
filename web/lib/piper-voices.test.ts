import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPEAK_RATE,
  PIPER_VOICES,
  clampSpeakRate,
  getPiperVoiceId,
  localPiperAssetUrls,
} from "./piper-voices";

describe("piper voice mapping", () => {
  it("maps female teacher to hfc_female medium", () => {
    expect(getPiperVoiceId("female")).toBe("en_US-hfc_female-medium");
  });

  it("maps male teacher to ryan medium", () => {
    expect(getPiperVoiceId("male")).toBe("en_US-ryan-medium");
  });

  it("exposes local public asset urls for onnx + json", () => {
    expect(localPiperAssetUrls("female")).toEqual({
      onnx: "/piper-voices/en_US-hfc_female-medium.onnx",
      json: "/piper-voices/en_US-hfc_female-medium.onnx.json",
    });
    expect(PIPER_VOICES.male.label).toContain("Ryan");
  });

  it("defaults speak rate to 0.7 for kids", () => {
    expect(DEFAULT_SPEAK_RATE).toBe(0.7);
  });

  it("clamps speak rate into a child-friendly range", () => {
    expect(clampSpeakRate(0.2)).toBe(0.5);
    expect(clampSpeakRate(1.5)).toBe(1);
    expect(clampSpeakRate(0.73)).toBe(0.75);
    expect(clampSpeakRate(Number.NaN)).toBe(DEFAULT_SPEAK_RATE);
  });
});
