"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicPet } from "@/lib/pet";
import { PetSprite } from "./PetSprite";

const MOOD_COPY = {
  full: "吃饱啦，去抓词吧",
  hungry: "肚子咕咕叫，喂一口？",
  critical: "明天不喂会倒下！",
  dead: "倒下了… 用 3 份粮复活",
} as const;

export function PetDock() {
  const [pet, setPet] = useState<PublicPet | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/pet");
    if (r.status === 401) {
      setPet(undefined);
      return;
    }
    const d = await r.json();
    setPet(d.pet ?? null);
  }, []);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("focus", onChange);
    window.addEventListener("pet-changed", onChange);
    return () => {
      window.removeEventListener("focus", onChange);
      window.removeEventListener("pet-changed", onChange);
    };
  }, [load]);

  async function post(body: object) {
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/pet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) {
      setMsg(d.error || "没成功，再试一次");
      return;
    }
    setPet(d.pet);
    window.dispatchEvent(new Event("pet-changed"));
  }

  async function setVisible(visible: boolean) {
    setBusy(true);
    const r = await fetch("/api/pet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible }),
    });
    const d = await r.json();
    setBusy(false);
    if (r.ok) {
      setPet(d.pet);
      window.dispatchEvent(new Event("pet-changed"));
    }
  }

  function adopt(species: "cat" | "dog") {
    post({ action: "adopt", species, name: name.trim() || undefined });
  }

  if (pet === undefined) return null;

  if (!pet) {
    return (
      <section className="pet-dock pet-dock-adopt" aria-label="领养宠物">
        <p className="pet-dock-title">领养一个小伙伴</p>
        <p className="pet-dock-copy">学习换粮食，记得喂它哦</p>
        <label className="pet-name-field">
          名字（可空）
          <input
            value={name}
            maxLength={8}
            onChange={(e) => setName(e.target.value)}
            placeholder="小猫 / 小狗"
          />
        </label>
        <div className="pet-adopt-row">
          <button
            type="button"
            disabled={busy}
            className="pet-adopt-btn"
            onClick={() => adopt("cat")}
          >
            <PetSprite species="cat" mood="full" />
            小猫
          </button>
          <button
            type="button"
            disabled={busy}
            className="pet-adopt-btn"
            onClick={() => adopt("dog")}
          >
            <PetSprite species="dog" mood="full" />
            小狗
          </button>
        </div>
        {msg && <p className="pet-msg">{msg}</p>}
      </section>
    );
  }

  if (!pet.visible) {
    return (
      <button
        type="button"
        className="pet-chip"
        onClick={() => setVisible(true)}
        aria-label="显示宠物"
      >
        显示{pet.name}
      </button>
    );
  }

  const primary =
    pet.status === "dead"
      ? {
          label: pet.canRevive ? "复活（3 粮）" : "复活要 3 粮",
          disabled: !pet.canRevive || busy,
          onClick: () => post({ action: "revive" }),
        }
      : pet.fedToday
        ? { label: "今天吃过啦", disabled: true, onClick: () => {} }
        : {
            label: pet.canFeed ? "喂一喂" : "先去学习换粮",
            disabled: !pet.canFeed || busy,
            onClick: () => post({ action: "feed" }),
          };

  return (
    <section className="pet-dock" aria-label={`${pet.name}的小屋`}>
      <PetSprite species={pet.species} mood={pet.mood} />
      <div className="pet-dock-info">
        <p className="pet-dock-title">{pet.name}</p>
        <p className="pet-dock-copy">{MOOD_COPY[pet.mood]}</p>
        <p className="pet-food">粮食 {pet.foodBalance}</p>
        {msg && <p className="pet-msg">{msg}</p>}
        <div className="pet-actions">
          <button
            type="button"
            className="pet-feed-btn"
            disabled={primary.disabled}
            onClick={primary.onClick}
          >
            {primary.label}
          </button>
          <button
            type="button"
            className="pet-hide-btn"
            disabled={busy}
            onClick={() => setVisible(false)}
          >
            收起来
          </button>
        </div>
      </div>
    </section>
  );
}
