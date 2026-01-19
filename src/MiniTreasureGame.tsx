import { useState } from "react";
import marineImg from "./images/marine.png";
import saphirImg from "./images/saphir.png";
import rubisImg from "./images/rubis.png";
import opaleImg from "./images/opale.png";
import saphirSound from "./audio/saphir.m4a";
import rubisSound from "./audio/rubis.m4a";
import opaleSound from "./audio/opale.m4a";
import drapImg from "./images/drap.png";

const diamonds = [
  { img: opaleImg, reward: 500, alt: "opale (gros gain)", sound: opaleSound },
  { img: rubisImg, reward: 300, alt: "rubis (gain moyen)", sound: rubisSound },
  { img: saphirImg, reward: 150, alt: "saphir (petit gain)", sound: saphirSound },
];

type Boat = {
  id: number;
  diamond: { img: string; reward: number; alt: string; sound: string } | null;
  sunk: boolean;
};

export default function MiniTreasureGame({
  onClose,
  onWin,
}: {
  onClose: () => void;
  onWin: (reward: number) => void;
}) {
  const [boats, setBoats] = useState<Boat[]>(() => {
    const indexes = [0, 1, 2, 3, 4, 5, 6, 7, 8]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return Array.from({ length: 9 }, (_, i) => ({
      id: i,
      diamond: indexes.includes(i)
        ? diamonds[indexes.indexOf(i)]
        : null,
      sunk: false,
    }));
  });

  const [shotsLeft, setShotsLeft] = useState(3);
  const [finished, setFinished] = useState(false);
  const [totalWin, setTotalWin] = useState(0);
  const [showResult, setShowResult] = useState(false);

  function shootBoat(id: number) {
    if (finished || shotsLeft <= 0) return;
    setBoats((prev) => prev.map((b) => (b.id === id ? { ...b, sunk: true } : b)));
    const boat = boats.find((b) => b.id === id);
    if (!boat) return;
    if (boat.diamond) {
      setTotalWin((w) => w + boat.diamond.reward);
      // Joue le son associé à la pierre précieuse
      const audio = new Audio(boat.diamond.sound);
      audio.play();
    }
    const left = shotsLeft - 1;
    setShotsLeft(left);
    if (left === 0) {
      setFinished(true);
      setShowResult(true);
    }
  }

  function handleClose() {
    if (showResult) {
      onWin(totalWin);
      onClose();
    }
  }

  return (
    <div className="miniGameOverlay">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
        <img src={drapImg} alt="drapeau pirate" style={{ height: 48, verticalAlign: 'middle' }} />
        <h2 style={{ margin: 0 }}>Chasse au Trésor</h2>
      </div>
      <p>Tirs restants : {shotsLeft}</p>
      <div className="boatGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, width: 480, margin: '0 auto' }}>
        {boats.map((b) => (
          <button
            key={b.id}
            className={`boat ${b.sunk ? "sunk" : ""}`}
            onClick={() => shootBoat(b.id)}
            disabled={b.sunk || finished}
            style={{
              padding: 0,
              background: 'none',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              aspectRatio: '1/1',
              minWidth: 0,
              minHeight: 0,
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          >
            {!b.sunk ? (
              <img
                src={marineImg}
                alt="bateau"
                style={{ width: '90%', height: '90%', objectFit: 'contain', display: 'block' }}
              />
            ) : b.diamond ? (
              <img
                src={b.diamond.img}
                alt={b.diamond.alt}
                style={{ width: '90%', height: '90%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <span style={{ fontSize: 48 }}>💥🌊</span>
            )}
          </button>
        ))}
      </div>
      {showResult && (
        <div
          style={{
            marginTop: 18,
            fontSize: 22,
            color: "#ffe082",
          }}
        >
          Gain total : {totalWin} crédits<br />
        </div>
      )}
      <button
        onClick={handleClose}
        style={{ marginTop: 16, opacity: showResult ? 1 : 0.5, pointerEvents: showResult ? 'auto' : 'none' }}
      >
        Quitter
      </button>
    </div>
  );
}