import React, { useMemo, useState } from "react";
import { spinPirateSlots, PirateSymbolId, pickWeightedPirate } from "./pirateSlots";
import { useSound } from "./audio/useSound";
import "./PirateSlotsGame.css";

import elephantImg from "./images/elephant.png";
import soldatImg from "./images/soldat.png";
import chauveImg from "./images/chauve.png";
import perroImg from "./images/perro.png";
import gunImg from "./images/gun.png";
import coffreImg from "./images/coffre.png";
import boobaVideo from "./vidéos/booba.mp4";

const symbolImages: Partial<Record<PirateSymbolId | "ELEPHANT" | "SOLDAT", React.ReactNode>> = {
  PIRATE: "🏴‍☠️",
  CHEST: <img src={coffreImg} alt="coffre" style={{height: 40}} />,
  COIN: "🪙",
  BAT: <img src={chauveImg} alt="chauve-souris" style={{height: 40}} />,
  BLUNDERBUSS: <img src={gunImg} alt="pistolet" style={{height: 40}} />,
  MAP: "🗺️",
  PARROT: <img src={perroImg} alt="perroquet" style={{height: 40}} />,
  ELEPHANT: <img src={elephantImg} alt="éléphant" style={{height: 40}} />,
  SOLDAT: <img src={soldatImg} alt="soldat" style={{height: 40}} />
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

// Nouvelle fonction pour générer une grille 5x5 de symboles
function spinGrid(): PirateSymbolId[][] {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => pickWeightedPirate())
  );
}

// Détection de 5 éléphants alignés (ligne, colonne, diagonale)
function hasFiveElephants(grid: PirateSymbolId[][]): boolean {
  // Lignes
  for (let i = 0; i < 5; i++) {
    if (grid[i].every(s => s === "ELEPHANT")) return true;
  }
  // Colonnes
  for (let j = 0; j < 5; j++) {
    if ([0,1,2,3,4].every(i => grid[i][j] === "ELEPHANT")) return true;
  }
  // Diagonale principale
  if ([0,1,2,3,4].every(i => grid[i][i] === "ELEPHANT")) return true;
  // Diagonale secondaire
  if ([0,1,2,3,4].every(i => grid[i][4-i] === "ELEPHANT")) return true;
  return false;
}

export default function PirateSlotsGame() {
  const sfx = useSound();

  const [credits, setCredits] = useState<number>(1000);
  const [bet, setBet] = useState<number>(20);
  const [reels, setReels] = useState<PirateSymbolId[][]>(spinGrid());
  const [lastPayout, setLastPayout] = useState<number>(0);
  const [log, setLog] = useState<any[]>([]);
  const [showBat, setShowBat] = useState(false);
  const [showCoinDrop, setShowCoinDrop] = useState(false);
  const [showShot, setShowShot] = useState(false);
  const [spinAnim, setSpinAnim] = useState(false);
  const [fx, setFx] = useState<Fx>("NONE");
  const [showBooba, setShowBooba] = useState(false);

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
    const grid = spinGrid();
    setTimeout(() => {
      setReels(grid);
      // Pour la démo, on ne calcule pas de gain réel sur la grille 5x5
      setLastPayout(0);
      setLog((prev) => [
        { time: Date.now(), bet, reels: grid, payout: 0 },
        ...prev
      ].slice(0, 30));
      setShowBat(true);
      setTimeout(() => setShowBat(false), 1200);
      setSpinAnim(false);
      // Déclenche la vidéo si 5 éléphants alignés
      if (hasFiveElephants(grid)) setShowBooba(true);
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
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 8,
            padding: 18,
            borderRadius: 14,
            border: "2px solid #ff9800",
            background: "#222",
            fontSize: 48,
            boxShadow: "0 2px 16px #000"
          }}
        >
          {reels.map((row, rowIdx) =>
            row.map((s, colIdx) => (
              <span key={rowIdx + "-" + colIdx} className={spinAnim ? "card-anim spin" : "card-anim"}>
                {symbolImages[s] || s}
              </span>
            ))
          }
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
            <span style={{ width: 220 }}>
              <span style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
                {x.reels.flat().map((s: PirateSymbolId, i: number) => (
                  <span key={i} className="card-anim">{symbolImages[s] || s}</span>
                ))}
              </span>
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
      {/* Overlay vidéo Booba */}
      {showBooba && (
        <div style={{
          position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.85)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column"
        }}>
          <video src={boobaVideo} autoPlay controls style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: 16, boxShadow: "0 4px 32px #000" }} />
          <button onClick={() => setShowBooba(false)} style={{ marginTop: 24, fontSize: 22, padding: "12px 32px", borderRadius: 8, background: "#ff9800", color: "#222", border: "none", cursor: "pointer" }}>Fermer</button>
        </div>
      )}
    </div>
  );
}
