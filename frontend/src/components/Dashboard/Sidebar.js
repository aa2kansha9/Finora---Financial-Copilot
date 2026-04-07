import { NavLink } from "react-router-dom";

const C = { darkGreen: "#0A3323", moss: "#839958", beige: "#F7F4D5", muted: "#8aab90" };

const links = [
  { label: "Dashboard",         icon: "🏠", path: "/dashboard",             end: true  },
  { label: "My Financial Data", icon: "📝", path: "/dashboard/finance"                },
  { label: "Financial Health",  icon: "📊", path: "/dashboard/health"                 },
  { label: "AI Insights",       icon: "🤖", path: "/dashboard/ai-insights"            },
  { label: "Portfolio",         icon: "💼", path: "/dashboard/portfolio"              },
  { label: "Goals",             icon: "🎯", path: "/dashboard/goals"                  },
  { label: "What-If",           icon: "🔮", path: "/dashboard/simulator"              },
  { label: "Can I Afford?",     icon: "💳", path: "/dashboard/afford"                 },
  { label: "Insight History",   icon: "📜", path: "/dashboard/history"                },
];

export default function Sidebar() {
  return (
    <div style={s.sidebar}>
      {/* Logo */}
      <div style={s.logoRow}>
        <div style={s.logoMark}>F</div>
        <span style={s.logoText}>Finora</span>
      </div>

      <nav style={{ flex: 1, overflowY: "auto" }}>
        {links.map((l) => (
          <NavLink
            key={l.path}
            to={l.path}
            end={l.end}
            style={({ isActive }) => ({
              ...s.link,
              background:  isActive ? `${C.moss}22` : "transparent",
              color:       isActive ? C.beige : C.muted,
              borderLeft:  isActive ? `3px solid ${C.moss}` : "3px solid transparent",
            })}
          >
            <span style={{ fontSize: "1rem", width: "20px", textAlign: "center" }}>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <p style={s.footer}>Finora · v1.0</p>
    </div>
  );
}

const s = {
  sidebar:  { width: "220px", background: C.darkGreen, height: "100vh", padding: "1.5rem 0.75rem 1rem", display: "flex", flexDirection: "column", position: "fixed", borderRight: `1px solid ${C.moss}18` },
  logoRow:  { display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "2rem", padding: "0 0.5rem" },
  logoMark: { width: "30px", height: "30px", borderRadius: "8px", background: C.moss, color: C.darkGreen, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "1rem", flexShrink: 0 },
  logoText: { fontSize: "1.1rem", fontWeight: "700", color: C.beige, letterSpacing: "-0.3px" },
  link:     { display: "flex", alignItems: "center", gap: "0.65rem", padding: "0.6rem 0.75rem", borderRadius: "8px", marginBottom: "0.2rem", textDecoration: "none", fontSize: "0.88rem", fontWeight: "500", transition: "background 0.2s, color 0.2s", fontFamily: "inherit" },
  footer:   { fontSize: "0.72rem", color: `${C.beige}33`, textAlign: "center", paddingTop: "1rem", borderTop: `1px solid ${C.moss}18` },
};
