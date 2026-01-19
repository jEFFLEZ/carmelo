import { useState } from "react";
import marineImg from "./images/marine.png";
import saphirImg from "./images/saphir.png";
import rubisImg from "./images/rubis.png";
import opaleImg from "./images/opale.png";
import saphirSound from "./audio/saphir.mp3";
import rubisSound from "./audio/rubis.mp3";
import opaleSound from "./audio/opale.mp3";
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
      <div className="boatGrid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 'clamp(12px, 3vw, 24px)',
        width: 'clamp(280px, 90vw, 450px)',
        maxWidth: '100%',
        margin: '0 auto',
        padding: 'clamp(8px, 2vw, 16px)'
      }}>
        {boats.map((b) => (
          <button
            key={b.id}
            className={`boat ${b.sunk ? "sunk" : ""}`}
            onClick={() => shootBoat(b.id)}
            disabled={b.sunk || finished}
            style={{
              padding: '0',
              background: 'rgba(30, 30, 40, 0.8)',
              border: '2px solid rgba(255, 224, 130, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              aspectRatio: '1/1',
              minWidth: 0,
              minHeight: 0,
              maxWidth: '100%',
              maxHeight: '100%',
              cursor: (b.sunk || finished) ? 'not-allowed' : 'pointer',
              opacity: (b.sunk || finished) ? 0.5 : 1,
              transition: 'all 0.2s ease',
              overflow: 'hidden',
            }}
            onMouseDown={(e) => {
              if (!b.sunk && !finished) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 16px rgba(255, 224, 130, 0.6)';
              }
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 8px rgba(255, 224, 130, 0.3)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 8px rgba(255, 224, 130, 0.3)';
            }}
            onMouseEnter={(e) => {
              if (!b.sunk && !finished) {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(255, 224, 130, 0.5)';
              }
            }}
          >
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(4px, 1.5vw, 8px)'
            }}>
              {!b.sunk ? (
                <img
                  src={marineImg}
                  alt="bateau"
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
                />
              ) : b.diamond ? (
                <img
                  src={b.diamond.img}
                  alt={b.diamond.alt}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
                />
              ) : (
                <span style={{ fontSize: 'clamp(28px, 5vw, 42px)', lineHeight: 1 }}>💥</span>
              )}
            </div>
          </button>
        ))}
      </div>
      {showResult && (
        <div
          style={{
            marginTop: 'clamp(12px, 3vw, 24px)',
            fontSize: 'clamp(16px, 4vw, 24px)',
            color: "#ffe082",
            textAlign: 'center',
            fontWeight: 700
          }}
        >
          Gain total : {totalWin} crédits
        </div>
      )}
      <button
        onClick={handleClose}
        style={{ 
          marginTop: 'clamp(12px, 3vw, 20px)', 
          opacity: showResult ? 1 : 0.5, 
          pointerEvents: showResult ? 'auto' : 'none',
          padding: 'clamp(10px, 2vw, 14px) clamp(20px, 4vw, 28px)',
          fontSize: 'clamp(14px, 3.5vw, 18px)',
          borderRadius: '8px',
          background: '#ff9800',
          color: '#222',
          border: 'none',
          cursor: showResult ? 'pointer' : 'not-allowed',
          fontWeight: 700,
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
        }}
      >
        Quitter
      </button>
    </div>
  );
}