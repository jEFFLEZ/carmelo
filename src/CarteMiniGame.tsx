import React, { useState } from "react";
import carteImg from "./images/carte.png";

export default function CarteMiniGame({ onClose, onWin, lingotImg }: { onClose: () => void; onWin: (reward: number) => void; lingotImg: string }) {
  // Coordonnées des 3 croix (en pourcentage de l'image)
  const crossZones = [
    { left: "22%", top: "38%" },
    { left: "53%", top: "60%" },
    { left: "75%", top: "28%" }
  ];
  const [goldIndex, setGoldIndex] = useState(() => Math.floor(Math.random() * crossZones.length));
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [message, setMessage] = useState("");

  function handleClick(idx: number) {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    if (idx === goldIndex) {
      setMessage("Bravo ! Tu as trouvé le lingot d'or !");
      setTimeout(() => onWin(100), 1200);
    } else {
      setMessage("Raté ! Pas de lingot ici...");
    }
  }

  function handleReplay() {
    setGoldIndex(Math.floor(Math.random() * crossZones.length));
    setSelected(null);
    setRevealed(false);
    setMessage("");
  }

  return (
    <div style={{
      position: "fixed",
      left: 0, top: 0, width: "100vw", height: "100vh",
      background: "rgba(0,0,0,0.85)",
      zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ position: "relative", width: 520, height: 340, background: "#222", borderRadius: 16, boxShadow: "0 4px 32px #000" }}>
        <img src={carteImg} alt="Carte au trésor" style={{ width: "100%", height: "100%", borderRadius: 16, objectFit: "cover" }} />
        {/* Zones cliquables sur les croix */}
        {crossZones.map((pos, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            disabled={revealed}
            style={{
              position: "absolute",
              left: pos.left,
              top: pos.top,
              width: 44, height: 44,
              background: "transparent",
              border: revealed && idx === goldIndex ? "2px solid gold" : "2px solid #c00",
              borderRadius: "50%",
              cursor: revealed ? "default" : "pointer",
              transform: "translate(-50%, -50%)",
              zIndex: 2,
              outline: idx === selected ? "2px solid #ffe082" : "none",
              boxShadow: revealed && idx === goldIndex ? "0 0 16px 4px gold" : "0 0 8px 2px #c00"
            }}
          >
            {/* Affiche le lingot si gagné */}
            {revealed && idx === goldIndex ? <img src={lingotImg} alt="Lingot d'or" style={{ width: 32, height: 32, objectFit: 'contain' }} /> : null}
          </button>
        ))}
        {/* Message résultat */}
        {revealed && (
          <div style={{
            position: "absolute", left: 0, bottom: 12, width: "100%", textAlign: "center", color: "#ffe082", fontSize: 24, fontWeight: 700, textShadow: "1px 1px 8px #000"
          }}>{message}</div>
        )}
        {/* Boutons */}
        <div style={{ position: "absolute", right: 16, top: 16, zIndex: 10, display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ fontSize: 18, padding: "6px 16px", borderRadius: 8, border: "none", background: "#222", color: "#ffe082", cursor: "pointer" }}>Fermer</button>
          <button onClick={handleReplay} style={{ fontSize: 18, padding: "6px 16px", borderRadius: 8, border: "none", background: "#ffe082", color: "#222", cursor: "pointer" }}>Rejouer</button>
        </div>
      </div>
    </div>
  );
}
