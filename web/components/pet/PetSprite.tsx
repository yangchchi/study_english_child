import type { PetMood, PetSpecies } from "@/lib/pet";

export function PetSprite({
  species,
  mood,
}: {
  species: PetSpecies;
  mood: PetMood;
}) {
  return (
    <div
      className={`pet-sprite pet-${species} pet-${mood}`}
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
    </div>
  );
}
