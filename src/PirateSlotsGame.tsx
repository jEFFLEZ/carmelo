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
import coffreImg from "./images/coffre.png"; // Ajouté
import drapImg from "./images/drap.png";
import mapImg from "./images/map.png";
import flushImg from "./images/flush.png";

// IMPORTANT: évite les accents dans les dossiers -> ./videos/booba.mp4
import boobaVideo from "./videos/booba.mp4";
import rireMp3 from "./audio/rire.mp3";
import oneVideo from "./videos/one.mp4";
import batSound from "./audio/bat.mp3";
import pirateMusic from "./audio/piratesong.mp3";
import spartaVideo from "./videos/sparta.mp4";
import jackMusic from "./audio/jack.mp3";
import alerteSound from "./audio/alerte.mp3";
import jokerVideo from "./videos/joker.mp4";
import powerVideo from "./videos/power.mp4";
import expVideo from "./videos/exp.mp4";
import bingoSound from "./audio/bingo.mp3";
import saphirSound from "./audio/saphir.mp3";
import rubisSound from "./audio/rubis.mp3";
import opaleSound from "./audio/opale.mp3";
import rangerVideo from "./videos/ranger.mp4";

type ExtraSymbolId = "ELEPHANT" | "SOLDAT" | "JOKER";
type SlotSymbolId = PirateSymbolId | ExtraSymbolId;

type Fx = "NONE" | "WIN" | "BIGWIN" | "JACKPOT" | "SPIN";

// Correction du type pour permettre React.cloneElement avec style
const symbolImages: Record<SlotSymbolId, JSX.Element> = {
    PIRATE: <img src={drapImg} alt="drapeau pirate" style={{ height: 80 }} />,
    CHEST: <img src={coffreImg} alt="coffre" style={{ height: 80 }} />, // Ajouté
    COIN: <img src={lingotImg} alt="pièce d'or" style={{ height: 80 }} />,
    BAT: <img src={chauveImg} alt="chauve-souris" style={{ height: 80 }} />,
    BLUNDERBUSS: <img src={gunImg} alt="pistolet pirate" style={{ height: 80 }} />,
    MAP: <img src={mapImg} alt="carte au trésor" style={{ height: 80 }} />,
    PARROT: <img src={perroImg} alt="perroquet pirate" style={{ height: 80 }} />,
    ELEPHANT: <img src={elephantImg} alt="éléphant" style={{ height: 80 }} />,
    SOLDAT: <img src={soldatImg} alt="soldat spartiate" style={{ height: 80 }} />,
    JOKER: <img src={flushImg} alt="joker" style={{ height: 80 }} />
};

// FX placeholders (CSS)
function BatAnimation() {
    return (
        <div className="bat-animation">
            <video
                src={require('./videos/bat.mp4')}
                autoPlay
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                onEnded={null}
            />
        </div>
    );
}

// Nouveau composant pour faire tomber plusieurs lingots
function CoinDropAnimation({ count = 1 }: { count?: number }) { 
    return (
        <>
            {Array.from({ length: count }, (_, i) => {
                // Position horizontale aléatoire entre 20% et 80%
                const leftPos = 20 + Math.random() * 60;
                // Délai aléatoire entre 0 et 400ms
                const delay = Math.random() * 400;
                return (
                    <div 
                        key={i}
                        className="coin-drop-animation" 
                        style={{
                            left: `${leftPos}vw`,
                            animationDelay: `${delay}ms`
                        }}
                    />
                );
            })}
        </>
    );
}

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

// Détection des combinaisons gagnantes (lignes, colonnes, diagonales) avec support du JOKER
function getWinningCombos(grid: SlotSymbolId[][]): number[][] {
    const wins: number[][] = [];
    
    // Fonction helper pour vérifier si deux symboles correspondent (en tenant compte du JOKER)
    const symbolsMatch = (sym1: SlotSymbolId, sym2: SlotSymbolId): boolean => {
        // Correction : seul "JOKER" est joker, jamais "PIRATE"
        if (sym1 === "JOKER" || sym2 === "JOKER") return true;
        return sym1 === sym2;
    };
    
    // Fonction helper pour vérifier si une ligne entière correspond
    const allSymbolsMatch = (symbols: SlotSymbolId[]): boolean => {
        // Correction : le symbole de base ne doit pas être un JOKER ni un PIRATE
        const baseSymbol = symbols.find(s => s !== "JOKER");
        if (!baseSymbol) return true; // Tous des JOKER
        // Correction : si la ligne contient plusieurs symboles différents (hors JOKER), ce n'est pas gagnant
        return symbols.every(s => symbolsMatch(s, baseSymbol));
    };
    
    // Lignes
    for (let i = 0; i < 5; i++) {
        if (allSymbolsMatch(grid[i]))
            wins.push([0,1,2,3,4].map(j => i*5+j));
    }
    // Colonnes
    for (let j = 0; j < 5; j++) {
        const colSymbols = [0,1,2,3,4].map(i => grid[i][j]);
        if (allSymbolsMatch(colSymbols))
            wins.push([0,1,2,3,4].map(i => i*5+j));
    }
    // Diagonale principale
    const diag1 = [0,1,2,3,4].map(i => grid[i][i]);
    if (allSymbolsMatch(diag1))
        wins.push([0,6,12,18,24]);
    // Diagonale secondaire
    const diag2 = [0,1,2,3,4].map(i => grid[i][4-i]);
    if (allSymbolsMatch(diag2))
        wins.push([4,8,12,16,20]);
    
    return wins;
}

function hasFiveElephants(grid: SlotSymbolId[][]): boolean {
    const symbolsMatch = (sym1: SlotSymbolId, sym2: SlotSymbolId): boolean => {
        if (sym1 === "JOKER" || sym2 === "JOKER") return true;
        return sym1 === sym2;
    };
    
    // Lignes
    for (let i = 0; i < 5; i++) {
        if (grid[i].every((s) => s === "ELEPHANT" || s === "JOKER")) return true;
    }
    // Colonnes
    for (let j = 0; j < 5; j++) {
        if ([0, 1, 2, 3, 4].every((i) => grid[i][j] === "ELEPHANT" || grid[i][j] === "JOKER")) return true;
    }
    // Diagonale principale
    if ([0, 1, 2, 3, 4].every((i) => grid[i][i] === "ELEPHANT" || grid[i][i] === "JOKER")) return true;
    // Diagonale secondaire
    if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i] === "ELEPHANT" || grid[i][4 - i] === "JOKER")) return true;

    return false;
}

function hasFiveBats(grid: SlotSymbolId[][]): boolean {
    // Lignes
    for (let i = 0; i < 5; i++) {
        if (grid[i].every((s) => s === "BAT" || s === "JOKER")) return true;
    }
    // Colonnes
    for (let j = 0; j < 5; j++) {
        if ([0, 1, 2, 3, 4].every((i) => grid[i][j] === "BAT" || grid[i][j] === "JOKER")) return true;
    }
    // Diagonale principale
    if ([0, 1, 2, 3, 4].every((i) => grid[i][i] === "BAT" || grid[i][i] === "JOKER")) return true;
    // Diagonale secondaire
    if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i] === "BAT" || grid[i][4 - i] === "JOKER")) return true;
    return false;
}

function hasFiveSoldats(grid: SlotSymbolId[][]): boolean {
    // Lignes
    for (let i = 0; i < 5; i++) {
        if (grid[i].every((s) => s === "SOLDAT" || s === "JOKER")) return true;
    }
    // Colonnes
    for (let j = 0; j < 5; j++) {
        if ([0, 1, 2, 3, 4].every((i) => grid[i][j] === "SOLDAT" || grid[i][j] === "JOKER")) return true;
    }
    // Diagonale principale
    if ([0, 1, 2, 3, 4].every((i) => grid[i][i] === "SOLDAT" || grid[i][i] === "JOKER")) return true;
    // Diagonale secondaire
    if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i] === "SOLDAT" || grid[i][4 - i] === "JOKER")) return true;
    return false;
}

function hasFiveGuns(grid: SlotSymbolId[][]): boolean {
    // Lignes
    for (let i = 0; i < 5; i++) {
        if (grid[i].every((s) => s === "BLUNDERBUSS" || s === "JOKER")) return true;
    }
    // Colonnes
    for (let j = 0; j < 5; j++) {
        if ([0, 1, 2, 3, 4].every((i) => grid[i][j] === "BLUNDERBUSS" || grid[i][j] === "JOKER")) return true;
    }
    // Diagonale principale
    if ([0, 1, 2, 3, 4].every((i) => grid[i][i] === "BLUNDERBUSS" || grid[i][i] === "JOKER")) return true;
    // Diagonale secondaire
    if ([0, 1, 2, 3, 4].every((i) => grid[i][4 - i] === "BLUNDERBUSS" || grid[i][4 - i] === "JOKER")) return true;
    return false;
}

// Nouvelle fonction pour générer une colonne avec contraintes de drapeau pirate
function spinColumn(colIdx: number): SlotSymbolId[] {
    let symbols: { id: SlotSymbolId; prob: number }[];
    if (colIdx === 0 || colIdx === 2 || colIdx === 4) {
        // Colonnes avec PIRATE
        symbols = [
            { id: "ELEPHANT", prob: 0.19 },
            { id: "SOLDAT", prob: 0.19 },
            { id: "BAT", prob: 0.18 },
            { id: "MAP", prob: 0.06 },
            { id: "PIRATE", prob: 0.13 },
            { id: "COIN", prob: 0.04 },
            { id: "BLUNDERBUSS", prob: 0.16 },
            { id: "CHEST", prob: 0.03 }, // Ajout CHEST
            { id: "JOKER", prob: 0.02 }, // Ratio flush diminué
        ];
    } else {
        // Colonnes sans PIRATE
        symbols = [
            { id: "ELEPHANT", prob: 0.21 },
            { id: "SOLDAT", prob: 0.21 },
            { id: "BAT", prob: 0.20 },
            { id: "MAP", prob: 0.06 },
            { id: "COIN", prob: 0.04 },
            { id: "BLUNDERBUSS", prob: 0.23 },
            { id: "CHEST", prob: 0.03 }, // Ajout CHEST
            { id: "JOKER", prob: 0.02 }, // Ratio flush diminué
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

// Ajout des types d'événements et de la queue

type GameEvent =
  | { type: "VIDEO_BOoba"; ms?: number }
  | { type: "VIDEO_SPARTA"; ms?: number }
  | { type: "VIDEO_JOKER"; ms?: number }
  | { type: "VIDEO_POWER"; ms?: number }
  | { type: "VIDEO_RANGER"; ms?: number }
  | { type: "VIDEO_EXP"; ms?: number }
  | { type: "VIDEO_BAT"; ms?: number } // Ajouté
  | { type: "MINI_TREASURE" }
  | { type: "MINI_MAP" }
  | { type: "SFX"; src: string; volume?: number };

export default function PirateSlotsGame() {
    const sfx = useSound();
    const [credits, setCredits] = useState<number>(1000);
    const [bet, setBet] = useState<number>(20);
    const [reels, setReels] = useState<SlotSymbolId[][]>(() => spinGridCols());
    const [lastPayout, setLastPayout] = useState<number>(0);
    const [log, setLog] = useState<Array<{ time: number; bet: number; reels: SlotSymbolId[][]; payout: number }>>([]);
    const [showBat, setShowBat] = useState(false);
    const [showCoinDrop, setShowCoinDrop] = useState(false);
    const [coinDropCount, setCoinDropCount] = useState(1); // Nombre de lingots à faire tomber
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
    const [showJoker, setShowJoker] = useState(false);
    const [jokerTurnsLeft, setJokerTurnsLeft] = useState(0);
    const [lockedJokerPositions, setLockedJokerPositions] = useState<number[]>([]);
    const [showPower, setShowPower] = useState(false);
    const [showExp, setShowExp] = useState(false);
    const bingoAudioRef = useRef<HTMLAudioElement | null>(null);
    const [animatedPayout, setAnimatedPayout] = useState(0);
    const [isCountingUp, setIsCountingUp] = useState(false);
    const [cannotSpinUntil, setCannotSpinUntil] = useState(0);
    const [showCashout, setShowCashout] = useState(false);
    const [showRanger, setShowRanger] = useState(false);
    const [jokerVideoPlayed, setJokerVideoPlayed] = useState(false);
    const [powerVideoPlayed, setPowerVideoPlayed] = useState(false);
    const [rangerVideoPlayed, setRangerVideoPlayed] = useState(false);

    // Nouveaux états pour limiter les vidéos bonus à une seule fois par session de bonus
    const [bonusVideoPlayed, setBonusVideoPlayed] = useState({
        JOKER: false,
        BOOBA: false,
        SPARTA: false,
        EXP: false,
        POWER: false,
        RANGER: false,
        BAT: false // Ajouté
    });

    const eventQueueRef = useRef<GameEvent[]>([]);
    const playingEventRef = useRef(false);
    const [activeVideo, setActiveVideo] = useState<
      "NONE" | "BOOBA" | "SPARTA" | "JOKER" | "POWER" | "RANGER" | "EXP"
    >("NONE");
    const canSpin = credits >= bet && bet > 0 && Date.now() > cannotSpinUntil;
    const totalWon = useMemo(() => log.reduce((sum, x) => sum + x.payout, 0), [log]);
    React.useEffect(() => {
        if (!pirateAudioRef.current) {
            pirateAudioRef.current = new Audio(pirateMusic);
            pirateAudioRef.current.loop = true;
            pirateAudioRef.current.volume = 0.10; // volume réduit de 30%
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
        fadeMusic(0.5, 800); // volume réduit après événement (baissé de 0.7 à 0.5)
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
            // Correction : force l'affichage de la grille finale avant de calculer le résultat
            // On régénère la grille finale comme si le spin était allé au bout
            let finalGrid = spinGridCols();
            // Si on a des jokers verrouillés, on les restaure
            if (jokerTurnsLeft > 0) {
                const flat = finalGrid.flat();
                lockedJokerPositions.forEach(pos => {
                    const row = Math.floor(pos / 5);
                    const col = pos % 5;
                    finalGrid[row][col] = "JOKER";
                });
            }
            setReels(finalGrid);
            finalizeSpin(finalGrid);
            return;
        }
        if (!canSpin) return;
        await unlockAudioIfNeeded();
        sfx.play("click", { gain: 0.7 });
        setCredits((c) => c - bet);
        setSpinAnim(true);
        setHighlightPirates([]);
        triggerFx("SPIN", 500);
        sfx.play("spin", { gain: 0.7 });
        setSpinningCols([true, true, true, true, true]);
        setIsSpinning(true);
        
        // Arrêter le bingo en boucle avant de commencer un nouveau spin
        if (bingoAudioRef.current) {
            bingoAudioRef.current.pause();
            bingoAudioRef.current.currentTime = 0;
        }
        
        // Génère une nouvelle grille en préservant les jokers verrouillés
        let currentReels = spinGridCols();
        
        // Si on a des tours de joker actifs, restaurer les jokers aux Positions verrouillées
        if (jokerTurnsLeft > 0) {
            const flat = currentReels.flat();
            lockedJokerPositions.forEach(pos => {
                const row = Math.floor(pos / 5);
                const col = pos % 5;
                currentReels[row][col] = "JOKER";
            });
        }
        
        setReels(currentReels as SlotSymbolId[][]);
        spinTimeouts.current = [];
        spinIntervals.current = [];
        
        // Pour chaque colonne, lancer une animation de spin (images aléatoires)
        for (let col = 0; col < 5; col++) {
            spinIntervals.current[col] = setInterval(() => {
                const randomCol = Array.from({ length: 5 }, () => {
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
            }, 30);
            
            spinTimeouts.current[col] = setTimeout(() => {
                clearInterval(spinIntervals.current[col]);
                const colSymbols = spinColumn(col);
                setReels(prev => {
                    const next = prev.map(row => [...row]);
                    for (let row = 0; row < 5; row++) {
                        // Ne pas écraser les jokers verrouillés
                        const idx = row * 5 + col;
                        if (jokerTurnsLeft > 0 && lockedJokerPositions.includes(idx)) {
                            next[row][col] = "JOKER";
                        } else {
                            next[row][col] = colSymbols[row];
                        }
                    }
                    return next;
                });
                
                if (col === 4) {
                    setSpinAnim(false);
                    setSpinningCols([false, false, false, false, false]);
                    setIsSpinning(false);
                    finalizeSpin(currentReels as SlotSymbolId[][]);
                }
            }, 1200 * (col + 1));
        }
    }

    // Réinitialise les flags à la fin du bonus
    React.useEffect(() => {
        if (jokerTurnsLeft === 0) {
            setJokerVideoPlayed(false);
            setPowerVideoPlayed(false);
            setRangerVideoPlayed(false);
            setBonusVideoPlayed({ JOKER: false, BOOBA: false, SPARTA: false, EXP: false });
        }
    }, [jokerTurnsLeft]);

    // Ajout d'un flag pour stopper le bonus auto-spin
    const autoBonusStopRef = useRef(false);

    function finalizeSpin(grid?: SlotSymbolId[][]) {
        const finalGrid = grid || reels;
        let payout = 0;
        let winCombos: number[] = [];
        const flat = finalGrid.flat();
        const jokerCount = flat.filter(s => s === "JOKER").length;
        // --- Gestion des gains et highlights (inchangé) ---
        // Vérifie les jackpots
        const jackpotElephant = hasFiveElephants(finalGrid);
        const jackpotSoldat = hasFiveSoldats(finalGrid);
        // SUPPRESSION: Ne plus stopper le bonus sur jackpot
        // if (jackpotElephant || jackpotSoldat) {
        //     autoBonusStopRef.current = true;
        //     setJokerTurnsLeft(0);
        //     setLockedJokerPositions([]);
        //     setShowJoker(false);
        // }
        // --- Reste du code de calcul de gains inchangé ---
        if (jackpotElephant) {
            payout = bet * 50;
            triggerFx("JACKPOT", 1400);
            winCombos = getWinningCombos(finalGrid).filter(combo => combo.every(idx => finalGrid[Math.floor(idx/5)][idx%5] === "ELEPHANT")).flat();
            // Son d'alerte uniquement pour l'événement éléphant (vidéo booba) - volume augmenté
            const alert = new Audio(alerteSound);
            alert.volume = 0.8;
            alert.play();
            setShowCashout(true); // JACKPOT = cashout obligatoire
            setCannotSpinUntil(Date.now() + 60000); // 60s max de lock
        } else if (jackpotSoldat) {
            payout = bet * 40;
            triggerFx("BIGWIN", 1200);
            winCombos = getWinningCombos(finalGrid).filter(combo => combo.every(idx => finalGrid[Math.floor(idx/5)][idx%5] === "SOLDAT")).flat();
            setShowCashout(true); // BIGWIN = cashout obligatoire
            setCannotSpinUntil(Date.now() + 30000); // 30s max de lock
        } else {
            const flat = finalGrid.flat();
            const coinCount = flat.filter((s) => s === "COIN").length;
            if (coinCount >= 7) {
                payout = bet * 5;
                // Trouve tous les indices des COIN
                winCombos = flat.map((s, i) => s === "COIN" ? i : -1).filter(i => i !== -1);
            } else if (coinCount >= 5) {
                payout = bet * 2;
                // Trouve tous les indices des COIN
                winCombos = flat.map((s, i) => s === "COIN" ? i : -1).filter(i => i !== -1);
            }
            
            // Vérifie aussi les gains par ligne/colonne/diagonale pour d'autres symboles
            const allWinCombos = getWinningCombos(finalGrid);
            if (allWinCombos.length > 0 && payout === 0) {
                // Il y a des combo gagnants mais pas de COIN, calculer le payout
                winCombos = allWinCombos.flat();
                payout = bet * 3; // Gain standard pour une ligne complète
            }
            
            if (payout >= bet * 50) triggerFx("BIGWIN", 1000);
            else if (payout > 0) triggerFx("WIN", 800);
        }
        
        setLastPayout(Math.min(payout, 1000000)); // Limite le gain max à 1 000 000
        if (payout > 0) {
            setCredits((c) => c + Math.min(payout, 1000000));
            
            // Adapter le nombre de lingots selon le type de gain
            let coinsToShow = 1;
            if (payout >= bet * 50) {
                coinsToShow = 20; // JACKPOT : pluie de lingots !
            } else if (payout >= bet * 10) {
                coinsToShow = 10; // BIGWIN élevé : beaucoup de lingots
            } else if (payout >= bet * 5) {
                coinsToShow = 5; // BIGWIN : plusieurs lingots
            } else if (payout >= bet * 2) {
                coinsToShow = 3; // WIN moyen : quelques lingots
            }
            
            setCoinDropCount(coinsToShow);
            setShowCoinDrop(true);
            sfx.play("coins", { gain: 0.9 });
            setTimeout(() => setShowCoinDrop(false), 1200);
            if (payout >= bet * 50) sfx.play("jackpot", { gain: 1.0 });
            else if (payout >= bet * 5) sfx.play("bigwin", { gain: 0.95 });
            else sfx.play("win", { gain: 0.85 });
            
            // Ajouter bingo en loop pour les big wins et payouts supérieurs
            if (payout >= bet * 5) {
                if (!bingoAudioRef.current) {
                    bingoAudioRef.current = new Audio(bingoSound);
                    bingoAudioRef.current.loop = false; // Désactive le loop
                    bingoAudioRef.current.volume = 0.25; // Baisse le volume
                } else {
                    bingoAudioRef.current.loop = false;
                    bingoAudioRef.current.volume = 0.25;
                }
                bingoAudioRef.current.currentTime = 0;
                bingoAudioRef.current.play();
            }
        }
        
        // Highlight pirates
        // Correction : utiliser la grille affichée (reels) pour le mapping, pas la grille finale à plat
        const piratesIdx = reels.flat().map((s, i) => s === "PIRATE" ? i : -1).filter(i => i !== -1);
        setHighlightPirates(piratesIdx);
        
        // Highlight uniquement si gain - mise à jour des cases gagnantes
        if (payout > 0 && winCombos.length > 0) {
            setHighlightWins([...new Set(winCombos)]);
        } else {
            setHighlightWins([]);
        }
        
        // Gestion des jokers - compter le nombre de jokers
        if (jokerTurnsLeft > 0) {
            // On est déjà en mode bonus, on regarde les nouveaux symboles apparus
            // Ajoute 1 tour pour chaque nouveau JOKER non verrouillé
            const piratesCount = flat.filter(s => s === "PIRATE").length;
            const newJokers = flat.map((s, i) => (s === "JOKER" && !lockedJokerPositions.includes(i)) ? i : -1).filter(i => i !== -1);
            setJokerTurnsLeft(prev => prev + piratesCount + newJokers.length - 1); // -1 car on consomme un tour
            // Verrouille les nouveaux jokers
            if (newJokers.length > 0) {
                setLockedJokerPositions(prev => [...prev, ...newJokers]);
            }
            if (jokerTurnsLeft - 1 <= 0) {
                setLockedJokerPositions([]);
            }
        } else if (jokerCount >= 3) {
            // Démarre le mode bonus avec autant de tours et de jokers verrouillés que de JOKER présents
            const jokerPositions = flat.map((s, i) => s === "JOKER" ? i : -1).filter(i => i !== -1);
            setJokerTurnsLeft(jokerPositions.length);
            setLockedJokerPositions(jokerPositions);
            setShowJoker(true);
            const alert = new Audio(alerteSound);
            alert.volume = 0.8;
            alert.play();
            setTimeout(() => {
                autoBonusSpin(jokerPositions.length - 1); // 1er spin déjà fait, il en reste n-1
            }, 2000);
        }
        
        // --- Construction de la queue d'événements ---
        const events: GameEvent[] = [];
        // Détection flush total (grille 5x5 de JOKER)
        const isFullFlush = flat.every(s => s === "JOKER");
        if (isFullFlush && !bonusVideoPlayed.RANGER) {
          setLastPayout(1000000);
          setCredits((c) => c + 1000000);
          setShowCashout(true);
          setCannotSpinUntil(Date.now() + 60000);
          events.push({ type: "VIDEO_RANGER" });
          setBonusVideoPlayed(prev => ({ ...prev, RANGER: true }));
        }
        // Limite chaque vidéo à une seule fois pendant le bonus
        if (hasFiveElephants(finalGrid) && !bonusVideoPlayed.BOOBA) {
          events.push({ type: "SFX", src: alerteSound, volume: 0.9 });
          events.push({ type: "VIDEO_BOoba" });
          setBonusVideoPlayed(prev => ({ ...prev, BOOBA: true }));
        }
        if (hasFiveSoldats(finalGrid) && !bonusVideoPlayed.SPARTA) {
          events.push({ type: "SFX", src: alerteSound, volume: 0.9 });
          events.push({ type: "VIDEO_SPARTA" });
          setBonusVideoPlayed(prev => ({ ...prev, SPARTA: true }));
        }
        if (hasFiveGuns(finalGrid) && !bonusVideoPlayed.EXP) {
          events.push({ type: "SFX", src: alerteSound, volume: 0.9 });
          events.push({ type: "VIDEO_EXP" });
          setBonusVideoPlayed(prev => ({ ...prev, EXP: true }));
        }
        if (hasFiveJokers(finalGrid) && !bonusVideoPlayed.JOKER) {
          events.push({ type: "SFX", src: alerteSound, volume: 0.9 });
          events.push({ type: "VIDEO_JOKER" });
          setBonusVideoPlayed(prev => ({ ...prev, JOKER: true }));
        }
        // Ajout déclenchement vidéo chauve-souris
        if (hasFiveBats(finalGrid) && !bonusVideoPlayed.BAT) {
          events.push({ type: "SFX", src: alerteSound, volume: 0.9 });
          events.push({ type: "VIDEO_BAT" });
          setBonusVideoPlayed(prev => ({ ...prev, BAT: true }));
        }
        // mini-jeu coffre en colonnes 0/2/4
        const hasChestInCol = (col: number) => finalGrid.some(row => row[col] === "CHEST");
        if (hasChestInCol(0) && hasChestInCol(2) && hasChestInCol(4)) {
          events.push({ type: "SFX", src: rireMp3, volume: 1.0 });
          events.push({ type: "MINI_TREASURE" });
        }
        // mini-jeu carte (MAP alignés)
        const mapWinCombo = getWinningCombos(finalGrid).find(combo => combo.every(idx => flat[idx] === "MAP"));
        if (mapWinCombo) {
          events.push({ type: "MINI_MAP" });
        }
        // Lance la file
        if (events.length) enqueueEvents(events);
        
        setLog((prev) => [{ time: Date.now(), bet, reels: finalGrid, payout }, ...prev].slice(0, 30));
    }

    function handleCarteMiniGameOpen() {
        // Stoppe la musique principale
        pirateAudioRef.current?.pause();
        // Joue la musique de la chasse au trésor
        const audio = new Audio(jackMusic);
        audio.loop = true;
        audio.volume = 0.6; // volume augmenté (de 0.5 à 0.6)
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
            case "JOKER": return "#ff00ff"; // magenta/violet brillant pour le joker
            default: return "#fffbe6";
        }
    }

    // Compteur animé pour les gains
    function AnimatedCounter({ value, duration = 1200, onEnd }: { value: number, duration?: number, onEnd?: () => void }) {
        const [displayed, setDisplayed] = React.useState(0);
        React.useEffect(() => {
            let start = 0;
            let raf: number;
            const startTime = performance.now();
            function animate(now: number) {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / duration);
                const current = Math.round(progress * value);
                setDisplayed(current);
                if (progress < 1) {
                    raf = requestAnimationFrame(animate);
                } else {
                    setDisplayed(value);
                    if (onEnd) onEnd();
                }
            }
            animate(startTime);
            return () => cancelAnimationFrame(raf);
        }, [value, duration, onEnd]);
        return <span>{displayed}</span>;
    }

    // Compteur animé pour les crédits
    function AnimatedCredits({ value, onEnd }: { value: number, onEnd?: () => void }) {
        const [displayed, setDisplayed] = React.useState(value);
        const prevValue = React.useRef(value);
        React.useEffect(() => {
            if (prevValue.current === value) return;
            let raf: number;
            const start = prevValue.current;
            const end = value;
            const duration = 1200;
            const startTime = performance.now();
            function animate(now: number) {
                const elapsed = now - startTime;
                const progress = Math.min(1, elapsed / duration);
                const current = Math.round(start + (end - start) * progress);
                setDisplayed(current);
                if (progress < 1) {
                    raf = requestAnimationFrame(animate);
                } else {
                    setDisplayed(end);
                    prevValue.current = end;
                    if (onEnd) onEnd();
                }
            }
            animate(startTime);
            return () => cancelAnimationFrame(raf);
        }, [value, onEnd]);
        return <span>{displayed}</span>;
    }

    // Player d'événements séquentiel
    function enqueueEvents(events: GameEvent[]) {
      eventQueueRef.current.push(...events);
      void playNextEvent();
    }

    async function playNextEvent() {
      try {
        if (playingEventRef.current) return;
        const next = eventQueueRef.current.shift();
        if (!next) return;
        playingEventRef.current = true;
        handleEventStart();
        const done = () => {
          playingEventRef.current = false;
          handleEventEnd();
          void playNextEvent();
        };
        if (next.type === "SFX") {
          const a = new Audio(next.src);
          a.volume = next.volume ?? 1.0;
          a.play().catch(() => {});
          setTimeout(done, 150);
          return;
        }
        if (next.type.startsWith("VIDEO_")) {
          if (next.type === "VIDEO_BOoba") setActiveVideo("BOOBA");
          if (next.type === "VIDEO_SPARTA") setActiveVideo("SPARTA");
          if (next.type === "VIDEO_JOKER") setActiveVideo("JOKER");
          if (next.type === "VIDEO_POWER") setActiveVideo("POWER");
          if (next.type === "VIDEO_RANGER") setActiveVideo("RANGER");
          if (next.type === "VIDEO_EXP") setActiveVideo("EXP");
          if (next.type === "VIDEO_BAT") setActiveVideo("BAT");
          // La vidéo sera retirée dans onEnded du composant <video>
          return;
        }
        if (next.type === "MINI_TREASURE") {
          setShowMiniGame(true);
          return;
        }
        if (next.type === "MINI_MAP") {
          setShowCarteMiniGame(true);
          return;
        }
        done();
      } catch (e) {
        setActiveVideo("NONE");
        playingEventRef.current = false;
        handleEventEnd();
        alert('Erreur dans le bonus, la partie reprend.');
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
                        ref={el => { if (el) el.volume = 1.0; }}
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
                <div className="slot-grid-max" style={{height: '418px', maxHeight: '418px'}}>

                    {/* Animation de chargement (spinner) */}
                    {reels.flat().length === 0 && (
                        <div className="loader" />
                    )}

                    {reels.flat().map((sym, idx) => {
                        // Correction flush : forcer l'affichage du JOKER sur les cases verrouillées pendant le bonus
                        const isJokerLocked = jokerTurnsLeft > 0 && lockedJokerPositions.includes(idx);
                        const displaySym = isJokerLocked ? "JOKER" : sym;
                        const isWin = highlightWins.includes(idx);
                        const isJoker = displaySym === "JOKER";
                        const symbolElement = symbolImages[displaySym];
                        return (
                            <span
                                key={idx}
                                className={
                                    (spinAnim ? "card-anim spin rotate" : "card-anim") +
                                    (highlightPirates.includes(idx) && displaySym === "PIRATE" ? " pirate-highlight-multi" : "") +
                                    (isJoker ? " joker-pulse" : "") +
                                    (isWin && displaySym === "BAT" ? " bat-blink" : "") +
                                    (isWin && displaySym === "ELEPHANT" ? " elephant-blink" : "") +
                                    (isWin && displaySym === "SOLDAT" ? " soldat-blink" : "") +
                                    (isWin && displaySym === "BLUNDERBUSS" ? " gun-blink" : "")
                                }
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    minHeight: 36,
                                    width: "100%",
                                    height: "100%",
                                    boxShadow: isJoker 
                                        ? "0 0 32px 12px #ff00ff, 0 0 16px 6px #ff00ff, 0 0 8px 4px #ff00ff"
                                        : isWin ? (displaySym === "MAP"
                                            ? "0 0 24px 8px #00eaff, 0 0 0 4px #ff00ea, 0 0 32px 12px #ffe082"
                                            : displaySym === "ELEPHANT"
                                                ? "0 0 32px 12px #ffe082, 0 0 0 4px #ffe082"
                                                : `0 0 24px 8px ${getWinColor(displaySym)}, 0 0 0 4px ${getWinColor(displaySym)}`) 
                                        : "none",
                                    background: isJoker
                                        ? "linear-gradient(135deg, #ff00ff 0%, #ff00ea 50%, #8b00ff 100%)"
                                        : isWin ? (displaySym === "MAP"
                                            ? "linear-gradient(135deg, #ffe082 0%, #00eaff 50%, #ff00ea 100%)"
                                            : displaySym === "ELEPHANT"
                                                ? "#ffe08244"
                                                : getWinColor(displaySym) + "22") 
                                        : "transparent",
                                    borderRadius: (isWin || isJoker) ? 12 : 0,
                                    border: isJoker
                                        ? "3px solid #ff00ff"
                                        : isWin ? (displaySym === "MAP"
                                            ? "2px solid #00eaff"
                                            : displaySym === "ELEPHANT"
                                                ? "2px solid #ffe082"
                                                : `2px solid ${getWinColor(displaySym)}`) 
                                        : "none",
                                    transition: "box-shadow 0.2s, background 0.2s, border 0.2s"
                                }}
                            >
                                {symbolElement
    ? React.cloneElement(symbolElement, {
        style: {
            height: '11.5vw', maxHeight: 110, width: 'auto', maxWidth: '90%', objectFit: 'contain',
            // PAS de background pour le lingot
            // Glow spécial pour l'éléphant gagnant
            boxShadow:
                isWin && displaySym === "ELEPHANT"
                    ? "0 0 32px 16px #ffe082, 0 0 64px 32px #ffd700, 0 0 128px 64px #fffbe6"
                    : displaySym === "COIN"
                        ? "0 0 16px 4px #ffe08244"
                        : displaySym === "CHEST"
                            ? "0 0 16px 4px #8d6e6344"
                            : undefined,
            borderRadius: displaySym === "COIN" || displaySym === "CHEST" ? 8 : undefined
        }
    })
    : <span style={{ color: 'red', fontWeight: 700 }}>?</span>
                                }
                            </span>
                        );
                    })}

                    {/* Overlay SVG pour relier les cases gagnantes, seulement si gain */}
                    {highlightWins.length >= 2 && <WinLineOverlay winIndexes={highlightWins} />}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                  {showCashout ? (
                    <button
                      className="spin-btn"
                      onClick={() => { setShowCashout(false); setCannotSpinUntil(0); }}
                      style={{ minWidth: 120, minHeight: 44, fontSize: 22, background: '#ffd700', color: '#222', fontWeight: 900 }}
                    >
                      Encaisser
                    </button>
                  ) : (
                    <button
                      className="spin-btn"
                      onClick={spin}
                      disabled={!canSpin && !isSpinning}
                      style={{ minWidth: 120, minHeight: 44, fontSize: 22 }}
                    >
                      {isSpinning ? 'STOP' : 'SPIN'}
                    </button>
                  )}
                </div>
            </div>

            {/* Historique - N'affiche que les gains */}
            <div style={{
                position: "absolute",
                left: 0,
                bottom: 64,
                width: "100vw",
                color: "#ffe082",
                fontSize: 18,
                textAlign: "left",
                padding: "0",
                zIndex: 2000,
                pointerEvents: "none"
            }}>
                <div style={{
                    display: "inline-block",
                    background: "rgba(20,20,30,0.85)",
                    padding: "8px 16px",
                    borderRadius: "12px 12px 0 0",
                    marginLeft: "24px",
                    boxShadow: "0 -2px 16px #000a"
                }}>
                    <b>Historique</b>
                </div>
                <div style={{
                    display: "flex",
                    gap: 12,
                    overflowX: 'auto',
                    maxWidth: '100vw',
                    padding: '12px 24px',
                    background: 'transparent',
                    pointerEvents: "auto"
                }}>
                    {log.filter(x => x.payout > 0).map((x) => {
                        // Déterminer le symbole gagnant (le plus fréquent dans la grille)
                        const flat = x.reels.flat();
                        const symbolCount: Record<SlotSymbolId, number> = {} as any;
                        flat.forEach(s => {
                            symbolCount[s] = (symbolCount[s] || 0) + 1;
                        });
                        const winningSymbol = Object.entries(symbolCount)
                            .sort((a, b) => b[1] - a[1])[0][0] as SlotSymbolId;
                        const symbolElement = symbolImages[winningSymbol];
                        
                        return (
                            <div
                                key={x.time}
                                style={{
                                    display: "flex",
                                    gap: 10,
                                    alignItems: "center",
                                    padding: "8px 12px",
                                    fontSize: 16,
                                    color: '#ffe082',
                                    background: 'rgba(30,30,40,0.85)',
                                    borderRadius: 8,
                                    boxShadow: '0 2px 8px #000a',
                                    border: '1px solid rgba(255, 224, 130, 0.2)',
                                    minWidth: "fit-content"
                                }}
                            >
                                <span style={{ fontSize: 14, opacity: 0.8, fontWeight: 600, whiteSpace: "nowrap" }}>
                                    {new Date(x.time).toLocaleTimeString()}
                                </span>
                                <span style={{ fontSize: 14, opacity: 0.75, whiteSpace: "nowrap" }}>
                                    Mise: {x.bet}
                                </span>
                                <div style={{ 
                                    display: "flex", 
                                    justifyContent: "center", 
                                    alignItems: "center", 
                                    background: "#222", 
                                    borderRadius: 6, 
                                    boxShadow: "0 0 12px rgba(255, 224, 130, 0.5)", 
                                    padding: 4,
                                    border: "2px solid rgba(255, 224, 130, 0.3)"
                                }}>
                                    {symbolElement
                                        ? React.cloneElement(symbolElement, { style: { height: 48, width: 'auto', maxWidth: 52, objectFit: 'contain', display: 'block' } })
                                        : <span style={{ color: 'red', fontWeight: 700 }}>?</span>
                                    }
                                </div>
                                <span style={{ fontWeight: 700, color: '#fffbe6', fontSize: 16, whiteSpace: "nowrap" }}>
                                    +{x.payout}
                                </span>
                            </div>
                        );
                    })}
                    {log.filter(x => x.payout > 0).length === 0 && (
                        <div style={{ opacity: 0.7, padding: "8px 12px", background: 'rgba(30,30,40,0.85)', borderRadius: 8 }}>
                            Aucun gain pour l'instant.
                        </div>
                    )}
                </div>
            </div>
            {/* Crédits en bas de page */}
            <div style ={{
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
    <b>Crédits :</b> <AnimatedCredits value={credits} /> &nbsp;|&nbsp; <b>Mise :</b> {bet} &nbsp;|&nbsp; <b>Dernier gain :</b> <AnimatedCounter value={lastPayout} /> &nbsp;|&nbsp; <b>Total gagné :</b> {totalWon}
    {jokerTurnsLeft > 0 && (
        <span style={{ 
            marginLeft: 16, 
            padding: "4px 12px", 
            background: "linear-gradient(135deg, #ff00ff 0%, #ff00ea 50%, #8b00ff 100%)",
            borderRadius: 8,
            fontWeight: 700,
            boxShadow: "0 0 16px 4px #ff00ff",
            animation: "jokerPulse 1.5s ease-in-out infinite"
        }}>
            🃏 TOURS BONUS : {jokerTurnsLeft}
        </span>
    )}
</div>

            {/* FX visuels */}
            {showBat && <BatAnimation />}
            {showCoinDrop && <CoinDropAnimation count={coinDropCount} />}
            {showShot && <BlunderbussShotAnimation />}

            {/* Overlay vidéo */}
            {activeVideo !== "NONE" && (
  <div style={{
    position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
    background: "rgba(0,0,0,0.45)", // Fond semi-transparent pour laisser voir le jeu
    zIndex: 9999,
    display: "flex", alignItems: "center", justifyContent: "center",
    pointerEvents: "none"
  }}>
    <video
      src={
        activeVideo === "BOOBA" ? boobaVideo :
        activeVideo === "SPARTA" ? spartaVideo :
        activeVideo === "JOKER" ? jokerVideo :
        activeVideo === "POWER" ? powerVideo :
        activeVideo === "RANGER" ? rangerVideo :
        activeVideo === "BAT" ? require('./videos/bat.mp4') :
        expVideo
      }
      autoPlay
      controls={false}
      muted={false}
      style={{
        maxWidth: "96vw", maxHeight: "92vh",
        borderRadius: 24,
        boxShadow: "0 0 64px 16px #000, 0 0 32px 8px #ffe082",
        opacity: 0.7,
        pointerEvents: "none",
        border: "4px solid #ffe082"
      }}
      ref={el => { if (el) el.volume = 1.0; }}
      onEnded={() => {
        setActiveVideo("NONE");
        handleEventEnd();
        playingEventRef.current = false;
        void playNextEvent();
      }}
      onError={() => {
        setActiveVideo("NONE");
        handleEventEnd();
        playingEventRef.current = false;
        void playNextEvent();
      }}
    />
  </div>
)}

            {/* Mini-jeu Chasse au Trésor */}
            {showMiniGame && (
                <MiniTreasureGame
                    onClose={() => {
                      setShowMiniGame(false);
                      playingEventRef.current = false;
                      void playNextEvent();
                    }}
                    onWin={(reward) => {
                        setCredits(c => c + reward);
                        setShowMiniGame(false);
                        playingEventRef.current = false;
                        void playNextEvent();
                    }}
                />
            )}
            {/* Mini-jeu Carte au Trésor (MAP x3) */}
            {showCarteMiniGame && (
                <CarteMiniGame
                    onClose={() => {
                      handleCarteMiniGameClose();
                      setShowCarteMiniGame(false);
                      playingEventRef.current = false;
                      void playNextEvent();
                    }}
                    onWin={(reward) => {
                        setCredits(c => c + reward);
                        handleCarteMiniGameClose();
                        setShowCarteMiniGame(false);
                        playingEventRef.current = false;
                        void playNextEvent();
                    }}
                    lingotImg={lingotImg}
                />
            )}
        </div>
    );
}

function hasFiveJokers(grid: SlotSymbolId[][]): boolean {
    // Compte le nombre de JOKER sur toute la grille, peu importe la position
    const flat = grid.flat();
    return flat.filter(s => s === "JOKER").length >= 5;
}

// Ajout de la fonction autoBonusSpin pour gérer les spins bonus et décrémenter jokerTurnsLeft
async function autoBonusSpin(turnsLeft: number) {
    if (autoBonusStopRef.current || turnsLeft <= 0) {
        setJokerTurnsLeft(0);
        setLockedJokerPositions([]);
        setShowJoker(false);
        return;
    }
    setJokerTurnsLeft(turnsLeft);
    setTimeout(async () => {
        await spin();
        if (!autoBonusStopRef.current && turnsLeft - 1 > 0) {
            autoBonusSpin(turnsLeft - 1);
        } else {
            setJokerTurnsLeft(0);
            setLockedJokerPositions([]);
            setShowJoker(false);
        }
    }, 1200);
}
