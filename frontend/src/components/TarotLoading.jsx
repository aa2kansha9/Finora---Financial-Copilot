import { useEffect, useState } from "react";

export default function TarotLoading({ onDone }) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(d => (d.length >= 3 ? "" : d + "."));
    }, 500);

    const done = setTimeout(() => {
      clearInterval(dotInterval);
      onDone?.();
    }, 5000);

    return () => {
      clearInterval(dotInterval);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div style={s.root}>
      <style>{css}</style>
      <div style={s.container}>
        {/* Tarot Reader Image Placeholder */}
        <div className="tarot-image-placeholder" style={s.imagePlaceholder}>
          <span style={s.placeholderText}>Tarot Reader Image</span>
        </div>

        {/* Crystal Ball — positioned in front of placeholder */}
        <div style={s.ballWrap}>
          <div className="crystal-ball" style={s.ball}>
            <div style={s.ballInner} />
          </div>
        </div>

        {/* Loading Text */}
        <p style={s.loadingText}>Analyzing your financial future{dots}</p>
      </div>
    </div>
  );
}

const css = `
  @keyframes crystalSpin {
    0%   { transform: rotate(0deg) scale(1); }
    50%  { transform: rotate(180deg) scale(1.08); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes crystalPulse {
    0%, 100% { box-shadow: 0 0 18px 6px #b388ff88, 0 0 40px 10px #7c3aed44; }
    50%       { box-shadow: 0 0 32px 14px #b388ffcc, 0 0 60px 20px #7c3aed88; }
  }
  @keyframes textFade {
    0%, 100% { opacity: 0.45; }
    50%       { opacity: 1; }
  }
`;

const s = {
  root: {
    position: "fixed", inset: 0,
    background: "#1a0a2e",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999,
    fontFamily: "'Inter','Poppins',-apple-system,sans-serif",
  },
  container: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem",
  },
  imagePlaceholder: {
    width: "260px", height: "275px",
    background: "linear-gradient(160deg, #2d1b4e 0%, #3b1f6b 100%)",
    border: "1.5px solid #7c3aed55",
    borderRadius: "16px",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  placeholderText: {
    color: "#b388ff88", fontSize: "0.85rem", letterSpacing: "0.5px",
  },
  ballWrap: {
    marginTop: "-44px",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  ball: {
    width: "72px", height: "72px",
    borderRadius: "50%",
    background: "radial-gradient(circle at 35% 35%, #e0c3fc, #7c3aed 60%, #3b0764)",
    animation: "crystalSpin 4s linear infinite, crystalPulse 2s ease-in-out infinite",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  ballInner: {
    width: "22px", height: "22px",
    borderRadius: "50%",
    background: "radial-gradient(circle at 40% 35%, #fff9, #b388ff44)",
  },
  loadingText: {
    color: "#d8b4fe", fontSize: "1rem", letterSpacing: "0.4px",
    animation: "textFade 1.8s ease-in-out infinite",
    margin: 0, minWidth: "260px", textAlign: "center",
  },
};
