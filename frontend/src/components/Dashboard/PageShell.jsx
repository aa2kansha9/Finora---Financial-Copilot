import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const C = {
  darkGreen: "#0A3323",
  moss:      "#839958",
  beige:     "#F7F4D5",
  rosy:      "#D3968C",
  muted:     "#8aab90",
  good:      "#4caf7d",
  warn:      "#d4a843",
  bad:       "#c0503a",
};

// ── Shared card with hover lift
export function Card({ children, style }) {
  return (
    <div
      style={{ background: C.beige, borderRadius: "14px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(10,51,35,0.10)", transition: "transform 0.2s ease, box-shadow 0.2s ease", ...style }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 28px rgba(10,51,35,0.16), 0 0 0 1px ${C.moss}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "0 2px 12px rgba(10,51,35,0.10)"; }}
    >
      {children}
    </div>
  );
}

// ── Section label (use onDark when placed on the green page background, outside a Card)
export function SectionLabel({ children, onDark }) {
  return <p style={{ fontSize: "0.72rem", fontWeight: "700", color: onDark ? `${C.beige}e8` : C.muted, textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 1rem" }}>{children}</p>;
}

// ── Primary button
export function PrimaryBtn({ children, onClick, disabled, style }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: "0.7rem 1.4rem", background: hov ? "#6e8048" : C.moss, color: C.darkGreen, border: "none", borderRadius: "10px", cursor: disabled ? "not-allowed" : "pointer", fontSize: "0.9rem", fontWeight: "700", fontFamily: "inherit", opacity: disabled ? 0.6 : 1, transition: "background 0.2s", ...style }}
    >
      {children}
    </button>
  );
}

// ── Form input with focus glow
export function FInput({ label, type = "text", placeholder, value, onChange, required, min }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      {label && <label style={{ fontSize: "0.72rem", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</label>}
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={onChange} required={required} min={min}
        onFocus={e => { e.target.style.borderColor = C.moss; e.target.style.boxShadow = `0 0 0 3px ${C.moss}28`; e.target.style.outline = "none"; }}
        onBlur={e  => { e.target.style.borderColor = "rgba(131,153,88,0.3)"; e.target.style.boxShadow = "none"; }}
        style={{ padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid rgba(131,153,88,0.3)", fontSize: "0.92rem", color: C.darkGreen, background: "rgba(247,244,213,0.65)", boxSizing: "border-box", fontFamily: "inherit", width: "100%", transition: "border-color 0.2s, box-shadow 0.2s" }}
      />
    </div>
  );
}

// ── Page shell — topbar + dark green root + centered content
export default function PageShell({ title, subtitle, children }) {
  const navigate = useNavigate();

  return (
    <div style={s.root}>
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <button type="button" style={s.backBtn} onClick={() => navigate("/dashboard")}>Back</button>
          <div style={s.divider} />
          <div style={s.logo}>
            <div style={s.logoMark}>F</div>
            <span style={s.logoText}>Finora</span>
          </div>
        </div>
      </div>

      <div style={s.content}>
        {(title || subtitle) && (
          <div style={s.pageHeader}>
            {title    && <h1 style={s.pageTitle}>{title}</h1>}
            {subtitle && <p style={s.pageSub}>{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

const s = {
  root:      { minHeight: "100vh", background: C.darkGreen, fontFamily: "'Inter','Poppins',-apple-system,sans-serif", display: "flex", flexDirection: "column" },
  topBar:    { display: "flex", justifyContent: "flex-start", alignItems: "center", padding: "0 2.5rem", height: "56px", flexShrink: 0, borderBottom: `1px solid ${C.moss}22`, background: `${C.darkGreen}f0`, backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 50 },
  topLeft:   { display: "flex", alignItems: "center", gap: "1rem" },
  backBtn:   { background: "none", border: `1px solid ${C.moss}66`, color: `${C.beige}e8`, padding: "0.35rem 0.9rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.84rem", fontWeight: "600", fontFamily: "inherit" },
  divider:   { width: "1px", height: "20px", background: `${C.moss}44` },
  logo:      { display: "flex", alignItems: "center", gap: "0.5rem" },
  logoMark:  { width: "26px", height: "26px", borderRadius: "7px", background: C.moss, color: C.darkGreen, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.88rem" },
  logoText:  { fontSize: "1rem", fontWeight: "700", color: C.beige, letterSpacing: "-0.3px" },
  content:   { padding: "2rem 2.5rem 3rem", flex: 1, maxWidth: "1200px", width: "100%", margin: "0 auto", boxSizing: "border-box" },
  pageHeader:{ marginBottom: "1.75rem" },
  pageTitle: { fontSize: "1.7rem", fontWeight: "800", color: C.beige, margin: 0, letterSpacing: "-0.5px" },
  pageSub:   { fontSize: "0.88rem", color: `${C.beige}cc`, marginTop: "0.35rem", lineHeight: 1.5 },
};
