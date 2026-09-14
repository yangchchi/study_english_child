"use client";

import { useEffect, useState } from "react";
import type { PublicPet } from "@/lib/pet";

export function PetVisibleToggle() {
  const [pet, setPet] = useState<PublicPet | null>(null);

  async function load() {
    const r = await fetch("/api/pet");
    if (!r.ok) return;
    const d = await r.json();
    setPet(d.pet ?? null);
  }

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("pet-changed", onChange);
    return () => window.removeEventListener("pet-changed", onChange);
  }, []);

  if (!pet) return null;

  const current = pet;

  async function toggle() {
    const r = await fetch("/api/pet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !current.visible }),
    });
    const d = await r.json();
    if (r.ok) {
      setPet(d.pet);
      window.dispatchEvent(new Event("pet-changed"));
    }
  }

  return (
    <section className="mb-4 rounded-3xl bg-white/85 p-5 shadow-sm">
      <h2 className="font-bold text-slate-800">电子宠物</h2>
      <p className="mt-1 text-sm text-slate-500">
        {current.name} · 粮食 {current.foodBalance}
        {current.status === "dead" ? " · 已倒下" : ""}
      </p>
      <button
        type="button"
        onClick={toggle}
        className="mt-3 w-full min-h-11 rounded-2xl bg-sky-100 py-3 font-bold text-sky-800"
      >
        {current.visible ? "隐藏宠物" : "显示宠物"}
      </button>
    </section>
  );
}
