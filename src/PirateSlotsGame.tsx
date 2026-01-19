import React, { useMemo, useState } from "react";
import { spinPirateSlots, PirateSymbolId } from "./pirateSlots";
import { useSound } from "./audio/useSound";
import "./PirateSlotsGame.css";

const emoji: Record<PirateSymbolId, string> = {
  PIRATE: "🏴‍☠️",
  CHEST: "🧰",
  COIN: "🪙",
  BAT: "🦇",
  BLUNDERBUSS: "🔫",
  MAP: "🗺️",
  PARROT: "🦜"
};

function BatAnimation() { return <div className="bat-animation" />; }
function CoinDropAnimation() { return <div className="coin-drop-animation" />; }
function BlunderbussShotAnimation() { return <div className="blunderbuss-shot-animation" />; }
function BrumeBg() { return <div className="pirate-brume" />; }
function LanternGlow() { return <div className="lantern-glow" />; }
function FxOverlay({ fx }: { fx: Fx }) {
  return <div className={`fxOverlay fx-${fx.toLowerCase()}`} />;
}

type Fx = "NONE" | "WIN" | "BIGWIN" | "JACKPOT" | "SPIN";

export default function PirateSlotsGame() {
  const sfx = useSound();

  const [credits, setCredits] = useState<number>(1000);
  const [bet, setBet] = useState<number>(20);
  const [reels, setReels] = useState<[
    PirateSymbolId,
    PirateSymbolId,
    PirateSymbolId,
    PirateSymbolId,
    PirateSymbolId
  ]>(["COIN", "BAT", "CHEST", "MAP", "PARROT"]);
  const [lastPayout, setLastPayout] = useState<number>(0);
  const [log, setLog] = useState<any[]>([]);
  const [showBat, setShowBat] = useState(false);
  const [showCoinDrop, setShowCoinDrop] = useState(false);
  const [showShot, setShowShot] = useState(false);
  const [spinAnim, setSpinAnim] = useState(false);
  const [fx, setFx] = useState<Fx>("NONE");

  const canSpin = credits >= bet && bet > 0;
  const totalWon = useMemo(() => log.reduce((s, x) => s + x.payout, 0), [log]);

  function triggerFx(kind: Fx, ms = 700) {
    setFx(kind);
    setTimeout(() => setFx("NONE"), ms);
  }

  async function unlockAudioIfNeeded() {
    if (!sfx.ready) await sfx.unlock();
  }

  async function spin() {
    if (!canSpin) return;
    await unlockAudioIfNeeded();
    sfx.play("click", { gain: 0.7 });
    setCredits((c) => c - bet);
    setSpinAnim(true);
    triggerFx("SPIN", 500);
    sfx.play("spin", { gain: 0.7 });
    sfx.play("reelStop", { delayMs: 220, gain: 0.85, rate: 1.0 });
    sfx.play("reelStop", { delayMs: 360, gain: 0.85, rate: 1.05 });
    sfx.play("reelStop", { delayMs: 520, gain: 0.85, rate: 1.1 });
    const r = spinPirateSlots(bet);
    setTimeout(() => {
      setReels(r.reels);
      setLastPayout(r.payout);
      if (r.payout > 0) setCredits((c) => c + r.payout);
      setLog((prev) => [
        { time: Date.now(), bet, reels: r.reels, payout: r.payout },
        ...prev
      ].slice(0, 30));
      const hasBlunder = r.reels.includes("BLUNDERBUSS");
      const hasBat = r.reels.includes("BAT");
      const hasChest = r.reels.includes("CHEST");
      setShowBat(true);
      setTimeout(() => setShowBat(false), 1200);
      if (hasBat) {
        setShowBat(true);
        sfx.play("bat", { gain: 0.7 });
      }
      if (hasBlunder) {
        setShowShot(true);
        sfx.play("blunderbuss", { gain: 1.0 });
        setTimeout(() => setShowShot(false), 800);
      }
      if (r.payout > 0) {
        setShowCoinDrop(true);
        sfx.play("coins", { gain: 1.0 });
        setTimeout(() => setShowCoinDrop(false), 1200);
        if (r.payout >= bet * 20 || (hasChest && r.payout >= bet * 12)) {
          sfx.play("jackpot", { gain: 1.0 });
          triggerFx("JACKPOT", 1600);
        } else if (r.payout >= bet * 10) {
          sfx.play("bigwin", { gain: 0.95 });
          triggerFx("BIGWIN", 1200);
        } else {
          sfx.play("win", { gain: 0.8 });
          triggerFx("WIN", 800);
        }
      }
      setSpinAnim(false);
    }, 600);
  }

  return (
    <div
      className={`gameRoot fx-${fx.toLowerCase()}`}
      onMouseDown={() => { if (!sfx.ready) sfx.unlock(); }}
      style={{
        padding: 24,
        fontFamily: "system-ui",
        background: "#0a0a1a",
        color: "#ffe082",
        minHeight: "100vh",
        position: "relative"
      }}
    >
      <BrumeBg />
      <LanternGlow />
      <FxOverlay fx={fx} />
      <h1 style={{ fontSize: 38, textShadow: "2px 2px 8px #000" }}>
        🏴‍☠️ Pirate Slots
      </h1>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={sfx.muted} onChange={(e) => sfx.setMuted(e.target.checked)} />
          Muet
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={sfx.volume}
            onChange={(e) => sfx.setVolume(Number(e.target.value))}
          />
        </div>
        {!sfx.ready && <span style={{ opacity: 0.7 }}>(Clique une fois pour activer le son)</span>}
      </div>
      <div style={{ display: "flex", gap: 24, alignItems: "center", marginTop: 16 }}>
        <div style={{ fontSize: 18 }}>
          <div><b>Crédits</b>: {credits}</div>
          <div>
            <b>Mise</b>:{" "}
            <input
              type="number"
              value={bet}
              min={1}
              max={Math.max(1, credits)}
              onChange={(e) => setBet(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
              style={{ width: 90 }}
            />
          </div>
          <div><b>Dernier gain</b>: {lastPayout}</div>
          <div><b>Total gagné</b>: {totalWon}</div>
          <button
            onClick={spin}
            disabled={!canSpin}
            style={{
              marginTop: 12,
              padding: "10px 16px",
              fontSize: 16,
              cursor: canSpin ? "pointer" : "not-allowed",
              background: "#ff9800",
              color: "#222",
              borderRadius: 8,
              border: "none",
              boxShadow: "0 2px 8px #000"
            }}
          >
            SPIN
          </button>
          {!canSpin && <div style={{ marginTop: 8, opacity: 0.7 }}>Pas assez de crédits.</div>}
        </div>
        <div
          style={{
            display: "flex",
            gap: 18,
            padding: 18,
            borderRadius: 14,
            border: "2px solid #ff9800",
            background: "#222",
            fontSize: 64,
            boxShadow: "0 2px 16px #000"
          }}
        >
          {reels.map((s, i) => (
            <span key={i} className={spinAnim ? "card-anim spin" : "card-anim"}>
              {emoji[s]}
            </span>
          ))}
        </div>
      </div>
      <h2 style={{ marginTop: 28 }}>Historique</h2>
      <div style={{ display: "grid", gap: 8 }}>
        {log.map((x) => (
          <div
            key={x.time}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              borderBottom: "1px solid #333",
              paddingBottom: 8
            }}
          >
            <span style={{ width: 86, opacity: 0.7 }}>{new Date(x.time).toLocaleTimeString()}</span>
            <span style={{ width: 80 }}>Mise {x.bet}</span>
            <span style={{ width: 180 }}>
              {x.reels.map((s: PirateSymbolId, i: number) => (
                <span key={i} className="card-anim">{emoji[s]}</span>
              ))}
            </span>
            <span style={{ width: 90 }}><b>+{x.payout}</b></span>
          </div>
        ))}
        {log.length === 0 && <div style={{ opacity: 0.7 }}>Aucun spin pour l'instant.</div>}
      </div>
      {/* FX visuels */}
      {showBat && <BatAnimation />}
      {showCoinDrop && <CoinDropAnimation />}
      {showShot && <BlunderbussShotAnimation />}
    </div>
  );
}
