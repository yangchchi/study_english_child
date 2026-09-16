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

/** Inspired by Magic English Buddy encouragement lines. */
export type PetLineContext =
  | "idle"
  | "tap"
  | "feed"
  | "already_fed"
  | "revive"
  | "adopt"
  | "reward";

const PET_LINES: Record<PetMood, Record<PetLineContext, string[]>> = {
  full: {
    idle: ["吃饱啦，去抓词吧！", "我陪你一起抓单词～"],
    tap: ["嘿嘿，我在呢！", "点我干嘛，去学习呀！", "摸摸头～"],
    feed: ["好吃！谢谢你！", "嗯嗯，香喷喷！"],
    already_fed: ["今天吃过啦，囤着明天喂～"],
    revive: ["又见面啦！"],
    adopt: ["以后请多关照！", "我是你的学习小伙伴！"],
    reward: ["又有粮了！真厉害！", "抓住词就有吃的，耶！"],
  },
  hungry: {
    idle: ["肚子咕咕叫，喂一口？", "学习完记得喂我哦"],
    tap: ["我有点饿了…", "摸摸也不能当饭吃呀"],
    feed: ["得救了！好好吃！", "咕咚咕咚…谢谢！"],
    already_fed: ["今天吃过啦"],
    revive: ["醒过来了…还想吃饭"],
    adopt: ["先带我去抓词换粮吧！"],
    reward: ["粮食来啦！快喂我一口～"],
  },
  critical: {
    idle: ["明天不喂会倒下！", "好饿…撑不住了"],
    tap: ["快喂我…拜托了", "我快不行了…"],
    feed: ["终于…活过来了！", "差点就倒了…谢谢！"],
    already_fed: ["今天吃过了，我好多了"],
    revive: ["差一点就见不到你了"],
    adopt: ["请好好照顾我…"],
    reward: ["有粮了！快喂我！"],
  },
  dead: {
    idle: ["倒下了…用 3 份粮复活", "zzz…"],
    tap: ["…还起不来", "需要 3 份粮食…"],
    feed: ["先复活我吧…"],
    already_fed: ["先复活我吧…"],
    revive: ["我回来啦！再也不饿肚子了！", "哇，又见面了！"],
    adopt: ["请照顾好我…"],
    reward: ["有粮了…快复活我！"],
  },
};

export const PET_MOOD_BADGE: Record<PetMood, { label: string; color: string }> = {
  full: { label: "饱", color: "#2f9e44" },
  hungry: { label: "饿", color: "#f59f00" },
  critical: { label: "危", color: "#e8590c" },
  dead: { label: "倒", color: "#868e96" },
};

export function getPetLine(
  mood: PetMood,
  context: PetLineContext,
  pick: number = Math.random(),
): string {
  const pool = PET_LINES[mood][context] ?? PET_LINES.hungry.idle;
  const idx = Math.abs(Math.floor(pick * pool.length)) % pool.length;
  return pool[idx];
}

export const PET_FOOD_AWARD_KEY = "pet-food-award";

