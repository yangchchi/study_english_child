import type { PetMood, PetSpecies } from "@/lib/pet";
import { PET_MOOD_BADGE } from "@/lib/pet";

export function PetSprite({
  species,
  mood,
  celebrate = false,
  size = "md",
}: {
  species: PetSpecies;
  mood: PetMood;
  celebrate?: boolean;
  size?: "sm" | "md";
}) {
  const badge = PET_MOOD_BADGE[mood];
  return (
    <div
      className={`pet-sprite pet-${species} pet-${mood} pet-size-${size}${
        celebrate ? " pet-celebrate" : ""
      }`}
      data-species={species}
      aria-hidden
    >
      <span className="pet-ear pet-ear-l" />
      <span className="pet-ear pet-ear-r" />
      <span className="pet-face">
        <span className="pet-eye pet-eye-l" />
        <span className="pet-eye pet-eye-r" />
        <span className="pet-nose" />
        <span className="pet-mouth" />
      </span>
      <span className="pet-body" />
      <span className="pet-mood-badge" style={{ background: badge.color }}>
        {badge.label}
      </span>
      {celebrate && (
        <span className="pet-burst" aria-hidden>
          <i /><i /><i /><i /><i /><i />
        </span>
      )}
    </div>
  );
}
