import React, { useState } from "react";
import PirateSlotsGame from "./PirateSlotsGame";
import casinoImg from "./images/casino.png";

export default function App() {
  const [showGame, setShowGame] = useState(false);

  if (!showGame) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a1a",
        }}
      >
        <img
          src={casinoImg}
          alt="Casino"
          style={{
            maxWidth: 400,
            width: "90%",
            borderRadius: 16,
            boxShadow: "0 4px 32px #0008",
          }}
        />
        <h1
          style={{
            color: "#ffe082",
            marginTop: 32,
            fontSize: 40,
            textShadow: "2px 2px 8px #000",
          }}
        >
          Treasor Cruse
        </h1>
        <button
          style={{
            marginTop: 32,
            padding: "16px 32px",
            fontSize: 24,
            background: "#ff9800",
            color: "#222",
            border: "none",
            borderRadius: 12,
            boxShadow: "0 2px 8px #000",
            cursor: "pointer",
          }}
          onClick={() => setShowGame(true)}
        >
          Jouer
        </button>
      </div>
    );
  }

  return <PirateSlotsGame />;
}
