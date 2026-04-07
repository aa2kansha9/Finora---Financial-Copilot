import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useDashboard from "../../services/useDashboard";

const C = {
  darkGreen: "#0A3323",
  moss:      "#839958",
  beige:     "#F7F4D5",
  rosy:      "#D3968C",
  white:     "#FFFFFF",
  muted:     "#5a6a5e",
};

const FEATURES = [
  { label: "Finance",     icon: "📝", path: "/dashboard/finance",      desc: "Income, expenses & debts"  },
  { label: "Health",      icon: "📊", path: "/dashboard/health",       desc: "Your financial score"      },
  { label: "AI Insights", icon: "🤖", path: "/dashboard/ai-insights",  desc: "Smart analysis"            },
  { label: "Portfolio",   icon: "💼", path: "/dashboard/portfolio",    desc: "Asset allocation"          },
  { label: "Goals",       icon: "🎯", path: "/dashboard/goals",        desc: "Track your goals"          },
  { label: "What-If",     icon: "🔮", path: "/dashboard/simulator",   desc: "Simulate decisions"        },
  { label: "Afford?",     icon: "💳", path: "/dashboard/afford",      desc: "Affordability check"       },
  { label: "History",     icon: "📜", path: "/dashboard/history",     desc: "Past AI insights"          },
];

// Perfect 360° circle — evenly spaced, 12 o'clock start
const RADIUS = 185;
function getCirclePositions(count) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      x: Math.cos(angle) * RADIUS,
      y: Math.sin(angle) * RADIUS * 0.92,
    };
  });
}
const POSITIONS = getCirclePositions(FEATURES.length);

// ── Wealth graph (no score badge)
function WealthGraph() {
  const canvasRef = useRef(null);
  const frameRef  = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const points = 120;
    const base = Array.from({ length: points }, (_, i) => {
      const trend = (i / points) * 0.55;
      const noise = Math.sin(i * 0.7) * 0.04 + Math.sin(i * 2.3) * 0.02 + (Math.random() * 0.014 - 0.007);
      return Math.max(0.05, Math.min(0.95, 0.72 - trend + noise));
    });
    let progress = 0;

    const draw = () => {
      tRef.current += 0.012;
      if (progress < 1) progress = Math.min(1, progress + 0.008);
      ctx.clearRect(0, 0, W, H);
      const n = Math.floor(progress * points);
      if (n < 2) { frameRef.current = requestAnimationFrame(draw); return; }
      const drift = Math.sin(tRef.current * 0.4) * 4;
      const pt = (i) => ({ x: (i / (points - 1)) * W, y: base[i] * H + drift });

      // Fill
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, `${C.moss}44`); grad.addColorStop(1, `${C.moss}00`);
      ctx.beginPath(); ctx.moveTo(pt(0).x, pt(0).y);
      for (let i = 1; i < n; i++) { const a = pt(i-1), b = pt(i), cx = (a.x+b.x)/2; ctx.bezierCurveTo(cx,a.y,cx,b.y,b.x,b.y); }
      ctx.lineTo(pt(n-1).x, H); ctx.lineTo(0, H); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();

      // Line
      ctx.beginPath(); ctx.moveTo(pt(0).x, pt(0).y);
      for (let i = 1; i < n; i++) { const a = pt(i-1), b = pt(i), cx = (a.x+b.x)/2; ctx.bezierCurveTo(cx,a.y,cx,b.y,b.x,b.y); }
      ctx.strokeStyle = C.moss; ctx.lineWidth = 2.5;
      ctx.shadowColor = `${C.moss}88`; ctx.shadowBlur = progress === 1 ? 8 : 0;
      ctx.stroke(); ctx.shadowBlur = 0;

      // Tip dot
      const tip = pt(n - 1);
      ctx.beginPath(); ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = C.moss; ctx.shadowColor = `${C.moss}cc`; ctx.shadowBlur = 12;
      ctx.fill(); ctx.shadowBlur = 0;

      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div style={g.wrap}>
      <p style={g.title}>Wealth Trajectory</p>
      <div style={{ ...g.chip, top: "18%", left: "8%",  animationDelay: "0s"   }}>📈 Savings on track</div>
      <div style={{ ...g.chip, top: "40%", left: "52%", animationDelay: "0.8s" }}>🛡️ EF building</div>
      <div style={{ ...g.chip, top: "65%", left: "15%", animationDelay: "1.6s" }}>💼 Portfolio active</div>
      <canvas ref={canvasRef} width={580} height={280} style={g.canvas} />
      
    </div>
  );
}

// ── Feature card — flies out from center on mount, flies back on close
function FeatureCard({ feature, pos, idx, glowing, closing, onNavigate }) {
  const [hovered, setHovered]   = useState(false);
  const [arrived, setArrived]   = useState(false);
  const isGlowing = glowing === idx;

  // On mount: after a staggered delay, flip `arrived` → card transitions from center to final pos
  useEffect(() => {
    const t = setTimeout(() => setArrived(true), 40 + idx * 38);
    return () => clearTimeout(t);
  }, [idx]);

  const bg         = hovered ? `${C.moss}e0` : isGlowing ? C.moss : "rgba(247,244,213,0.97)";
  const labelColor = hovered || isGlowing ? C.darkGreen : C.darkGreen;
  const descColor  = hovered || isGlowing ? C.darkGreen : C.muted;
  const boxShadow  = isGlowing
    ? `0 0 0 3px ${C.moss}, 0 8px 32px ${C.darkGreen}77`
    : hovered
    ? `0 0 0 2px ${C.moss}99, 0 8px 28px ${C.darkGreen}55`
    : `0 4px 16px rgba(0,0,0,0.18)`;

  // closing: transition back to center; arrived: at final position; neither: at center
  const tx = closing || !arrived ? `-50%` : `calc(-50% + ${pos.x}px)`;
  const ty = closing || !arrived ? `-50%` : `calc(-50% + ${pos.y}px)`;
  const sc = closing || !arrived ? 0.25 : isGlowing ? 1.08 : hovered ? 1.06 : 1;
  const op = closing || !arrived ? 0 : 1;

  return (
    <button
      onClick={() => !closing && onNavigate(feature, idx)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.fCard,
        background: bg,
        boxShadow,
        left:       "50%",
        top:        "50%",
        transform:  `translate(${tx}, ${ty}) scale(${sc})`,
        opacity:    op,
        transition: `transform 0.42s cubic-bezier(0.34,1.4,0.64,1) ${closing ? idx * 0.025 : 0}s,
                     opacity   0.32s ease ${closing ? idx * 0.025 : 0}s,
                     background 0.22s ease,
                     box-shadow 0.22s ease`,
        zIndex:     isGlowing ? 20 : 10,
      }}
    >
      <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{feature.icon}</span>
      <span style={{ ...s.fLabel, color: labelColor, animation: isGlowing ? "dhGlowText 0.4s ease-out" : "none" }}>
        {feature.label}
      </span>
      <span style={{ ...s.fDesc, color: descColor }}>{feature.desc}</span>
    </button>
  );
}

// ── Explore button
function ExploreButton({ open, onToggle }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.exploreBtn,
        background: open ? "#0d2e1a" : hovered ? "#6e8048" : C.moss,
        transform:  hovered && !open ? "scale(1.12)" : open ? "scale(1.04)" : "scale(1)",
        boxShadow:  hovered && !open
          ? `0 0 0 10px ${C.moss}2a, 0 10px 40px ${C.darkGreen}66`
          : open
          ? `0 0 0 6px ${C.moss}33, 0 8px 32px ${C.darkGreen}55`
          : `0 6px 28px ${C.darkGreen}55`,
        animation:  open || hovered ? "none" : "dhIdlePulse 2.8s ease-in-out infinite",
        transition: "background 0.25s ease, transform 0.22s ease, box-shadow 0.25s ease",
      }}
    >
      <span style={{ fontSize: "1.75rem", lineHeight: 1, transition: "transform 0.3s", transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>
        {open ? "✕" : "⊕"}
      </span>
      <span style={s.exploreLbl}>{open ? "Close" : "Explore"}</span>
    </button>
  );
}

// ── Know Your Personality nav button
function PersonalityNavBtn({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "0.4rem 1.1rem",
        background: `linear-gradient(110deg, ${C.darkGreen} 0%, #1a4d2e 40%, ${C.moss} 60%, #1a4d2e 80%, ${C.darkGreen} 100%)`,
        backgroundSize: "200% auto",
        color: C.beige,
        border: `1px solid ${C.moss}99`,
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "0.8rem",
        fontWeight: "700",
        fontFamily: "inherit",
        letterSpacing: "0.3px",
        whiteSpace: "nowrap",
        animation: hovered
          ? "kypShimmer 1.2s linear infinite"
          : "kypShimmer 3s linear infinite, kypPulse 2.5s ease-in-out infinite",
        transform: hovered ? "scale(1.05)" : "scale(1)",
        boxShadow: hovered
          ? `0 0 22px ${C.moss}99, 0 4px 20px ${C.moss}55`
          : `0 0 8px 2px ${C.moss}66, 0 2px 16px ${C.moss}33`,
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
      }}
    >
      Know Your Personality
    </button>
  );
}

// ── Main
export default function DashboardHome() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  // open: cards are mounted and animating out
  // closing: cards are animating back in before unmount
  const [open, setOpen]       = useState(false);
  const [closing, setClosing] = useState(false);
  const [glowing, setGlowing] = useState(null);

  useEffect(() => {
    if (document.getElementById("dh-kf")) return;
    const st = document.createElement("style");
    st.id = "dh-kf";
    st.textContent = `
      @keyframes dhCardOpen {
        0%   { opacity:0; left:50%; top:50%; transform:translate(-50%,-50%) scale(0.3); }
        60%  { opacity:1; }
        100% { opacity:1; }
      }
      @keyframes dhCardClose {
        0%   { opacity:1; }
        40%  { opacity:0.6; }
        100% { opacity:0; left:50%; top:50%; transform:translate(-50%,-50%) scale(0.3); }
      }
      @keyframes dhPulseRing { 0%{box-shadow:0 0 0 0 #83995877} 70%{box-shadow:0 0 0 24px #83995800} 100%{box-shadow:0 0 0 0 #83995800} }
      @keyframes dhIdlePulse { 0%,100%{box-shadow:0 0 0 0 #83995844,0 6px 24px #0A332344} 50%{box-shadow:0 0 0 12px #83995822,0 10px 36px #0A332366} }
      @keyframes dhGlowText  { 0%,100%{text-shadow:none} 50%{text-shadow:0 0 10px #839958,0 0 22px #83995866} }
      @keyframes dhChipFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
      @keyframes dhOverlay   { from{opacity:0} to{opacity:1} }
      @keyframes kypShimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
      @keyframes kypPulse    { 0%,100%{box-shadow:0 0 8px 2px #83995866,0 2px 16px #83995833} 50%{box-shadow:0 0 18px 6px #839958aa,0 4px 28px #83995855} }
    `;
    document.head.appendChild(st);
  }, []);

  const handleToggle = () => {
    if (open && !closing) {
      setClosing(true);
      setTimeout(() => { setOpen(false); setClosing(false); }, 680);
    } else if (!open) {
      setOpen(true);
    }
  };

  const handleNavigate = (feature, idx) => {
    setGlowing(idx);
    setTimeout(() => { setGlowing(null); setOpen(false); setClosing(false); navigate(feature.path); }, 420);
  };

  return (
    <div style={s.root}>

      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.topLogo}>
          <div style={s.topMark}>F</div>
          <span style={s.topName}>Finora</span>
        </div>
        <div style={s.topRight}>
          <PersonalityNavBtn onClick={() => navigate("/dashboard/personality")} />
          <button style={s.navBtn} onClick={() => navigate("/dashboard/about")}>About</button>
          <button style={s.navBtn} onClick={() => navigate("/dashboard/help")}>Help</button>
          <button style={s.navBtn} onClick={() => navigate("/dashboard/contact")}>Contact</button>
          <button style={s.logoutBtn} onClick={() => { logout(); navigate("/login"); }}>Sign out</button>
        </div>
      </div>

      {/* Body */}
      <div style={s.body}>

        {/* LEFT — radial menu */}
        <div style={s.leftPanel}>
          <div style={s.leftContent}>
            <h1 style={s.headline}>Your money,<br />fully in focus.</h1>
            <p style={s.subline}>Tap Explore to navigate your financial universe.</p>

            {/* Fixed-size stage so cards always have a known center */}
            <div style={s.stage}>
              {open && <div style={s.backdrop} onClick={handleToggle} />}

              {open && FEATURES.map((f, i) => (
                <FeatureCard
                  key={f.path}
                  feature={f}
                  pos={POSITIONS[i]}
                  idx={i}
                  glowing={glowing}
                  closing={closing}
                  onNavigate={handleNavigate}
                />
              ))}

              <ExploreButton open={open} onToggle={handleToggle} />
            </div>
          </div>
        </div>

        {/* RIGHT — wealth graph */}
        <div style={s.rightPanel}>
          <WealthGraph />
        </div>

      </div>
    </div>
  );
}

// ── Graph styles
const g = {
  wrap:   { position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem 2rem" },
  title:  { fontSize: "1.1rem", fontWeight: "700", color: `${C.beige}cc`, letterSpacing: "-0.3px", marginBottom: "1.5rem" },
  canvas: { width: "100%", maxWidth: "580px", height: "auto", borderRadius: "12px" },
  label:  { fontSize: "0.7rem", color: `${C.beige}33`, marginTop: "0.75rem", letterSpacing: "0.8px" },
  chip:   { position: "absolute", background: `${C.moss}1e`, border: `1px solid ${C.moss}44`, color: `${C.beige}bb`, padding: "0.28rem 0.7rem", borderRadius: "999px", fontSize: "0.73rem", fontWeight: "500", animation: "dhChipFloat 3.2s ease-in-out infinite", backdropFilter: "blur(4px)", whiteSpace: "nowrap" },
};

// ── Main styles
const s = {
  root:       { width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: C.darkGreen, fontFamily: "'Inter','Poppins',-apple-system,sans-serif", overflow: "hidden" },
  topBar:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 2rem", height: "56px", flexShrink: 0, borderBottom: `1px solid ${C.moss}22`, zIndex: 50 },
  topLogo:    { display: "flex", alignItems: "center", gap: "0.6rem" },
  topMark:    { width: "28px", height: "28px", borderRadius: "7px", background: C.moss, color: C.darkGreen, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.95rem" },
  topName:    { fontSize: "1.05rem", fontWeight: "700", color: C.beige, letterSpacing: "-0.3px" },
  topRight:   { display: "flex", alignItems: "center", gap: "1rem" },
  topUser:    { fontSize: "0.85rem", color: `${C.beige}99`, fontWeight: "500" },
  logoutBtn:  { padding: "0.35rem 0.9rem", background: `${C.rosy}33`, border: `1px solid ${C.rosy}55`, color: C.rosy, borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: "600", fontFamily: "inherit", transition: "background 0.2s" },
  navBtn:     { padding: "0.35rem 0.9rem", background: "transparent", border: "1px solid rgba(255,255,255,0.5)", color: "rgba(255,255,255,0.85)", borderRadius: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: "600", fontFamily: "inherit", transition: "color 0.18s ease, border-color 0.18s ease, background 0.18s ease" },
  body:       { display: "flex", flex: 1, overflow: "visible", minHeight: 0 },

  leftPanel:  { width: "42%", display: "flex", alignItems: "center", justifyContent: "center", borderRight: `1px solid ${C.moss}18`, position: "relative", overflow: "visible", padding: "0.5rem" },
  leftContent:{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", overflow: "visible" },
  headline:   { fontSize: "1.45rem", fontWeight: "800", color: C.beige, lineHeight: 1.2, letterSpacing: "-0.8px", textAlign: "center", margin: 0 },
  subline:    { fontSize: "0.76rem", color: `${C.beige}66`, textAlign: "center", margin: 0 },

  stage:      { position: "relative", width: "520px", height: "520px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  backdrop:   { position: "fixed", inset: 0, background: "rgba(10,51,35,0.5)", zIndex: 5, backdropFilter: "blur(3px)", animation: "dhOverlay 0.25s ease-out" },

  fCard:      { position: "absolute", width: "120px", minHeight: "90px", padding: "0.8rem 0.6rem", borderRadius: "14px", border: `1px solid ${C.moss}22`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.35rem", fontFamily: "inherit" },
  fLabel:     { fontSize: "0.75rem", fontWeight: "700", textAlign: "center", lineHeight: 1.3, color: C.darkGreen, maxWidth: "90%", wordBreak: "break-word", margin: 0 },
  fDesc:      { fontSize: "0.62rem", textAlign: "center", lineHeight: 1.3, maxWidth: "90%", wordBreak: "break-word", color: C.muted, margin: 0 },

  exploreBtn: { position: "relative", zIndex: 15, width: "86px", height: "86px", borderRadius: "50%", border: `2px solid ${C.moss}55`, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.1rem", fontFamily: "inherit" },
  exploreLbl: { fontSize: "0.58rem", fontWeight: "700", color: C.white, letterSpacing: "0.8px", textTransform: "uppercase" },

  rightPanel: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
};
