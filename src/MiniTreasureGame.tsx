import { useState } from "react";

type Boat = {
  id: number;
  hasTreasure: boolean;
  sunk: boolean;
};

export default function MiniTreasureGame({
  onClose,
  onWin
}: {
  onClose: () => void;
  onWin: (reward: number) => void;
}) {
  const [boats, setBoats] = useState<Boat[]>(() => {
    const treasureIndex = Math.floor(Math.random() * 9);
    return Array.from({ length: 9 }, (_, i) => ({
      id: i,
      hasTreasure: i === treasureIndex,
      sunk: false
    }));
  });

  const [shotsLeft, setShotsLeft] = useState(3);
  const [finished, setFinished] = useState(false);

  function shootBoat(id: number) {
    if (finished || shotsLeft <= 0) return;

    setBoats(prev =>
      prev.map(b =>
        b.id === id ? { ...b, sunk: true } : b
      )
    );

    const boat = boats.find(b => b.id === id);
    if (!boat) return;

    if (boat.hasTreasure) {
      setFinished(true);
      onWin(200); // 💰 gain
    } else {
      const left = shotsLeft - 1;
      setShotsLeft(left);
      if (left === 0) setFinished(true);
    }
  }

  return (
    <div className="miniGameOverlay">
      <h2>🏴‍☠️ Chasse au Trésor</h2>
      <p>Tirs restants : {shotsLeft}</p>

      <div className="boatGrid">
        {boats.map(b => (
          <button
            key={b.id}
            className={`boat ${b.sunk ? "sunk" : ""}`}
            onClick={() => shootBoat(b.id)}
          >
            {b.sunk ? (b.hasTreasure ? "🪙💎" : "💥🌊") : "🚢"}
          </button>
        ))}
      </div>

      <button onClick={onClose} style={{ marginTop: 16 }}>
        Quitter
      </button>
    </div>
  );
}
