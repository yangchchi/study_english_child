import Image from "next/image";
import type { PetMood, PetSpecies } from "@/lib/pet";
import { PET_MOOD_BADGE } from "@/lib/pet";

const PET_PHOTO: Record<PetSpecies, string> = {
  cat: "/pets/cat.png",
  dog: "/pets/dog.png",
};

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
      <span className="pet-figure">
        <Image
          className="pet-photo"
          src={PET_PHOTO[species]}
          alt=""
          fill
          sizes={size === "sm" ? "48px" : "92px"}
          priority={size === "md"}
          draggable={false}
        />
      </span>
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
