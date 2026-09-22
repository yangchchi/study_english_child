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
  it("prefers earlier female hint (Allison over Susan)", () => {
    const voices = [
      fakeVoice("Susan", "en-US"),
      fakeVoice("Allison", "en-US"),
      fakeVoice("Samantha", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[0], voices);
    expect(picked?.name).toBe("Allison");
  });

  it("prefers Samantha Enhanced over Samantha Compact", () => {
    const voices = [
      fakeVoice("Samantha Compact", "en-US"),
      fakeVoice("Samantha (Enhanced)", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[0], voices);
    expect(picked?.name).toBe("Samantha (Enhanced)");
  });

  it("prefers earlier male hint (Aaron over Alex)", () => {
    const voices = [
      fakeVoice("Alex", "en-US"),
      fakeVoice("Aaron", "en-US"),
      fakeVoice("Daniel", "en-GB"),
    ];
    const picked = pickVoice(VOICE_PRESETS[1], voices);
    expect(picked?.name).toBe("Aaron");
  });

  it("prefers Microsoft Guy over Fred for male", () => {
    const voices = [
      fakeVoice("Fred", "en-US"),
      fakeVoice("Microsoft Guy", "en-US"),
    ];
    const picked = pickVoice(VOICE_PRESETS[1], voices);
    expect(picked?.name).toBe("Microsoft Guy");
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
