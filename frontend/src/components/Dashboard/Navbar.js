import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const C = { darkGreen: "#0A3323", moss: "#839958", beige: "#F7F4D5", rosy: "#D3968C", muted: "#5a6a5e" };

const SHIMMER_STYLE = document.createElement("style");
SHIMMER_STYLE.textContent = `
  @keyframes kypShimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes kypPulse {
    0%, 100% { box-shadow: 0 0 8px 2px #83995866, 0 2px 16px #83995833; }
    50%       { box-shadow: 0 0 18px 6px #839958aa, 0 4px 28px #83995855; }
  }
`;
if (!document.getElementById("kyp-style")) {
  SHIMMER_STYLE.id = "kyp-style";
  document.head.appendChild(SHIMMER_STYLE);
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pHovered, setPHovered] = useState(false);

  return (
    <div style={s.navbar}>
      <div style={s.left}>
        <div style={s.avatar}>{(user?.name?.[0] || "U").toUpperCase()}</div>
        <div>
          <p style={s.name}>{user?.name || "User"}</p>
          <p style={s.email}>{user?.email || ""}</p>
        </div>
      </div>
      <div style={s.right}>
        <button
          style={{
            ...s.kypBtn,
            ...(pHovered ? s.kypBtnHover : {}),
          }}
          onMouseEnter={() => setPHovered(true)}
          onMouseLeave={() => setPHovered(false)}
          onClick={() => navigate("/dashboard/personality")}
        >
          Know Your Personality
        </button>
        <button
          style={s.logoutBtn}
          onClick={() => { logout(); navigate("/login"); }}
          onMouseEnter={e => e.currentTarget.style.background = "#b5302a"}
          onMouseLeave={e => e.currentTarget.style.background = `${C.rosy}cc`}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

const s = {
  navbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0.85rem 2rem", background: "#fff", borderBottom: "1px solid #e8e4d4",
  },
  left:  { display: "flex", alignItems: "center", gap: "0.75rem" },
  right: { display: "flex", alignItems: "center", gap: "0.75rem" },
  avatar: {
    width: "34px", height: "34px", borderRadius: "50%",
    background: C.darkGreen, color: C.beige,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: "700", fontSize: "0.9rem", flexShrink: 0,
  },
  name:  { fontWeight: "600", color: C.darkGreen, fontSize: "0.9rem", margin: 0 },
  email: { color: "#a0a89a", fontSize: "0.75rem", margin: 0 },
  kypBtn: {
    padding: "0.45rem 1.1rem",
    background: `linear-gradient(110deg, ${C.darkGreen} 0%, #1a4d2e 40%, ${C.moss} 60%, #1a4d2e 80%, ${C.darkGreen} 100%)`,
    backgroundSize: "200% auto",
    color: C.beige,
    border: `1px solid ${C.moss}99`,
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: "700",
    fontFamily: "inherit",
    letterSpacing: "0.3px",
    animation: "kypShimmer 3s linear infinite, kypPulse 2.5s ease-in-out infinite",
    transition: "transform 0.18s ease, box-shadow 0.18s ease",
    whiteSpace: "nowrap",
  },
  kypBtnHover: {
    transform: "scale(1.05)",
    boxShadow: `0 0 22px ${C.moss}99, 0 4px 20px ${C.moss}55`,
    animation: "kypShimmer 1.2s linear infinite",
  },
  logoutBtn: {
    padding: "0.45rem 1rem",
    background: `${C.rosy}cc`,
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600",
    transition: "background 0.2s",
    fontFamily: "inherit",
  },
};
