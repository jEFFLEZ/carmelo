import * as React from "react";
import { useMemo, useState, useRef } from "react";
import { pickWeightedPirate, PirateSymbolId } from "./pirateSlots";
import { useSound } from "./audio/useSound";
import "./PirateSlotsGame.css";
import MiniTreasureGame from "./MiniTreasureGame";
import CarteMiniGame from "./CarteMiniGame";
import lingotImg from "./images/lingot.png";

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
import pirateMusic from "./audio/piratesong.mp3";
import spartaVideo from "./videos/sparta.mp4";
import jackMusic from "./audio/jack.mp3";
import alerteSound from "./audio/alerte.mp3";

type ExtraSymbolId = "ELEPHANT" | "SOLDAT";
type SlotSymbolId = PirateSymbolId | ExtraSymbolId;

type Fx = "NONE" | "WIN" | "BIGWIN" | "JACKPOT" | "SPIN";

// Correction du type pour permettre React.cloneElement avec style
const symbolImages: Record<SlotSymbolId, JSX.Element> = {
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

// Ajout d'un overlay SVG pour relier les cases gagnantes
function WinLineOverlay({ winIndexes }: { winIndexes: number[] }) {
    if (!winIndexes || winIndexes.length < 2) return null;
    // grille 5x5, index de 0 à 24
    const cellSize = 1; // en pourcentage, car on utilisera viewBox
    const points = winIndexes.map(idx => {
        const row = Math.floor(idx / 5);
        const col = idx % 5;
        return `${col * cellSize},${row * cellSize}`;
    }).join(' ');
    return (
        <svg className="win-line-overlay" viewBox="0 0 4 4" style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            pointerEvents: 'none',
            zIndex: 20
        }}>
            <polyline
                points={winIndexes.map(idx => {
                    const row = Math.floor(idx / 5);
                    const col = idx % 5;
                    // 0 à 1, on multiplie par 20% pour chaque case
                    return `${(col + 0.5) * 20},${(row + 0.5) * 20}`;
                }).join(' ')}
                stroke="#ffe082"
                strokeWidth="6"
                fill="none"
                strokeLinejoin="round"
                filter="drop-shadow(0 0 8px #ffe082)"
            />
        </svg>
    );
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
    // Motifs en Z
    if ([0,6,12,18,24].every((idx, i) => grid[Math.floor(idx/5)][idx%5] === grid[0][0]) && grid[0][0] === grid[4][4])
        wins.push([0,6,12,18,24]);
    if ([4,8,12,16,20].every((idx, i) => grid[Math.floor(idx/5)][idx%5] === grid[0][4]) && grid[0][4] === grid[4][0])
        wins.push([4,8,12,16,20]);
    // Motif Z croisé (centre + coins)
    if ([0,4,12,20,24].every(idx => grid[Math.floor(idx/5)][idx%5] === grid[2][2]))
        wins.push([0,4,12,20,24]);
    // Motif V (bas)
    if ([0,6,12,18,24].every(idx => grid[Math.floor(idx/5)][idx%5] === grid[0][0]) && [0,24].every(idx => grid[Math.floor(idx/5)][idx%5] === grid[0][0]))
        wins.push([0,12,24]);
    // Zigzag horizontal
    if ([0,7,14,21,24].every(idx => grid[Math.floor(idx/5)][idx%5] === grid[0][0]))
        wins.push([0,7,14,21,24]);
    // Zigzag vertical
    if ([4,9,14,19,24].every(idx => grid[Math.floor(idx/5)][idx%5] === grid[4][0]))
        wins.push([4,9,14,19,24]);
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

function hasFiveSoldats(grid: SlotSymbolId[][]): boolean {
    // Lignes
    for (let i = 0; i < 5; i++) {
        if (grid[i].every((s) => s === "SOLDAT")) return true;
    }
    // Colonnes
    for (let j = 0; j < 5; j++) {
        if ([0, 1, 2, 3, 4].every((i) => grid[i][j] === "SOLDAT")) return true;
    }
    // Diagonale principale
    if ([0, 1, 2, 3, 4].every((i) => grid[i][i] === "SOLDAT")) return true;
    // Diagonale secondaire
    if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i] === "SOLDAT")) return true;
    return false;
}

// Nouvelle fonction pour générer une colonne avec contraintes de drapeau pirate
function spinColumn(colIdx: number): SlotSymbolId[] {
    let symbols: { id: SlotSymbolId; prob: number }[];
    if (colIdx === 0 || colIdx === 2 || colIdx === 4) {
        // Colonnes avec PIRATE
        symbols = [
            { id: "ELEPHANT", prob: 0.13 },
            { id: "SOLDAT", prob: 0.13 },
            { id: "BAT", prob: 0.13 },
            { id: "MAP", prob: 0.13 },
            { id: "PIRATE", prob: 0.13 },
            { id: "COIN", prob: 0.18 },
            { id: "BLUNDERBUSS", prob: 0.17 },
        ];
    } else {
        // Colonnes sans PIRATE
        symbols = [
            { id: "ELEPHANT", prob: 0.15 },
            { id: "SOLDAT", prob: 0.15 },
            { id: "BAT", prob: 0.15 },
            { id: "MAP", prob: 0.15 },
            { id: "COIN", prob: 0.20 },
            { id: "BLUNDERBUSS", prob: 0.20 },
        ];
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
    const [highlightPirates, setHighlightPirates] = useState<number[]>([]);
    const [highlightWins, setHighlightWins] = useState<number[]>([]);
    const [spinningCols, setSpinningCols] = useState([false, false, false, false, false]);
    const [isSpinning, setIsSpinning] = useState(false);
    const spinTimeouts = useRef<NodeJS.Timeout[]>([]);
    const spinIntervals = useRef<NodeJS.Timeout[]>([]); // Pour l'animation de spin
    const pirateAudioRef = useRef<HTMLAudioElement | null>(null);
    const [musicReady, setMusicReady] = useState(false);
    const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [showSparta, setShowSparta] = useState(false);
    const [showCarteMiniGame, setShowCarteMiniGame] = useState(false);
    const [treasureMusic, setTreasureMusic] = useState<HTMLAudioElement | null>(null);

    const canSpin = credits >= bet && bet > 0;
    const totalWon = useMemo(() => log.reduce((sum, x) => sum + x.payout, 0), [log]);

    React.useEffect(() => {
        if (!pirateAudioRef.current) {
            pirateAudioRef.current = new Audio(pirateMusic);
            pirateAudioRef.current.loop = true;
            pirateAudioRef.current.volume = 0.25; // volume réduit
            pirateAudioRef.current.autoplay = true;
            pirateAudioRef.current.addEventListener("canplaythrough", () => setMusicReady(true));
        }
        if (musicReady) {
            pirateAudioRef.current!.play();
        }
        return () => {
            pirateAudioRef.current?.pause();
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        };
    }, [musicReady]);

    // Correction fade: un seul intervalle à la fois
    function fadeMusic(vol: number, duration: number = 600) {
        const audio = pirateAudioRef.current;
        if (!audio) return;
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        const start = audio.volume;
        const step = (vol - start) / (duration / 50);
        let i = 0;
        fadeIntervalRef.current = setInterval(() => {
            i++;
            audio.volume = Math.max(0, Math.min(1, audio.volume + step));
            if ((step < 0 && audio.volume <= vol) || (step > 0 && audio.volume >= vol) || i > duration / 50) {
                audio.volume = vol;
                if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
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

    // Nouvelle fonction de spin colonne par colonne avec animation
    async function spin() {
        if (isSpinning) {
            // STOP: Arrête tous les timeouts et affiche le résultat final
            spinTimeouts.current.forEach(t => clearTimeout(t));
            spinIntervals.current.forEach(t => clearInterval(t));
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
        // NE PAS reset le highlightWins ici pour garder le highlight après STOP
        // setHighlightWins([]); // <-- supprimé
        triggerFx("SPIN", 500);
        sfx.play("spin", { gain: 0.7 });
        setSpinningCols([true, true, true, true, true]);
        setIsSpinning(true);
        let currentReels = Array.from({ length: 5 }, () => Array(5).fill(null));
        setReels(currentReels as SlotSymbolId[][]);
        spinTimeouts.current = [];
        spinIntervals.current = [];
        // Pour chaque colonne, lancer une animation de spin (images aléatoires)
        for (let col = 0; col < 5; col++) {
            // Animation de spin : change les symboles de la colonne toutes les 30ms (vitesse folle)
            spinIntervals.current[col] = setInterval(() => {
                const randomCol = Array.from({ length: 5 }, () => {
                    // On pioche un symbole aléatoire (hors PIRATE/ELEPHANT/SOLDAT pour + de variété)
                    const pool = ["COIN", "BAT", "BLUNDERBUSS", "MAP"];
                    return pool[Math.floor(Math.random() * pool.length)] as SlotSymbolId;
                });
                setReels(prev => {
                    const next = prev.map(row => [...row]);
                    for (let row = 0; row < 5; row++) {
                        next[row][col] = randomCol[row];
                    }
                    return next;
                });
            }, 30); // vitesse très rapide
            // Après 1.2 secondes, arrêter l'animation et afficher la vraie colonne
            spinTimeouts.current[col] = setTimeout(() => {
                clearInterval(spinIntervals.current[col]);
                const colSymbols = spinColumn(col);
                setReels(prev => {
                    const next = prev.map(row => [...row]);
                    for (let row = 0; row < 5; row++) {
                        next[row][col] = colSymbols[row];
                    }
                    return next;
                });
                // Si c'est la dernière colonne, on termine le spin
                if (col === 4) {
                    setSpinAnim(false);
                    setSpinningCols([false, false, false, false, false]);
                    setIsSpinning(false);
                    finalizeSpin(currentReels as SlotSymbolId[][]);
                }
            }, 1200 * (col + 1)); // 1.2s par colonne, enchaîné
        }
    }

    function finalizeSpin(grid?: SlotSymbolId[][]) {
        const finalGrid = grid || reels;
        let payout = 0;
        const jackpotElephant = hasFiveElephants(finalGrid);
        const jackpotSoldat = hasFiveSoldats(finalGrid);
        let winIndexes: number[] = [];
        let winCombos: number[] = [];
        if (jackpotElephant) {
            payout = bet * 50;
            triggerFx("JACKPOT", 1400);
            winCombos = getWinningCombos(finalGrid).filter(combo => combo.every(idx => finalGrid[Math.floor(idx/5)][idx%5] === "ELEPHANT")).flat();
            // Son d'alerte pour booba
            const alert = new Audio(alerteSound);
            alert.play();
        } else if (jackpotSoldat) {
            payout = bet * 40;
            triggerFx("BIGWIN", 1200);
            winCombos = getWinningCombos(finalGrid).filter(combo => combo.every(idx => finalGrid[Math.floor(idx/5)][idx%5] === "SOLDAT")).flat();
            // Son d'alerte pour sparta
            const alert = new Audio(alerteSound);
            alert.play();
        } else {
            const flat = finalGrid.flat();
            const coinCount = flat.filter((s) => s === "COIN").length;
            if (coinCount >= 7) {
                payout = bet * 5;
                winCombos = getWinningCombos(finalGrid).filter(combo => combo.every(idx => flat[idx] === "COIN")).flat();
                // Son d'alerte pour bigwin
                const alert = new Audio(alerteSound);
                alert.play();
            } else if (coinCount >= 5) {
                payout = bet * 2;
                winCombos = getWinningCombos(finalGrid).filter(combo => combo.every(idx => flat[idx] === "COIN")).flat();
                // Son d'alerte pour win
                const alert = new Audio(alerteSound);
                alert.play();
            }
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
        // Highlight uniquement si gain
        if (payout > 0 && winCombos.length > 0) {
            setHighlightWins([...new Set(winCombos)]);
        } else {
            setHighlightWins([]);
        }
        // Déclencheur pirate : au moins un pirate dans chaque colonne
        if (hasPirateInEachColumn(finalGrid)) {
            triggerFx("WIN", 1000);
            sfx.play("win", { gain: 0.9 });
        }
        if (hasFiveBats(finalGrid)) {
            const audio = new Audio(batSound);
            audio.play();
            // Son d'alerte pour bat
            const alert = new Audio(alerteSound);
            alert.play();
        }
        if (hasFiveElephants(finalGrid)) {
            setShowBooba(true);
            // Son d'alerte pour booba
            const alert = new Audio(alerteSound);
            alert.play();
        }
        if (hasFiveSoldats(finalGrid)) {
            setShowSparta(true);
            // Son d'alerte pour sparta
            const alert = new Audio(alerteSound);
            alert.play();
        }
        // Déclencheur mini-jeu pirate (marine/pierres précieuses) : dès qu'il y a 3 PIRATE n'importe où
        if (flat.filter(s => s === "PIRATE").length >= 3) {
            setShowMiniGame(true);
            const audio = new Audio(rireMp3);
            audio.play();
        }
        // Déclencheur mini-jeu carte (MAP x5 alignés seulement)
        const mapWinCombo = getWinningCombos(finalGrid).find(combo => combo.every(idx => flat[idx] === "MAP"));
        if (mapWinCombo) {
            handleCarteMiniGameOpen();
            setShowCarteMiniGame(true);
        }
        setLog((prev) => [{ time: Date.now(), bet, reels: finalGrid, payout }, ...prev].slice(0, 30));
    }

    function handleCarteMiniGameOpen() {
        // Stoppe la musique principale
        pirateAudioRef.current?.pause();
        // Joue la musique de la chasse au trésor
        const audio = new Audio(jackMusic);
        audio.loop = true;
        audio.volume = 0.5;
        audio.play();
        setTreasureMusic(audio);
    }
    function handleCarteMiniGameClose() {
        // Stoppe la musique de la chasse au trésor
        treasureMusic?.pause();
        setTreasureMusic(null);
        // Relance la musique principale
        pirateAudioRef.current?.play();
    }

    // Ajout d'une fonction pour obtenir la couleur selon le symbole
    function getWinColor(symbol: SlotSymbolId) {
        switch (symbol) {
            case "ELEPHANT": return "#ffe082"; // jaune
            case "SOLDAT": return "#ffd700"; // jaune doré
            case "PARROT": return "#00e676"; // vert
            case "BAT": return "#7c4dff"; // violet
            case "COIN": return "#ff9800"; // orange
            case "BLUNDERBUSS": return "#ff1744"; // rouge
            case "MAP": return "linear-gradient(135deg, #ffe082 0%, #00eaff 50%, #ff00ea 100%)"; // multicouleur
            case "CHEST": return "#8d6e63"; // marron
            case "PIRATE": return "#222"; // noir
            default: return "#fffbe6";
        }
    }

    return (
        <div
            className={`gameRoot fx-${fx.toLowerCase()}`}
            onMouseDown={() => {
                if (showIntro) setShowIntro(false);
                if (!sfx.ready) sfx.unlock();
            }}
            style={{
                padding: 0,
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

            {/* ZONE CENTRALE */}
            <div className="slot-center-area">
                <h1 style={{ fontSize: 'clamp(32px, 8vw, 54px)', textShadow: "2px 2px 12px #000", display: 'flex', alignItems: 'center', gap: 32, justifyContent: 'center', margin: '2vw 0 2vw 0' }}>
                    <img src={drapImg} alt="drapeau pirate" style={{ height: 90, verticalAlign: 'middle', marginRight: 18 }} />
                    <span style={{ fontWeight: 900, letterSpacing: 2, color: '#ffe082', textShadow: '2px 2px 12px #000' }}>
                      Funesterie
                    </span>
                </h1>
                <div className="slot-grid-max">
                    {reels.flat().map((sym, idx) => {
                        const isWin = highlightWins.includes(idx);
                        const symbolElement = symbolImages[sym];
                        return (
                            <span
                                key={idx}
                                className={
                                    (spinAnim ? "card-anim spin rotate" : "card-anim") +
                                    (highlightPirates.includes(idx) ? " pirate-highlight-multi" : "")
                                }
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minHeight: 56,
                                    width: "100%",
                                    height: "100%",
                                    boxShadow: isWin ? (sym === "MAP"
                                        ? "0 0 24px 8px #00eaff, 0 0 0 4px #ff00ea, 0 0 32px 12px #ffe082"
                                        : `0 0 24px 8px ${getWinColor(sym)}, 0 0 0 4px ${getWinColor(sym)}`) : "none",
                                    background: isWin ? (sym === "MAP"
                                        ? "linear-gradient(135deg, #ffe082 0%, #00eaff 50%, #ff00ea 100%)"
                                        : getWinColor(sym) + "22") : "transparent",
                                    borderRadius: isWin ? 12 : 0,
                                    border: isWin ? (sym === "MAP"
                                        ? "2px solid #00eaff"
                                        : `2px solid ${getWinColor(sym)}`) : "none",
                                    transition: "box-shadow 0.2s, background 0.2s, border 0.2s"
                                }}
                            >
                                {symbolElement
                                    ? React.cloneElement(symbolElement, { style: { height: '8vw', maxHeight: 120, width: 'auto', maxWidth: '90%', objectFit: 'contain' } })
                                    : <span style={{ color: 'red', fontWeight: 700 }}>?</span>
                                }
                            </span>
                        );
                    })}
                    {/* Overlay SVG pour relier les cases gagnantes, seulement si gain */}
                    {highlightWins.length >= 2 && <WinLineOverlay winIndexes={highlightWins} />}
                </div>
                <button
                    className="spin-btn"
                    onClick={spin}
                    disabled={!canSpin && !isSpinning}
                >
                    {isSpinning ? 'STOP' : 'SPIN'}
                </button>
            </div>

            {/* Historique */}
            <div style={{
                position: "absolute",
                left: 0,
                bottom: 64, // remonte au-dessus de la barre crédits
                width: "100vw",
                background: "rgba(20,20,30,0.85)",
                color: "#ffe082",
                fontSize: 18,
                textAlign: "left",
                padding: "12px 0 8px 0",
                zIndex: 2000,
                boxShadow: "0 -2px 16px #000a",
                borderRadius: "12px 12px 0 0"
            }}>
                <b style={{marginLeft: 24}}>Historique</b>
                <div style={{
                    display: "flex",
                    gap: 8,
                    overflowX: 'auto',
                    maxWidth: '100vw',
                    padding: '12px 8px',
                    background: 'rgba(20,20,30,0.85)',
                    borderRadius: 12,
                    boxShadow: '0 2px 16px #000a',
                    position: 'relative',
                    zIndex: 10
                }}>
                    {log.map((x) => (
                        <div
                            key={x.time}
                            style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                                borderBottom: "1px solid #333",
                                paddingBottom: 8,
                                fontSize: 18,
                                color: '#ffe082',
                                background: 'rgba(30,30,40,0.7)',
                                borderRadius: 8,
                                marginBottom: 2
                            }}
                        >
                            <span style={{ width: 86, opacity: 0.9, fontWeight: 600 }}>{new Date(x.time).toLocaleTimeString()}</span>
                            <span style={{ width: 80, opacity: 0.85 }}>Mise {x.bet}</span>
                            <span style={{ width: 220 }}>
                                <span style={{ display: "flex", gap: 6 }}>
                                    {x.reels.flat().map((sym, i) => {
                    const symbolElement = symbolImages[sym];
                    return (
                        <span key={i} className="card-anim" style={{ display: "flex", justifyContent: "center", alignItems: "center", background: "#222", borderRadius: 6, boxShadow: "0 0 8px #ffe082", padding: 2 }}>
                            {symbolElement
                                ? React.cloneElement(symbolElement, { style: { height: 38, width: 'auto', maxWidth: 44, objectFit: 'contain', display: 'block' } })
                                : <span style={{ color: 'red', fontWeight: 700 }}>?</span>
                            }
                        </span>
                    );
                })}
                                </span>
                            </span>
                            <span style={{ width: 90, fontWeight: 700, color: '#fffbe6' }}>+{x.payout}</span>
                        </div>
                    ))}
                    {log.length === 0 && <div style={{ opacity: 0.7 }}>Aucun spin pour l'instant.</div>}
                </div>
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

            {/* Overlay vidéo SPARTA */}
            {showSparta && (
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
            src={spartaVideo}
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
            onEnded={() => setShowSparta(false)}
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
            {/* Mini-jeu Carte au Trésor (MAP x3) */}
            {showCarteMiniGame && (
                <CarteMiniGame
                    onClose={() => { handleCarteMiniGameClose(); handleEventEnd(); setShowCarteMiniGame(false); }}
                    onWin={(reward) => {
                        setCredits(c => c + reward);
                        handleCarteMiniGameClose();
                        handleEventEnd();
                        setShowCarteMiniGame(false);
                    }}
                    lingotImg={lingotImg}
                />
            )}
        </div>
    );
}
