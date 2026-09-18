"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPetLine,
  PET_FOOD_AWARD_KEY,
  type PublicPet,
} from "@/lib/pet";
import { PetSprite } from "./PetSprite";

export function PetDock() {
  const [pet, setPet] = useState<PublicPet | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [bubble, setBubble] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [toast, setToast] = useState("");

  const showBubble = useCallback((text: string) => {
    setBubble(text);
  }, []);

  const pulseCelebrate = useCallback(() => {
    setCelebrate(true);
    window.setTimeout(() => setCelebrate(false), 900);
  }, []);

  const load = useCallback(async () => {
    const r = await fetch("/api/pet");
    if (r.status === 401) {
      setPet(undefined);
      return;
    }
    const d = await r.json();
    const next = (d.pet ?? null) as PublicPet | null;
    setPet(next);

    const awardRaw = sessionStorage.getItem(PET_FOOD_AWARD_KEY);
    if (awardRaw && next) {
      sessionStorage.removeItem(PET_FOOD_AWARD_KEY);
      const n = Number(awardRaw) || 1;
      setToast(`粮食 +${n}`);
      showBubble(getPetLine(next.mood, "reward"));
      pulseCelebrate();
      window.setTimeout(() => setToast(""), 2200);
      return;
    }
    if (next) {
      setBubble((prev) => prev || getPetLine(next.mood, "idle"));
    }
  }, [pulseCelebrate, showBubble]);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("focus", onChange);
    window.addEventListener("pet-changed", onChange);
    return () => {
      window.removeEventListener("focus", onChange);
      window.removeEventListener("pet-changed", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial + event-driven refresh
  }, []);

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
      return null;
    }
    setPet(d.pet);
    window.dispatchEvent(new Event("pet-changed"));
    return d as { pet: PublicPet; alreadyFed?: boolean };
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
      setExpanded(false);
      window.dispatchEvent(new Event("pet-changed"));
    }
  }

  async function adopt(species: "cat" | "dog") {
    const d = await post({
      action: "adopt",
      species,
      name: name.trim() || undefined,
    });
    if (!d) return;
    showBubble(getPetLine(d.pet.mood, "adopt"));
    pulseCelebrate();
    setExpanded(true);
  }

  async function feed() {
    const d = await post({ action: "feed" });
    if (!d) return;
    if (d.alreadyFed) {
      showBubble(getPetLine(d.pet.mood, "already_fed"));
      return;
    }
    showBubble(getPetLine(d.pet.mood, "feed"));
    pulseCelebrate();
  }

  async function revive() {
    const d = await post({ action: "revive" });
    if (!d) return;
    showBubble(getPetLine(d.pet.mood, "revive"));
    pulseCelebrate();
  }

  function onAvatarTap() {
    if (!pet) return;
    showBubble(getPetLine(pet.mood, "tap"));
    setExpanded((v) => !v);
  }

  if (pet === undefined) return null;

  return (
    <>
      {toast && <div className="pet-toast bounce-in">{toast}</div>}

      {!pet ? (
        <section className="pet-dock pet-dock-adopt" aria-label="领养宠物">
          <p className="pet-dock-title">领养一个小伙伴</p>
          <p className="pet-dock-copy">学完今日或攒粮就能换粮食</p>
          <label className="pet-name-field">
            给它起个名（可空）
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
      ) : !pet.visible ? (
        <button
          type="button"
          className="pet-chip"
          onClick={() => setVisible(true)}
          aria-label="显示宠物"
        >
          <PetSprite species={pet.species} mood={pet.mood} size="sm" />
          <span>显示{pet.name}</span>
        </button>
      ) : (
        <section
          className={`pet-float${expanded ? " pet-float-open" : ""}`}
          aria-label={`${pet.name}的小屋`}
        >
          {bubble && (
            <div className="pet-bubble bounce-in" role="status">
              {bubble}
              <span className="pet-bubble-arrow" />
            </div>
          )}

          <div className="pet-float-row">
            <button
              type="button"
              className="pet-avatar-btn"
              onClick={onAvatarTap}
              aria-expanded={expanded}
              aria-label={`${pet.name}，点击互动`}
            >
              <PetSprite
                species={pet.species}
                mood={pet.mood}
                celebrate={celebrate}
              />
              <span className="pet-food-pill">粮 {pet.foodBalance}</span>
            </button>

            {expanded && (
              <div className="pet-panel bounce-in">
                <p className="pet-dock-title">{pet.name}</p>
                {msg && <p className="pet-msg">{msg}</p>}
                <div className="pet-actions">
                  {pet.status === "dead" ? (
                    <button
                      type="button"
                      className="pet-feed-btn"
                      disabled={!pet.canRevive || busy}
                      onClick={revive}
                    >
                      {pet.canRevive ? "复活（20 粮）" : "复活要 20 粮"}
                    </button>
                  ) : pet.fedToday ? (
                    <button type="button" className="pet-feed-btn" disabled>
                      今天吃过啦
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="pet-feed-btn"
                      disabled={!pet.canFeed || busy}
                      onClick={feed}
                    >
                      {pet.canFeed ? "喂一喂（20）" : "先去学习换粮"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="pet-hide-btn"
                    disabled={busy}
                    onClick={() => setVisible(false)}
                  >
                    收起
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
