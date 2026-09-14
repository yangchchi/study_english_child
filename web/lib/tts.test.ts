import { describe, expect, it } from "vitest";
import { pickVoice, VOICE_PRESETS } from "./tts";

function fakeVoice(name: string, lang: string): SpeechSynthesisVoice {
  return {
    name,
    lang,
    default: false,
    localService: true,
    voiceURI: name,
  } as SpeechSynthesisVoice;
}

describe("tts voice picking", () => {
  it("prefers Ava over Victoria for female", () => {
    const voices = [
      fakeVoice("Victoria", "en-US"),
      fakeVoice("Ava", "en-US"),
      fakeVoice("Martha", "en-GB"),
      fakeVoice("Tessa", "en-ZA"),
    ];
    const picked = pickVoice(VOICE_PRESETS[0], voices);
    expect(picked?.name).toBe("Ava");
  });

  it("falls back to Allison when Ava missing", () => {
    const voices = [
      fakeVoice("Victoria", "en-US"),
      fakeVoice("Allison", "en-US"),
      fakeVoice("Susan", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[0], voices);
    expect(picked?.name).toBe("Allison");
  });

  it("prefers Daniel for male", () => {
    const voices = [
      fakeVoice("Fred", "en-US"),
      fakeVoice("Daniel", "en-GB"),
      fakeVoice("Alex", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[1], voices);
    expect(picked?.name).toBe("Daniel");
  });
});
