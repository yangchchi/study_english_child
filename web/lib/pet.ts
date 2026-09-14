export type PetSpecies = "cat" | "dog";
export type PetLife = "alive" | "dead";
export type PetMood = "full" | "hungry" | "critical" | "dead";

export type PetSnapshot = {
  status: PetLife;
  foodBalance: number;
  lastFedDateKey: string | null;
};

export type PetEvalInput = {
  status: PetLife;
  lastFedDateKey: string | null;
  adoptedDateKey: string;
  todayKey: string;
};

export type PetView = {
  status: PetLife;
  mood: PetMood;
  daysUnfed: number;
  fedToday: boolean;
};

export type PublicPet = {
  id: string;
  species: PetSpecies;
  name: string;
  foodBalance: number;
  visible: boolean;
  status: PetLife;
  mood: PetMood;
  daysUnfed: number;
  fedToday: boolean;
  canFeed: boolean;
  canRevive: boolean;
};

const MS_PER_DAY = 86_400_000;

export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const from = parseDateKeyUtc(fromKey);
  const to = parseDateKeyUtc(toKey);
  return Math.round((to - from) / MS_PER_DAY);
}

function parseDateKeyUtc(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function defaultPetName(species: PetSpecies): string {
  return species === "cat" ? "小猫" : "小狗";
}

export function evaluatePet(input: PetEvalInput): PetView {
  const referenceKey = input.lastFedDateKey ?? input.adoptedDateKey;
  const daysUnfed = daysBetweenKeys(referenceKey, input.todayKey);
  const fedToday = input.lastFedDateKey === input.todayKey;

  if (input.status === "dead" || daysUnfed >= 3) {
    return { status: "dead", mood: "dead", daysUnfed, fedToday: false };
  }

  const mood: PetMood = fedToday ? "full" : daysUnfed >= 2 ? "critical" : "hungry";
  return { status: "alive", mood, daysUnfed, fedToday };
}

export function applyFeed(
  pet: PetSnapshot,
  todayKey: string,
):
  | { ok: true; alreadyFed: boolean; foodBalance: number; lastFedDateKey: string }
  | { ok: false; reason: "dead" | "no_food" } {
  if (pet.status === "dead") return { ok: false, reason: "dead" };
  if (pet.lastFedDateKey === todayKey) {
    return {
      ok: true,
      alreadyFed: true,
      foodBalance: pet.foodBalance,
      lastFedDateKey: todayKey,
    };
  }
  if (pet.foodBalance < 1) return { ok: false, reason: "no_food" };
  return {
    ok: true,
    alreadyFed: false,
    foodBalance: pet.foodBalance - 1,
    lastFedDateKey: todayKey,
  };
}

export function applyRevive(
  pet: PetSnapshot,
  todayKey: string,
):
  | { ok: true; status: "alive"; foodBalance: number; lastFedDateKey: string }
  | { ok: false; reason: "not_dead" | "no_food" } {
  if (pet.status !== "dead") return { ok: false, reason: "not_dead" };
  if (pet.foodBalance < 3) return { ok: false, reason: "no_food" };
  return {
    ok: true,
    status: "alive",
    foodBalance: pet.foodBalance - 3,
    lastFedDateKey: todayKey,
  };
}
