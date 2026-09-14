import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  applyFeed,
  applyRevive,
  defaultPetName,
  evaluatePet,
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
  status: string;
  visible: boolean;
  adoptedAt: Date;
};

function toPublic(pet: PetRow, now: Date): PublicPet {
  const todayKey = dateKey(now);
  const view = evaluatePet({
    status: pet.status === "dead" ? "dead" : "alive",
    lastFedDateKey: pet.lastFedDateKey,
    adoptedDateKey: dateKey(pet.adoptedAt),
    todayKey,
  });
  return {
    id: pet.id,
    species: pet.species === "dog" ? "dog" : "cat",
    name: pet.name,
    foodBalance: pet.foodBalance,
    visible: pet.visible,
    status: view.status,
    mood: view.mood,
    daysUnfed: view.daysUnfed,
    fedToday: view.fedToday,
    canFeed: view.status === "alive" && pet.foodBalance >= 1 && !view.fedToday,
    canRevive: view.status === "dead" && pet.foodBalance >= 3,
  };
}

export async function getSettledPet(childId: string, now = new Date()) {
  const pet = await prisma.pet.findUnique({ where: { childId } });
  if (!pet) return null;
  const publicPet = toPublic(pet, now);
  if (publicPet.status === "dead" && pet.status !== "dead") {
    await prisma.pet.update({ where: { id: pet.id }, data: { status: "dead" } });
  }
  return publicPet;
}

export async function adoptPet(
  childId: string,
  species: PetSpecies,
  name?: string,
) {
  const existing = await prisma.pet.findUnique({ where: { childId } });
  if (existing) return { ok: false as const, reason: "exists" as const };
  const trimmed = name?.trim() ?? "";
  const pet = await prisma.pet.create({
    data: {
      childId,
      species,
      name: trimmed || defaultPetName(species),
    },
  });
  return { ok: true as const, pet: toPublic(pet, new Date()) };
}

export async function feedPet(childId: string, now = new Date()) {
  const pet = await prisma.pet.findUnique({ where: { childId } });
  if (!pet) return { ok: false as const, reason: "missing" as const };
  const settled = toPublic(pet, now);
  if (settled.status === "dead" && pet.status !== "dead") {
    await prisma.pet.update({ where: { id: pet.id }, data: { status: "dead" } });
  }
  const result = applyFeed(
    {
      status: settled.status,
      foodBalance: pet.foodBalance,
      lastFedDateKey: pet.lastFedDateKey,
    },
    dateKey(now),
  );
  if (!result.ok) return result;
  const updated = await prisma.pet.update({
    where: { id: pet.id },
    data: {
      foodBalance: result.foodBalance,
      lastFedDateKey: result.lastFedDateKey,
      status: "alive",
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
  const settled = toPublic(pet, now);
  if (settled.status === "dead" && pet.status !== "dead") {
    await prisma.pet.update({ where: { id: pet.id }, data: { status: "dead" } });
  }
  const result = applyRevive(
    {
      status: settled.status,
      foodBalance: pet.foodBalance,
      lastFedDateKey: pet.lastFedDateKey,
    },
    dateKey(now),
  );
  if (!result.ok) return result;
  const updated = await prisma.pet.update({
    where: { id: pet.id },
    data: {
      status: result.status,
      foodBalance: result.foodBalance,
      lastFedDateKey: result.lastFedDateKey,
    },
  });
  return { ok: true as const, pet: toPublic(updated, now) };
}

export async function setPetVisible(childId: string, visible: boolean, now = new Date()) {
  const pet = await prisma.pet.findUnique({ where: { childId } });
  if (!pet) return { ok: false as const, reason: "missing" as const };
  const updated = await prisma.pet.update({
    where: { id: pet.id },
    data: { visible },
  });
  const settled = toPublic(updated, now);
  if (settled.status === "dead" && updated.status !== "dead") {
    await prisma.pet.update({ where: { id: pet.id }, data: { status: "dead" } });
  }
  return { ok: true as const, pet: { ...settled, visible } };
}

export async function awardSessionFood(
  childId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const pet = await db.pet.findUnique({ where: { childId } });
  if (!pet) return 0;
  await db.pet.update({
    where: { id: pet.id },
    data: { foodBalance: { increment: 1 } },
  });
  return 1;
}
