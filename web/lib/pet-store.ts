import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  applyFeed,
  applyRevive,
  ADOPT_FOOD_GRANT,
  defaultPetName,
  evaluatePet,
  FEED_COST,
  REVIVE_COST,
  rollFoodEarnedToday,
  settleFoodConsumption,
  type PetSpecies,
  type PublicPet,
} from "./pet";
import { dateKey } from "./srs";

export function isPetSpecies(value: string): value is PetSpecies {
  return value === "cat" || value === "dog";
}

type PetRow = {
  id: string;
  species: string;
  name: string;
  lastFedDateKey: string | null;
  status: string;
  visible: boolean;
  adoptedAt: Date;
};

type FoodWallet = {
  foodBalance: number;
  foodEarnedToday: number;
  foodEarnedDateKey: string | null;
  foodSettledAt: Date;
};

const PET_SELECT = {
  id: true,
  species: true,
  name: true,
  lastFedDateKey: true,
  status: true,
  visible: true,
  adoptedAt: true,
} as const;

async function loadWallet(
  childId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<FoodWallet> {
  const child = await db.childProfile.findUniqueOrThrow({
    where: { id: childId },
    select: {
      foodBalance: true,
      foodEarnedToday: true,
      foodEarnedDateKey: true,
      foodSettledAt: true,
    },
  });
  return child;
}

async function persistPetSettlement(
  childId: string,
  pet: PetRow,
  wallet: FoodWallet,
  now: Date,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<{ pet: PetRow; wallet: FoodWallet }> {
  // Dead pets do not keep draining the user's grain.
  if (pet.status === "dead") {
    return { pet, wallet };
  }

  const settled = settleFoodConsumption(wallet.foodBalance, wallet.foodSettledAt, now);
  const petDead = settled.foodBalance <= 0;
  const walletUnchanged =
    settled.foodBalance === wallet.foodBalance &&
    settled.lastSettledAt.getTime() === wallet.foodSettledAt.getTime();
  const petUnchanged = !petDead;

  if (walletUnchanged && petUnchanged) {
    return { pet, wallet };
  }

  const nextWallet = await db.childProfile.update({
    where: { id: childId },
    data: {
      foodBalance: settled.foodBalance,
      foodSettledAt: settled.lastSettledAt,
    },
    select: {
      foodBalance: true,
      foodEarnedToday: true,
      foodEarnedDateKey: true,
      foodSettledAt: true,
    },
  });

  let nextPet = pet;
  if (petDead && pet.status !== "dead") {
    nextPet = await db.pet.update({
      where: { id: pet.id },
      data: { status: "dead" },
      select: PET_SELECT,
    });
  }

  return { pet: nextPet, wallet: nextWallet };
}

function toPublic(pet: PetRow, wallet: FoodWallet, now: Date): PublicPet {
  const todayKey = dateKey(now);
  const view = evaluatePet({
    status: pet.status === "dead" ? "dead" : "alive",
    foodBalance: wallet.foodBalance,
    lastFedDateKey: pet.lastFedDateKey,
    todayKey,
  });
  const earned = rollFoodEarnedToday({
    foodEarnedToday: wallet.foodEarnedToday,
    foodEarnedDateKey: wallet.foodEarnedDateKey,
    todayKey,
    amount: 0,
  });
  return {
    id: pet.id,
    species: pet.species === "dog" ? "dog" : "cat",
    name: pet.name,
    foodBalance: wallet.foodBalance,
    foodEarnedToday: earned.foodEarnedToday,
    visible: pet.visible,
    status: view.status,
    mood: view.mood,
    daysUnfed: view.daysUnfed,
    fedToday: view.fedToday,
    canFeed: view.status === "alive" && wallet.foodBalance >= FEED_COST && !view.fedToday,
    canRevive: view.status === "dead" && wallet.foodBalance >= REVIVE_COST,
  };
}

export async function getSettledPet(childId: string, now = new Date()) {
  const pet = await prisma.pet.findUnique({ where: { childId }, select: PET_SELECT });
  if (!pet) return null;
  const wallet = await loadWallet(childId);
  const settled = await persistPetSettlement(childId, pet, wallet, now);
  return toPublic(settled.pet, settled.wallet, now);
}

export async function getFoodStats(childId: string, now = new Date()) {
  // Settle pet drain first so the header matches the pet dock.
  await getSettledPet(childId, now);
  const wallet = await loadWallet(childId);
  const earned = rollFoodEarnedToday({
    foodEarnedToday: wallet.foodEarnedToday,
    foodEarnedDateKey: wallet.foodEarnedDateKey,
    todayKey: dateKey(now),
    amount: 0,
  });
  return {
    foodBalance: wallet.foodBalance,
    foodEarnedToday: earned.foodEarnedToday,
  };
}

export async function adoptPet(
  childId: string,
  species: PetSpecies,
  name?: string,
) {
  const existing = await prisma.pet.findUnique({
    where: { childId },
    select: { id: true },
  });
  if (existing) return { ok: false as const, reason: "exists" as const };
  const trimmed = name?.trim() ?? "";
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const wallet = await loadWallet(childId, tx);
    // Ensure starter grain sits on the user wallet (not on the pet).
    const nextBalance =
      wallet.foodBalance > 0 ? wallet.foodBalance : ADOPT_FOOD_GRANT;
    const nextWallet = await tx.childProfile.update({
      where: { id: childId },
      data: {
        foodBalance: nextBalance,
        foodSettledAt: now,
      },
      select: {
        foodBalance: true,
        foodEarnedToday: true,
        foodEarnedDateKey: true,
        foodSettledAt: true,
      },
    });
    const pet = await tx.pet.create({
      data: {
        childId,
        species,
        name: trimmed || defaultPetName(species),
      },
      select: PET_SELECT,
    });
    return { pet, wallet: nextWallet };
  });

  return { ok: true as const, pet: toPublic(result.pet, result.wallet, now) };
}

export async function feedPet(childId: string, now = new Date()) {
  const pet = await prisma.pet.findUnique({ where: { childId }, select: PET_SELECT });
  if (!pet) return { ok: false as const, reason: "missing" as const };
  const wallet = await loadWallet(childId);
  const settled = await persistPetSettlement(childId, pet, wallet, now);
  const result = applyFeed(
    {
      status: settled.pet.status === "dead" ? "dead" : "alive",
      foodBalance: settled.wallet.foodBalance,
      lastFedDateKey: settled.pet.lastFedDateKey,
    },
    dateKey(now),
  );
  if (!result.ok) return result;

  const updated = await prisma.$transaction(async (tx) => {
    const nextWallet = await tx.childProfile.update({
      where: { id: childId },
      data: { foodBalance: result.foodBalance },
      select: {
        foodBalance: true,
        foodEarnedToday: true,
        foodEarnedDateKey: true,
        foodSettledAt: true,
      },
    });
    const nextPet = await tx.pet.update({
      where: { id: settled.pet.id },
      data: {
        lastFedDateKey: result.lastFedDateKey,
        status: result.foodBalance <= 0 ? "dead" : "alive",
      },
      select: PET_SELECT,
    });
    return { pet: nextPet, wallet: nextWallet };
  });

  return {
    ok: true as const,
    alreadyFed: result.alreadyFed,
    pet: toPublic(updated.pet, updated.wallet, now),
  };
}

export async function revivePet(childId: string, now = new Date()) {
  const pet = await prisma.pet.findUnique({ where: { childId }, select: PET_SELECT });
  if (!pet) return { ok: false as const, reason: "missing" as const };
  const wallet = await loadWallet(childId);
  const settled = await persistPetSettlement(childId, pet, wallet, now);
  const result = applyRevive(
    {
      status:
        settled.pet.status === "dead" || settled.wallet.foodBalance <= 0
          ? "dead"
          : "alive",
      foodBalance: settled.wallet.foodBalance,
      lastFedDateKey: settled.pet.lastFedDateKey,
    },
    dateKey(now),
  );
  if (!result.ok) return result;

  const updated = await prisma.$transaction(async (tx) => {
    const nextWallet = await tx.childProfile.update({
      where: { id: childId },
      data: {
        foodBalance: result.foodBalance,
        foodSettledAt: now,
      },
      select: {
        foodBalance: true,
        foodEarnedToday: true,
        foodEarnedDateKey: true,
        foodSettledAt: true,
      },
    });
    const nextPet = await tx.pet.update({
      where: { id: settled.pet.id },
      data: {
        status: result.status,
        lastFedDateKey: result.lastFedDateKey,
      },
      select: PET_SELECT,
    });
    return { pet: nextPet, wallet: nextWallet };
  });

  return { ok: true as const, pet: toPublic(updated.pet, updated.wallet, now) };
}

export async function setPetVisible(childId: string, visible: boolean, now = new Date()) {
  const pet = await prisma.pet.findUnique({ where: { childId }, select: PET_SELECT });
  if (!pet) return { ok: false as const, reason: "missing" as const };
  const wallet = await loadWallet(childId);
  const settled = await persistPetSettlement(childId, pet, wallet, now);
  const updated = await prisma.pet.update({
    where: { id: settled.pet.id },
    data: { visible },
    select: PET_SELECT,
  });
  return { ok: true as const, pet: { ...toPublic(updated, settled.wallet, now), visible } };
}

export async function awardFood(
  childId: string,
  amount: number,
  db: Prisma.TransactionClient | typeof prisma = prisma,
  now = new Date(),
) {
  if (amount <= 0) return 0;
  const wallet = await loadWallet(childId, db);
  const todayKey = dateKey(now);
  const earned = rollFoodEarnedToday({
    foodEarnedToday: wallet.foodEarnedToday,
    foodEarnedDateKey: wallet.foodEarnedDateKey,
    todayKey,
    amount,
  });
  await db.childProfile.update({
    where: { id: childId },
    data: {
      foodBalance: { increment: amount },
      foodEarnedToday: earned.foodEarnedToday,
      foodEarnedDateKey: earned.foodEarnedDateKey,
    },
  });
  return amount;
}

/** @deprecated use awardFood with explicit amount */
export async function awardSessionFood(
  childId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return awardFood(childId, 1, db);
}
