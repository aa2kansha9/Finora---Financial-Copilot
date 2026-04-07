import { useState, useEffect } from "react";

const C = {
  darkGreen: "#0A3323",
  moss:      "#839958",
  beige:     "#F7F4D5",
  rosyBrown: "#D3968C",
  white:     "#FFFFFF",
  textMuted: "#5a6a5e",
};

const INSIGHTS = [
  {
    stat:  "₹2.4L",
    label: "average monthly savings unlocked by users who track spending",
    quote: "Clarity is the first step to wealth.",
  },
  {
    stat:  "68%",
    label: "of people overspend in categories they never consciously track",
    quote: "What gets measured, gets managed.",
  },
  {
    stat:  "3×",
    label: "faster emergency fund growth when you set a monthly savings target",
    quote: "Small habits compound into financial freedom.",
  },
  {
    stat:  "₹0",
    label: "is the cost of knowing exactly where your money goes",
    quote: "Awareness is the most underrated financial tool.",
  },
  {
    stat:  "83%",
    label: "of financially secure people review their expenses at least once a month",
    quote: "A monthly review is worth more than a yearly resolution.",
  },
  {
    stat:  "6mo",
    label: "emergency fund is the single most impactful financial safety net you can build",
    quote: "Security is not a luxury — it's a foundation.",
  },
  {
    stat:  "₹500",
    label: "invested monthly from age 25 can grow to over ₹1 crore by retirement",
    quote: "Time in the market beats timing the market.",
  },
  {
    stat:  "47%",
    label: "of Indians have no formal investment outside of a savings account",
    quote: "Idle money is quietly losing value every day.",
  },
  {
    stat:  "21days",
    label: "is all it takes to form a consistent savings habit that sticks long-term",
    quote: "Discipline starts small and compounds fast.",
  },
  {
    stat:  "1%",
    label: "increase in savings rate each month can transform your financial trajectory in 5 years",
    quote: "Progress, not perfection, builds wealth.",
  },
];

export default function AuthLayout({ mode, onSubmit, error }) {
  const [idx, setIdx]         = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % INSIGHTS.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const insight = INSIGHTS[idx];
  const isLogin = mode === "login";

  return (
    <div style={s.root}>

      {/* ── Global header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={s.headerMark}>F</div>
          <span style={s.headerTitle}>Finora</span>
        </div>
      </div>

      {/* ── Split body below header */}
      <div style={s.body}>

        {/* Left: form panel — beige fading into dark green at the right edge */}
        <div style={s.formPanel}>
          <div style={s.formInner}>

            <h1 style={s.heading}>
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p style={s.subheading}>
              {isLogin
                ? "Sign in to your financial dashboard"
                : "Start your journey to financial clarity"}
            </p>

            {error && (
              <div style={s.errorBox}>
                <span style={{ marginRight: "0.4rem" }}>⚠</span>{error}
              </div>
            )}

            {onSubmit}
          </div>
        </div>

        {/* Right: editorial panel */}
        <div style={s.rightPanel}>
          <div style={s.gridOverlay} />
          <div style={s.rightInner}>
            <div style={{
              ...s.insightBlock,
              opacity:   visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
            }}>
              <p style={s.statNumber}>{insight.stat}</p>
              <p style={s.statLabel}>{insight.label}</p>
              <p style={s.quoteText}>"{insight.quote}"</p>
            </div>

            <div style={s.dots}>
              {INSIGHTS.map((_, i) => (
                <div key={i} style={{ ...s.dot, background: i === idx ? C.moss : `${C.moss}44` }} />
              ))}
            </div>

            <p style={s.tagline}>Finora · Your financial co-pilot</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export function AuthInput({ type = "text", placeholder, value, onChange, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...s.input,
        borderColor: focused ? C.moss : "#d4d9cc",
        boxShadow:   focused ? `0 0 0 3px ${C.moss}22` : "none",
        outline:     "none",
      }}
    />
  );
}

export function AuthButton({ children, loading }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...s.button,
        background: hovered ? "#0d4530" : C.darkGreen,
        transform:  hovered ? "translateY(-1px)" : "none",
        boxShadow:  hovered ? `0 6px 20px ${C.darkGreen}44` : `0 2px 8px ${C.darkGreen}22`,
        opacity:    loading ? 0.7 : 1,
        cursor:     loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

const s = {
  // Root fills viewport, stacks header + body vertically
  root: {
    display:       "flex",
    flexDirection: "column",
    height:        "100vh",
    width:         "100vw",
    fontFamily:    "'Inter', 'Poppins', -apple-system, sans-serif",
    overflow:      "hidden",
    background:    C.darkGreen,
  },

  // ── Header bar
  header: {
    width:          "100%",
    background:     C.darkGreen,
    padding:        "0 2.5rem",
    height:         "56px",
    display:        "flex",
    alignItems:     "center",
    flexShrink:     0,
    borderBottom:   `1px solid ${C.moss}22`,
    zIndex:         10,
  },
  headerInner: {
    display:    "flex",
    alignItems: "center",
    gap:        "0.6rem",
  },
  headerMark: {
    width:          "30px",
    height:         "30px",
    borderRadius:   "8px",
    background:     C.moss,
    color:          C.darkGreen,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontWeight:     "800",
    fontSize:       "1rem",
  },
  headerTitle: {
    fontSize:      "1.1rem",
    fontWeight:    "700",
    color:         C.beige,
    letterSpacing: "-0.3px",
  },

  // ── Body: horizontal split below header
  body: {
    display:  "flex",
    flex:     1,
    overflow: "hidden",
  },

  // Left panel: beige → dark green gradient flowing right
  formPanel: {
    width:          "50%",
    minWidth:       "360px",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    background:     C.beige,
    padding:        "2rem",
    zIndex:         2,
  },
  formInner: {
    width:         "100%",
    maxWidth:      "360px",
    display:       "flex",
    flexDirection: "column",
  },

  heading: {
    fontSize:      "1.75rem",
    fontWeight:    "700",
    color:         C.darkGreen,
    lineHeight:    "1.2",
    marginBottom:  "0.4rem",
    letterSpacing: "-0.5px",
  },
  subheading: {
    fontSize:     "0.9rem",
    color:        C.textMuted,
    marginBottom: "1.75rem",
    lineHeight:   "1.5",
  },

  errorBox: {
    background:   `${C.rosyBrown}18`,
    border:       `1px solid ${C.rosyBrown}55`,
    color:        "#8b3a2f",
    padding:      "0.65rem 0.9rem",
    borderRadius: "8px",
    fontSize:     "0.85rem",
    marginBottom: "1rem",
    display:      "flex",
    alignItems:   "center",
  },

  input: {
    width:        "100%",
    padding:      "0.75rem 1rem",
    borderRadius: "10px",
    border:       "1.5px solid #d4d9cc",
    fontSize:     "0.95rem",
    color:        C.darkGreen,
    background:   C.white,
    marginBottom: "0.85rem",
    transition:   "border-color 0.2s, box-shadow 0.2s",
    boxSizing:    "border-box",
    fontFamily:   "inherit",
  },

  button: {
    width:         "100%",
    padding:       "0.85rem",
    borderRadius:  "10px",
    border:        "none",
    color:         C.beige,
    fontSize:      "0.95rem",
    fontWeight:    "600",
    marginTop:     "0.25rem",
    transition:    "background 0.2s, transform 0.15s, box-shadow 0.2s",
    fontFamily:    "inherit",
    letterSpacing: "0.2px",
  },

  // Right panel: solid dark green
  rightPanel: {
    flex:           1,
    background:     C.darkGreen,
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    position:       "relative",
    overflow:       "hidden",
  },
  gridOverlay: {
    position:        "absolute",
    inset:           0,
    backgroundImage: `linear-gradient(${C.moss}12 1px, transparent 1px), linear-gradient(90deg, ${C.moss}12 1px, transparent 1px)`,
    backgroundSize:  "48px 48px",
    pointerEvents:   "none",
  },
  rightInner: {
    position:      "relative",
    zIndex:        1,
    padding:       "3rem",
    maxWidth:      "520px",
    display:       "flex",
    flexDirection: "column",
    alignItems:    "flex-start",
    gap:           "2rem",
  },

  insightBlock: { transition: "opacity 0.4s ease, transform 0.4s ease" },
  statNumber:   { fontSize: "5rem", fontWeight: "800", color: C.beige, lineHeight: "1", marginBottom: "0.75rem", letterSpacing: "-2px" },
  statLabel:    { fontSize: "1.1rem", color: `${C.beige}bb`, lineHeight: "1.6", marginBottom: "1.5rem", maxWidth: "380px", fontWeight: "400" },
  quoteText:    { fontSize: "0.9rem", color: C.moss, fontStyle: "italic", fontWeight: "500" },
  dots:         { display: "flex", gap: "0.5rem" },
  dot:          { width: "6px", height: "6px", borderRadius: "999px", transition: "background 0.3s" },
  tagline:      { fontSize: "0.78rem", color: `${C.beige}55`, letterSpacing: "0.5px", position: "absolute", bottom: "2rem", left: "3rem" },
};
