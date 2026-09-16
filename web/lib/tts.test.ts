import { describe, expect, it } from "vitest";
import { pickVoice, VOICE_PRESETS } from "./tts";

function fakeVoice(
  name: string,
  lang: string,
  localService = true,
): SpeechSynthesisVoice {
  return {
    name,
    lang,
    default: false,
    localService,
    voiceURI: name,
  } as SpeechSynthesisVoice;
}

describe("tts voice picking", () => {
  it("prefers Samantha Enhanced over compact Ava", () => {
    const voices = [
      fakeVoice("Ava", "en-US"),
      fakeVoice("Samantha (Enhanced)", "en-US"),
      fakeVoice("Victoria", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[0], voices);
    expect(picked?.name).toBe("Samantha (Enhanced)");
  });

  it("prefers Google US English over robotic Eloquence voices", () => {
    const voices = [
      fakeVoice("Albert", "en-US"),
      fakeVoice("Google US English", "en-US", false),
      fakeVoice("Kathy", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[0], voices);
    expect(picked?.name).toBe("Google US English");
  });

  it("falls back to Ava when Samantha missing", () => {
    const voices = [
      fakeVoice("Victoria", "en-US"),
      fakeVoice("Ava", "en-US"),
      fakeVoice("Allison", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[0], voices);
    expect(picked?.name).toBe("Ava");
  });

  it("prefers Daniel Premium for male", () => {
    const voices = [
      fakeVoice("Fred", "en-US"),
      fakeVoice("Daniel (Premium)", "en-GB"),
      fakeVoice("Alex", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[1], voices);
    expect(picked?.name).toBe("Daniel (Premium)");
  });

  it("penalizes Compact voices when a better match exists", () => {
    const voices = [
      fakeVoice("Samantha Compact", "en-US"),
      fakeVoice("Samantha", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[0], voices);
    expect(picked?.name).toBe("Samantha");
  });
});
