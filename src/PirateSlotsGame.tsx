import React, { useMemo, useState, useRef } from "react";
import { pickWeightedPirate, PirateSymbolId } from "./pirateSlots";
import { useSound } from "./audio/useSound";
import "./PirateSlotsGame.css";
import MiniTreasureGame from "./MiniTreasureGame";

// Images
import elephantImg from "./images/elephant.png";
import soldatImg from "./images/soldat.png";
import chauveImg from "./images/chauve.png";
import perroImg from "./images/perro.png";
import gunImg from "./images/gun.png";
import coffreImg from "./images/coffre.png";
import drapImg from "./images/drap.png";
import mapImg from "./images/map.png";

// IMPORTANT: évite les accents dans les dossiers -> ./videos/booba.mp4
import boobaVideo from "./videos/booba.mp4";
import rireMp3 from "./audio/rire.mp3";
import oneVideo from "./videos/one.mp4";
import batSound from "./audio/bat.mp3";
import pirateMusic from "./audio/pirate.mp3";

type ExtraSymbolId = "ELEPHANT" | "SOLDAT";
type SlotSymbolId = PirateSymbolId | ExtraSymbolId;

type Fx = "NONE" | "WIN" | "BIGWIN" | "JACKPOT" | "SPIN";

const symbolImages: Record<SlotSymbolId, React.ReactNode> = {
    PIRATE: <img src={drapImg} alt="drapeau pirate" style={{ height: 40 }} />,
    CHEST: <img src={coffreImg} alt="coffre" style={{ height: 40 }} />,
    COIN: <img src={elephantImg} alt="éléphant" style={{ height: 40 }} />,
    BAT: <img src={chauveImg} alt="chauve-souris" style={{ height: 40 }} />,
    BLUNDERBUSS: <img src={gunImg} alt="pistolet pirate" style={{ height: 40 }} />,
    MAP: <img src={mapImg} alt="carte au trésor" style={{ height: 40 }} />,
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
    // Probabilités ajustées :
    // PIRATE: 5%, ELEPHANT: 10%, SOLDAT: 15%, le reste réparti
    const pick = (): SlotSymbolId => {
        const r = Math.random();
        if (r < 0.05) return "PIRATE";
        if (r < 0.15) return "ELEPHANT";
        if (r < 0.30) return "SOLDAT";
        return pickWeightedPirate(); // le reste via ton weighted pirate (hors PIRATE)
    };
    return Array.from({ length: 5 }, () =>
        Array.from({ length: 5 }, () => pick())
    );
}

// Détection des combinaisons gagnantes (lignes, colonnes, diagonales)
function getWinningCombos(grid: SlotSymbolId[][]): number[][] {
    const wins: number[][] = [];
    // Lignes
    for (let i = 0; i < 5; i++) {
        if (grid[i].every(s => s === grid[i][0]))
            wins.push([0,1,2,3,4].map(j => i*5+j));
    }
    // Colonnes
    for (let j = 0; j < 5; j++) {
        if ([0,1,2,3,4].every(i => grid[i][j] === grid[0][j]))
            wins.push([0,1,2,3,4].map(i => i*5+j));
    }
    // Diagonale principale
    if ([0,1,2,3,4].every(i => grid[i][i] === grid[0][0]))
        wins.push([0,6,12,18,24]);
    // Diagonale secondaire
    if ([0,1,2,3,4].every(i => grid[i][4-i] === grid[0][4]))
        wins.push([4,8,12,16,20]);
    return wins;
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

function hasFiveBats(grid: SlotSymbolId[][]): boolean {
    // Lignes
    for (let i = 0; i < 5; i++) {
        if (grid[i].every((s) => s === "BAT")) return true;
    }
    // Colonnes
    for (let j = 0; j < 5; j++) {
        if ([0, 1, 2, 3, 4].every((i) => grid[i][j] === "BAT")) return true;
    }
    // Diagonale principale
    if ([0, 1, 2, 3, 4].every((i) => grid[i][i] === "BAT")) return true;
    // Diagonale secondaire
    if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i] === "BAT")) return true;
    return false;
}

// Nouvelle fonction pour générer une colonne avec contraintes de drapeau pirate
function spinColumn(colIdx: number): SlotSymbolId[] {
    // Probabilités personnalisées
    // Drapeau pirate rare et seulement sur col 0, 2, 4
    const symbols: { id: SlotSymbolId; prob: number }[] = [
        { id: "ELEPHANT", prob: 0.13 },
        { id: "SOLDAT", prob: 0.18 },
        { id: "COIN", prob: 0.15 },
        { id: "BAT", prob: 0.13 },
        { id: "BLUNDERBUSS", prob: 0.13 },
        { id: "MAP", prob: 0.13 },
        { id: "PARROT", prob: 0.13 },
    ];
    if (colIdx === 0 || colIdx === 2 || colIdx === 4) {
        symbols.push({ id: "PIRATE", prob: 0.05 });
    }
    // Normalise
    const total = symbols.reduce((sum, s) => sum + s.prob, 0);
    const norm = symbols.map(s => ({ ...s, prob: s.prob / total }));
    // Pick one symbol
    function pickOne() {
        let r = Math.random();
        for (const s of norm) {
            if (r < s.prob) return s.id;
            r -= s.prob;
        }
        return norm[norm.length - 1].id;
    }
    return Array.from({ length: 5 }, () => pickOne());
}

// Nouvelle fonction pour générer la grille colonne par colonne
function spinGridCols(): SlotSymbolId[][] {
    const cols = [0, 1, 2, 3, 4].map(colIdx => spinColumn(colIdx));
    // Transpose pour obtenir lignes
    return Array.from({ length: 5 }, (_, rowIdx) =>
        cols.map(col => col[rowIdx])
    );
}

export default function PirateSlotsGame() {
    const sfx = useSound();

    const [credits, setCredits] = useState<number>(1000);
    const [bet, setBet] = useState<number>(20);
    const [reels, setReels] = useState<SlotSymbolId[][]>(() => spinGridCols());
    const [lastPayout, setLastPayout] = useState<number>(0);
    const [log, setLog] = useState<Array<{ time: number; bet: number; reels: SlotSymbolId[][]; payout: number }>>([]);
    const [showBat, setShowBat] = useState(false);
    const [showCoinDrop, setShowCoinDrop] = useState(false);
    const [showShot, setShowShot] = useState(false);
    const [spinAnim, setSpinAnim] = useState(false);
    const [fx, setFx] = useState<Fx>("NONE");
    const [showBooba, setShowBooba] = useState(false);
    const [showMiniGame, setShowMiniGame] = useState(false);
    const [showIntro, setShowIntro] = useState(true);
    // Ajoute un état pour surbrillance des drapeaux pirates et des cases gagnantes
    const [highlightPirates, setHighlightPirates] = useState<number[]>([]);
    const [highlightWins, setHighlightWins] = useState<number[]>([]);
    // Ajoute un état pour le spin colonne par colonne
    const [spinningCols, setSpinningCols] = useState([false, false, false, false, false]);
    const [isSpinning, setIsSpinning] = useState(false);
    const spinTimeouts = useRef<NodeJS.Timeout[]>([]);
    const pirateAudioRef = useRef<HTMLAudioElement | null>(null);
    const [musicReady, setMusicReady] = useState(false);

    const canSpin = credits >= bet && bet > 0;
    const totalWon = useMemo(() => log.reduce((sum, x) => sum + x.payout, 0), [log]);

    React.useEffect(() => {
        if (!pirateAudioRef.current) {
            pirateAudioRef.current = new Audio(pirateMusic);
            pirateAudioRef.current.loop = true;
            pirateAudioRef.current.volume = 0.7;
            pirateAudioRef.current.autoplay = true;
            pirateAudioRef.current.addEventListener("canplaythrough", () => setMusicReady(true));
        }
        if (musicReady) {
            pirateAudioRef.current!.play();
        }
        return () => {
            pirateAudioRef.current?.pause();
        };
    }, [musicReady]);

    function fadeMusic(vol: number, duration: number = 600) {
        const audio = pirateAudioRef.current;
        if (!audio) return;
        const start = audio.volume;
        const step = (vol - start) / (duration / 50);
        let i = 0;
        const fade = setInterval(() => {
            i++;
            audio.volume = Math.max(0, Math.min(1, audio.volume + step));
            if ((step < 0 && audio.volume <= vol) || (step > 0 && audio.volume >= vol) || i > duration / 50) {
                audio.volume = vol;
                clearInterval(fade);
            }
        }, 50);
    }

    function handleEventStart() {
        fadeMusic(0, 600);
    }
    function handleEventEnd() {
        fadeMusic(0.7, 800);
    }

    function triggerFx(kind: Fx, ms = 700) {
        setFx(kind);
        handleEventStart();
        window.setTimeout(() => {
            setFx("NONE");
            handleEventEnd();
        }, ms);
    }

    async function unlockAudioIfNeeded() {
        if (!sfx.ready) await sfx.unlock();
    }

    function hasThreeFlags(grid: SlotSymbolId[][]) {
        return grid.flat().filter(s => s === "PIRATE").length === 3;
    }

    // Nouvelle fonction de spin colonne par colonne
    async function spin() {
        if (isSpinning) {
            // STOP: Arrête tous les timeouts et affiche le résultat final
            spinTimeouts.current.forEach(t => clearTimeout(t));
            setSpinningCols([false, false, false, false, false]);
            setSpinAnim(false);
            setIsSpinning(false);
            // Affiche le résultat final immédiatement
            finalizeSpin();
            return;
        }
        if (!canSpin) return;
        await unlockAudioIfNeeded();
        sfx.play("click", { gain: 0.7 });
        setCredits((c) => c - bet);
        setSpinAnim(true);
        setHighlightPirates([]);
        setHighlightWins([]);
        triggerFx("SPIN", 500);
        sfx.play("spin", { gain: 0.7 });
        setSpinningCols([true, true, true, true, true]);
        setIsSpinning(true);
        let currentReels = Array.from({ length: 5 }, () => Array(5).fill(null));
        setReels(currentReels as SlotSymbolId[][]);
        spinTimeouts.current = [];
        for (let col = 0; col < 5; col++) {
            const t = setTimeout(() => {
                const colSymbols = spinColumn(col);
                for (let row = 0; row < 5; row++) {
                    currentReels[row][col] = colSymbols[row];
                }
                setReels(currentReels.map(r => [...r]));
                if (col === 4) {
                    setSpinAnim(false);
                    setSpinningCols([false, false, false, false, false]);
                    setIsSpinning(false);
                    finalizeSpin(currentReels as SlotSymbolId[][]);
                }
            }, col * 400);
            spinTimeouts.current.push(t);
        }
    }

    function finalizeSpin(grid?: SlotSymbolId[][]) {
        const finalGrid = grid || reels;
        let payout = 0;
        const jackpotElephant = hasFiveElephants(finalGrid);
        if (jackpotElephant) {
            payout = bet * 50;
            triggerFx("JACKPOT", 1400);
        } else {
            const flat = finalGrid.flat();
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
            setTimeout(() => setShowCoinDrop(false), 1200);
            if (payout >= bet * 50) sfx.play("jackpot", { gain: 1.0 });
            else if (payout >= bet * 5) sfx.play("bigwin", { gain: 0.95 });
            else sfx.play("win", { gain: 0.85 });
        }
        const flat = finalGrid.flat();
        // Highlight pirates
        const piratesIdx = flat.map((s, i) => s === "PIRATE" ? i : -1).filter(i => i !== -1);
        setHighlightPirates(piratesIdx);
        // Highlight winning combos
        const winCombos = getWinningCombos(finalGrid).flat();
        setHighlightWins(winCombos);
        if (hasFiveBats(finalGrid)) {
            const audio = new Audio(batSound);
            audio.play();
        }
        if (hasFiveElephants(finalGrid)) {
            setShowBooba(true);
        }
        if (flat.filter(s => s === "PIRATE").length === 3) {
            setShowMiniGame(true);
            const audio = new Audio(rireMp3);
            audio.play();
        }
        setLog((prev) => [{ time: Date.now(), bet, reels: finalGrid, payout }, ...prev].slice(0, 30));
    }

    return (
        <div
            className={`gameRoot fx-${fx.toLowerCase()}`}
            onMouseDown={() => {
                if (showIntro) setShowIntro(false);
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
            {showIntro && (
                <div
                    style={{
                        position: "fixed",
                        left: 0,
                        top: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "#000",
                        zIndex: 10000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                    onClick={() => setShowIntro(false)}
                >
                    <video
                        src={oneVideo}
                        autoPlay
                        controls={false}
                        style={{ maxWidth: "100vw", maxHeight: "100vh", borderRadius: 0, background: "#000" }}
                        onEnded={() => setShowIntro(false)}
                    />
                    <div style={{ position: "absolute", bottom: 32, width: "100vw", textAlign: "center", color: "#ffe082", fontSize: 22, opacity: 0.8 }}>
                        Cliquez n'importe où pour passer l'intro
                    </div>
                </div>
            )}

            <BrumeBg />
            <LanternGlow />
            <FxOverlay fx={fx} />

            <h1 style={{ fontSize: 54, textShadow: "2px 2px 12px #000", display: 'flex', alignItems: 'center', gap: 32, justifyContent: 'center', margin: '32px 0 24px 0' }}>
                <img src={drapImg} alt="drapeau pirate" style={{ height: 90, verticalAlign: 'middle', marginRight: 18 }} />
                <span style={{ fontWeight: 900, letterSpacing: 2, color: '#ffe082', textShadow: '2px 2px 12px #000' }}>
                  Funesterie
                </span>
            </h1>

            {/* Barre volume/muet supprimée */}
            {/* <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8 }}>
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
            </div> */}

            <div style={{ display: "flex", gap: 24, alignItems: "center", marginTop: 0, marginBottom: 0 }}>
                {/* Grille 5x5 */}
                <div className="slot-grid-max" style={{ height: '50vh', maxHeight: '60vh', minHeight: 320 }}>
                    {[].concat.apply([], reels).map((sym, idx) => (
                        <span
                            key={idx}
                            className={
                                (spinAnim ? "card-anim spin rotate" : "card-anim") +
                                (highlightPirates.includes(idx) ? " pirate-highlight-multi" : "") +
                                (highlightWins.includes(idx) ? " win-highlight" : "")
                            }
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: 56,
                                width: "100%",
                                height: "100%"
                            }}
                        >
                            {symbolImages[sym] && React.isValidElement(symbolImages[sym])
                                ? React.cloneElement(symbolImages[sym] as React.ReactElement, { style: { height: '8vw', maxHeight: 120, width: 'auto', maxWidth: '90%', objectFit: 'contain' } })
                                : null}
                        </span>
                    ))}
                </div>
            </div>

            {/* Bouton SPIN/STOP */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0 0 0', width: '100%' }}>
                <button
                    onClick={spin}
                    disabled={!canSpin && !isSpinning}
                    style={{
                        padding: '18px 48px',
                        fontSize: 32,
                        fontWeight: 700,
                        cursor: (canSpin || isSpinning) ? 'pointer' : 'not-allowed',
                        background: '#ff9800',
                        color: '#222',
                        borderRadius: 12,
                        border: 'none',
                        boxShadow: '0 2px 16px #000',
                        margin: '0 auto',
                        transition: 'background 0.2s',
                        opacity: (canSpin || isSpinning) ? 1 : 0.5
                    }}
                >
                    {isSpinning ? 'STOP' : 'SPIN'}
                </button>
            </div>

            {/* Crédits en bas de page */}
            <div style={{
                position: "fixed",
                left: 0,
                bottom: 0,
                width: "100vw",
                background: "rgba(20,20,30,0.92)",
                color: "#ffe082",
                fontSize: 22,
                textAlign: "center",
                padding: "12px 0 8px 0",
                zIndex: 2000,
                boxShadow: "0 -2px 16px #000a"
            }}>
                <b>Crédits :</b> {credits} &nbsp;|&nbsp; <b>Mise :</b> {bet} &nbsp;|&nbsp; <b>Dernier gain :</b> {lastPayout} &nbsp;|&nbsp; <b>Total gagné :</b> {totalWon}
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
                        background: "rgba(0,0,0,0.0)",
                        zIndex: 9999,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        pointerEvents: "none"
                    }}
                >
                    <video
                        src={boobaVideo}
                        autoPlay
                        controls={false}
                        loop={false}
                        muted={false}
                        style={{
                            maxWidth: "90vw",
                            maxHeight: "80vh",
                            borderRadius: 16,
                            boxShadow: "0 4px 32px #000",
                            opacity: 0.5,
                            pointerEvents: "none"
                        }}
                        onEnded={() => setShowBooba(false)}
                    />
                </div>
            )}

            {/* Mini-jeu Chasse au Trésor */}
            {showMiniGame && (
                <MiniTreasureGame
                    onClose={() => { handleEventEnd(); setShowMiniGame(false); }}
                    onWin={(reward) => {
                        setCredits(c => c + reward);
                        handleEventEnd();
                        setShowMiniGame(false);
                    }}
                />
            )}
        </div>
    );
}
