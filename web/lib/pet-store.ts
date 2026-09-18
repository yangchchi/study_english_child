import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  applyFeed,
  applyRevive,
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
  foodBalance: number;
  lastFedDateKey: string | null;
  foodSettledAt: Date;
  foodEarnedToday: number;
  foodEarnedDateKey: string | null;
  status: string;
  visible: boolean;
  adoptedAt: Date;
};

async function persistSettlement(
  pet: PetRow,
  now: Date,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<PetRow> {
  const settled = settleFoodConsumption(pet.foodBalance, pet.foodSettledAt, now);
  const status =
    settled.foodBalance <= 0 ? "dead" : pet.status === "dead" ? "dead" : "alive";
  const unchanged =
    settled.foodBalance === pet.foodBalance &&
    settled.lastSettledAt.getTime() === pet.foodSettledAt.getTime() &&
    status === pet.status;
  if (unchanged) return pet;
  return db.pet.update({
    where: { id: pet.id },
    data: {
      foodBalance: settled.foodBalance,
      foodSettledAt: settled.lastSettledAt,
      status,
    },
  });
}

function toPublic(pet: PetRow, now: Date): PublicPet {
  const todayKey = dateKey(now);
  const view = evaluatePet({
    status: pet.status === "dead" ? "dead" : "alive",
    foodBalance: pet.foodBalance,
    lastFedDateKey: pet.lastFedDateKey,
    todayKey,
  });
  const earned = rollFoodEarnedToday({
    foodEarnedToday: pet.foodEarnedToday,
    foodEarnedDateKey: pet.foodEarnedDateKey,
    todayKey,
    amount: 0,
  });
  return {
    id: pet.id,
    species: pet.species === "dog" ? "dog" : "cat",
    name: pet.name,
    foodBalance: pet.foodBalance,
    foodEarnedToday: earned.foodEarnedToday,
    visible: pet.visible,
    status: view.status,
    mood: view.mood,
    daysUnfed: view.daysUnfed,
    fedToday: view.fedToday,
    canFeed: view.status === "alive" && pet.foodBalance >= FEED_COST && !view.fedToday,
    canRevive: view.status === "dead" && pet.foodBalance >= REVIVE_COST,
  };
}

export async function getSettledPet(childId: string, now = new Date()) {
  const pet = await prisma.pet.findUnique({ where: { childId } });
  if (!pet) return null;
  const row = await persistSettlement(pet, now);
  return toPublic(row, now);
}

export async function getFoodStats(childId: string, now = new Date()) {
  const pet = await getSettledPet(childId, now);
  return {
    foodBalance: pet?.foodBalance ?? 0,
    foodEarnedToday: pet?.foodEarnedToday ?? 0,
  };
}

export async function adoptPet(
  childId: string,
  species: PetSpecies,
  name?: string,
) {
  const existing = await prisma.pet.findUnique({ where: { childId } });
  if (existing) return { ok: false as const, reason: "exists" as const };
  const trimmed = name?.trim() ?? "";
  const now = new Date();
  const pet = await prisma.pet.create({
    data: {
      childId,
      species,
      name: trimmed || defaultPetName(species),
      foodSettledAt: now,
    },
  });
  return { ok: true as const, pet: toPublic(pet, now) };
}

export async function feedPet(childId: string, now = new Date()) {
  const pet = await prisma.pet.findUnique({ where: { childId } });
  if (!pet) return { ok: false as const, reason: "missing" as const };
  const row = await persistSettlement(pet, now);
  const result = applyFeed(
    {
      status: row.status === "dead" ? "dead" : "alive",
      foodBalance: row.foodBalance,
      lastFedDateKey: row.lastFedDateKey,
    },
    dateKey(now),
  );
  if (!result.ok) return result;
  const updated = await prisma.pet.update({
    where: { id: row.id },
    data: {
      foodBalance: result.foodBalance,
      lastFedDateKey: result.lastFedDateKey,
      status: result.foodBalance <= 0 ? "dead" : "alive",
    },
  });
  return {
    ok: true as const,
    alreadyFed: result.alreadyFed,
    pet: toPublic(updated, now),
  };
}

export async function revivePet(childId: string, now = new Date()) {
  const pet = await prisma.pet.findUnique({ where: { childId } });
  if (!pet) return { ok: false as const, reason: "missing" as const };
  const row = await persistSettlement(pet, now);
  const result = applyRevive(
    {
      status: row.status === "dead" || row.foodBalance <= 0 ? "dead" : "alive",
      foodBalance: row.foodBalance,
      lastFedDateKey: row.lastFedDateKey,
    },
    dateKey(now),
  );
  if (!result.ok) return result;
  const updated = await prisma.pet.update({
    where: { id: row.id },
    data: {
      status: result.status,
      foodBalance: result.foodBalance,
      lastFedDateKey: result.lastFedDateKey,
      foodSettledAt: now,
    },
  });
  return { ok: true as const, pet: toPublic(updated, now) };
}

export async function setPetVisible(childId: string, visible: boolean, now = new Date()) {
  const pet = await prisma.pet.findUnique({ where: { childId } });
  if (!pet) return { ok: false as const, reason: "missing" as const };
  const row = await persistSettlement(pet, now);
  const updated = await prisma.pet.update({
    where: { id: row.id },
    data: { visible },
  });
  return { ok: true as const, pet: { ...toPublic(updated, now), visible } };
}

export async function awardFood(
  childId: string,
  amount: number,
  db: Prisma.TransactionClient | typeof prisma = prisma,
  now = new Date(),
) {
  if (amount <= 0) return 0;
  const pet = await db.pet.findUnique({ where: { childId } });
  if (!pet) return 0;
  const todayKey = dateKey(now);
  const earned = rollFoodEarnedToday({
    foodEarnedToday: pet.foodEarnedToday,
    foodEarnedDateKey: pet.foodEarnedDateKey,
    todayKey,
    amount,
  });
  await db.pet.update({
    where: { id: pet.id },
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
