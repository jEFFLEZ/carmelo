import { useState } from "react";
import marineImg from "./images/marine.png";
import saphirImg from "./images/saphir.png";
import rubisImg from "./images/rubis.png";
import opaleImg from "./images/opale.png";

const diamonds = [
	{ img: opaleImg, reward: 500, alt: "opale (gros gain)" },
	{ img: rubisImg, reward: 300, alt: "rubis (gain moyen)" },
	{ img: saphirImg, reward: 150, alt: "saphir (petit gain)" },
];

type Boat = {
	id: number;
	diamond: { img: string; reward: number; alt: string } | null;
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
		// Place 3 diamants à des positions différentes
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
	const [win, setWin] = useState<number | null>(null);

	function shootBoat(id: number) {
		if (finished || shotsLeft <= 0) return;
		setBoats((prev) => prev.map((b) => (b.id === id ? { ...b, sunk: true } : b)));
		const boat = boats.find((b) => b.id === id);
		if (!boat) return;
		if (boat.diamond) {
			setFinished(true);
			setWin(boat.diamond.reward);
			onWin(boat.diamond.reward);
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
				{boats.map((b) => (
					<button
						key={b.id}
						className={`boat ${b.sunk ? "sunk" : ""}`}
						onClick={() => shootBoat(b.id)}
						disabled={b.sunk || finished}
					>
						{!b.sunk ? (
							<img
								src={marineImg}
								alt="bateau"
								style={{ width: 48, height: 48 }}
							/>
						) : b.diamond ? (
							<img
								src={b.diamond.img}
								alt={b.diamond.alt}
								style={{ width: 36, height: 36 }}
							/>
						) : (
							"💥🌊"
						)}
					</button>
				))}
			</div>
			{win && (
				<div
					style={{
						marginTop: 18,
						fontSize: 22,
						color: "#ffe082",
					}}
				>
					Bravo ! Tu as trouvé une pierre précieuse et gagné {win} crédits !
				</div>
			)}
			<button onClick={onClose} style={{ marginTop: 16 }}>
				Quitter
			</button>
		</div>
	);
}