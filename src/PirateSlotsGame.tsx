import React, { useMemo, useState } from "react";
import { pickWeightedPirate, PirateSymbolId } from "./pirateSlots";
import { useSound } from "./audio/useSound";
import "./PirateSlotsGame.css";

// Images
import elephantImg from "./images/elephant.png";
import soldatImg from "./images/soldat.png";
import chauveImg from "./images/chauve.png";
import perroImg from "./images/perro.png";
import gunImg from "./images/gun.png";
import coffreImg from "./images/coffre.png";

// IMPORTANT: évite les accents dans les dossiers -> ./videos/booba.mp4
import boobaVideo from "./videos/booba.mp4";

type ExtraSymbolId = "ELEPHANT" | "SOLDAT";
type SlotSymbolId = PirateSymbolId | ExtraSymbolId;

type Fx = "NONE" | "WIN" | "BIGWIN" | "JACKPOT" | "SPIN";

const symbolImages: Record<SlotSymbolId, React.ReactNode> = {
    PIRATE: "🏴‍☠️",
    CHEST: <img src={coffreImg} alt="coffre" style={{ height: 40 }} />,
    COIN: "🪙",
    BAT: <img src={chauveImg} alt="chauve-souris" style={{ height: 40 }} />,
    BLUNDERBUSS: <img src={gunImg} alt="pistolet pirate" style={{ height: 40 }} />,
    MAP: "🗺️",
    PARROT: <img src={perroImg} alt="perroquet pirate" style={{ height: 40 }} />,
    ELEPHANT: <img src={elephantImg} alt="éléphant" style={{ height: 40 }} />,
    SOLDAT: <img src={soldatImg} alt="soldat spartiate" style={{ height: 40 }} />
};

// FX placeholders (CSS)
function BatAnimation() { return <div className="bat-animation" />; }
function CoinDropAnimation() { return <div className="coin-drop-animation" />; }
function BlunderbussShotAnimation() { return <div className="blunderbuss-shot-animation" />; }
function BrumeBg() { return <div className="pirate-brume" />; }
function LanternGlow() { return <div className="lantern-glow" />; }
function FxOverlay({ fx }: { fx: Fx }) {
    return <div className={`fxOverlay fx-${fx.toLowerCase()}`} />;
}

// ---- Grille 5x5 ----
function spinGrid(): SlotSymbolId[][] {
    // Ici tu peux décider si ELEPHANT/SOLDAT font partie du tirage :
    // -> soit on les met en rareté à part, soit on ne les met jamais.
    // Pour l’instant, on les met en ultra rare (ex: 1/250 chacune).
    const pick = (): SlotSymbolId => {
        const r = Math.random();
        if (r < 0.004) return "ELEPHANT"; // ~0.4%
        if (r < 0.008) return "SOLDAT";  // ~0.4%
        return pickWeightedPirate();      // le reste via ton weighted pirate
    };

    return Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => pick())
    );
}

function hasFiveElephants(grid: SlotSymbolId[][]): boolean {
    // Lignes
    for (let i = 0; i < 5; i++) {
        if (grid[i].every((s) => s === "ELEPHANT")) return true;
    }
    // Colonnes
    for (let j = 0; j < 5; j++) {
        if ([0, 1, 2, 3, 4].every((i) => grid[i][j] === "ELEPHANT")) return true;
    }
    // Diagonale principale
    if ([0, 1, 2, 3, 4].every((i) => grid[i][i] === "ELEPHANT")) return true;
    // Diagonale secondaire
    if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i] === "ELEPHANT")) return true;

    return false;
}

export default function PirateSlotsGame() {
    const sfx = useSound();

    const [credits, setCredits] = useState<number>(1000);
    const [bet, setBet] = useState<number>(20);
    const [reels, setReels] = useState<SlotSymbolId[][]>(() => spinGrid());
    const [lastPayout, setLastPayout] = useState<number>(0);
    const [log, setLog] = useState<Array<{ time: number; bet: number; reels: SlotSymbolId[][]; payout: number }>>([]);
    const [showBat, setShowBat] = useState(false);
    const [showCoinDrop, setShowCoinDrop] = useState(false);
    const [showShot, setShowShot] = useState(false);
    const [spinAnim, setSpinAnim] = useState(false);
    const [fx, setFx] = useState<Fx>("NONE");
    const [showBooba, setShowBooba] = useState(false);

    const canSpin = credits >= bet && bet > 0;
    const totalWon = useMemo(() => log.reduce((sum, x) => sum + x.payout, 0), [log]);

    function triggerFx(kind: Fx, ms = 700) {
        setFx(kind);
        window.setTimeout(() => setFx("NONE"), ms);
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

        // Sons
        sfx.play("spin", { gain: 0.7 });
        sfx.play("reelStop", { delayMs: 220, gain: 0.85, rate: 1.0 });
        sfx.play("reelStop", { delayMs: 360, gain: 0.85, rate: 1.05 });
        sfx.play("reelStop", { delayMs: 520, gain: 0.85, rate: 1.1 });

        const grid = spinGrid();

        window.setTimeout(() => {
            setReels(grid);

            // Payout basique: juste pour que ça vive (tu peux remplacer par ton vrai calc)
            let payout = 0;
            const jackpotElephant = hasFiveElephants(grid);

            if (jackpotElephant) {
                payout = bet * 50;
                triggerFx("JACKPOT", 1400);
            } else {
                // petit “win” random si il y a au moins 5 COIN dans la grille
                const flat = grid.flat();
                const coinCount = flat.filter((s) => s === "COIN").length;
                if (coinCount >= 7) payout = bet * 5;
                else if (coinCount >= 5) payout = bet * 2;

                if (payout >= bet * 5) triggerFx("BIGWIN", 1000);
                else if (payout > 0) triggerFx("WIN", 800);
            }

            setLastPayout(payout);
            if (payout > 0) {
                setCredits((c) => c + payout);
                setShowCoinDrop(true);
                sfx.play("coins", { gain: 0.9 });
                window.setTimeout(() => setShowCoinDrop(false), 1200);

                if (payout >= bet * 50) sfx.play("jackpot", { gain: 1.0 });
                else if (payout >= bet * 5) sfx.play("bigwin", { gain: 0.95 });
                else sfx.play("win", { gain: 0.85 });
            }

            // FX extra: bats + blunderbuss
            const hasBat = grid.flat().includes("BAT");
            const hasBlunder = grid.flat().includes("BLUNDERBUSS");

            if (hasBat) {
                setShowBat(true);
                sfx.play("bat", { gain: 0.85 });
                window.setTimeout(() => setShowBat(false), 1200);
            }

            if (hasBlunder) {
                setShowShot(true);
                sfx.play("blunderbuss", { gain: 0.95 });
                window.setTimeout(() => setShowShot(false), 800);
            }

            setSpinAnim(false);

            // Vidéo si 5 éléphants alignés
            if (jackpotElephant) {
                setShowBooba(true);
            }

            setLog((prev) => [{ time: Date.now(), bet, reels: grid, payout }, ...prev].slice(0, 30));
        }, 600);
    }

    return (
        <div
            className={`gameRoot fx-${fx.toLowerCase()}`}
            onMouseDown={() => {
                // unlock son dès la 1ère interaction
                if (!sfx.ready) sfx.unlock();
            }}
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

            <h1 style={{ fontSize: 38, textShadow: "2px 2px 8px #000" }}>🏴‍☠️ Pirate Slots</h1>

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

                {/* Grille 5x5 */}
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
                    {reels.flatMap((row, rowIdx) =>
                        row.map((sym, colIdx) => (
                            <span
                                key={`${rowIdx}-${colIdx}`}
                                className={spinAnim ? "card-anim spin" : "card-anim"}
                                style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 56 }}
                            >
                                {symbolImages[sym]}
                            </span>
                        ))
                    )}
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
                                {x.reels.flat().map((sym, i) => (
                                    <span key={i} className="card-anim" style={{ display: "flex", justifyContent: "center" }}>
                                        {symbolImages[sym]}
                                    </span>
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

            {/* Overlay vidéo */}
            {showBooba && (
                <div
                    style={{
                        position: "fixed",
                        left: 0,
                        top: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(0,0,0,0.85)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        padding: 16
                    }}
                >
                    <video
                        src={boobaVideo}
                        autoPlay
                        controls
                        style={{
                            maxWidth: "90vw",
                            maxHeight: "80vh",
                            borderRadius: 16,
                            boxShadow: "0 4px 32px #000"
                        }}
                    />
                    <button
                        onClick={() => setShowBooba(false)}
                        style={{
                            marginTop: 24,
                            fontSize: 22,
                            padding: "12px 32px",
                            borderRadius: 8,
                            background: "#ff9800",
                            color: "#222",
                            border: "none",
                            cursor: "pointer"
                        }}
                    >
                        Fermer
                    </button>
                </div>
            )}
        </div>
    );
}
