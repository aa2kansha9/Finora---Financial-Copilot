import { useNavigate } from "react-router-dom";
import FinancialHealth from "../components/FinancialHealth/FinancialHealth.jsx";
import useDashboard from "../services/useDashboard";

const C = { darkGreen: "#0A3323", moss: "#839958", beige: "#F7F4D5", rosy: "#D3968C", muted: "#8aab90" };

export default function Home() {
  const navigate                                  = useNavigate();
  const { data, loading, error, authError, refresh } = useDashboard();
  const health    = data?.financialHealth;
  const dataState = health?.dataState;

  const renderContent = () => {
    if (loading) return (
      <div style={s.center}>
        <div style={s.spinner} />
        <p style={s.loadingText}>Loading your financial health...</p>
      </div>
    );

    if (error) return (
      <div style={s.errorBox}>
        <p style={{ margin: 0 }}>⚠️ {error}</p>
        {authError
          ? <button style={s.retryBtn} onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/login"; }}>Log In Again</button>
          : <button style={s.retryBtn} onClick={refresh}>Retry</button>
        }
      </div>
    );

    if (dataState === "no_data") return (
      <div style={s.stateCard}>
        <p style={s.stateIcon}>📊</p>
        <h3 style={s.stateTitle}>No Financial Data Yet</h3>
        <p style={s.stateMsg}>Go to <strong>📝 My Financial Data</strong> to add your income, expenses, debts, and investments.</p>
        <p style={s.stateMsg}>Your financial health score will appear here automatically.</p>
        <button style={s.ctaBtn} onClick={() => navigate("/dashboard/finance")}>Add Financial Data →</button>
      </div>
    );

    if (dataState === "partial_data") return (
      <div style={s.stateCard}>
        <p style={s.stateIcon}>⚠️</p>
        <h3 style={s.stateTitle}>Income Required to Calculate Score</h3>
        <p style={s.stateMsg}>Financial ratios like savings rate, debt-to-income, and emergency fund all require your income as a base.</p>
        {health?.partialSummary?.length > 0 && (
          <div style={s.partialBox}>
            <p style={s.partialLabel}>Data found so far:</p>
            {health.partialSummary.map((item, i) => <p key={i} style={s.partialItem}>✓ {item}</p>)}
          </div>
        )}
        <button style={s.ctaBtn} onClick={() => navigate("/dashboard/finance")}>Add Income →</button>
      </div>
    );

    if ((dataState === "complete" || (!dataState && health?.metrics && typeof health.metrics.monthlyIncome === "number")) && health) {
      return <FinancialHealth data={health} onRefresh={refresh} />;
    }

    return null;
  };

  return (
    <div style={s.root}>
      {/* Top bar */}
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

      {/* Content */}
      <div style={s.content}>
        {renderContent()}
      </div>
    </div>
  );
}

const s = {
  root:        { minHeight: "100vh", background: "#f5f3e8", fontFamily: "'Inter','Poppins',-apple-system,sans-serif", display: "flex", flexDirection: "column" },
  topBar:      { display: "flex", justifyContent: "flex-start", alignItems: "center", padding: "0 2.5rem", height: "56px", flexShrink: 0, borderBottom: `1px solid ${C.moss}22`, background: C.darkGreen, position: "sticky", top: 0, zIndex: 50 },
  topLeft:     { display: "flex", alignItems: "center", gap: "1rem" },
  backBtn:     { background: "none", border: `1px solid ${C.moss}66`, color: `${C.beige}e8`, padding: "0.35rem 0.9rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.84rem", fontWeight: "600", fontFamily: "inherit" },
  divider:     { width: "1px", height: "20px", background: `${C.moss}44` },
  logo:        { display: "flex", alignItems: "center", gap: "0.5rem" },
  logoMark:    { width: "26px", height: "26px", borderRadius: "7px", background: C.moss, color: C.darkGreen, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.88rem" },
  logoText:    { fontSize: "1rem", fontWeight: "700", color: C.beige, letterSpacing: "-0.3px" },
  content:     { padding: "2rem 2.5rem 3rem", flex: 1 },
  center:      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "50vh", gap: "1rem" },
  spinner:     { width: "38px", height: "38px", border: `4px solid ${C.moss}33`, borderTop: `4px solid ${C.moss}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  loadingText: { color: C.muted, fontSize: "0.95rem" },
  errorBox:    { background: `${C.rosy}15`, border: `1px solid ${C.rosy}44`, padding: "1.25rem 1.5rem", borderRadius: "12px", color: "#8b3a2f", display: "flex", alignItems: "center", gap: "1rem" },
  retryBtn:    { padding: "0.45rem 1rem", background: C.rosy, color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 },
  stateCard:   { textAlign: "center", padding: "3rem 2rem", maxWidth: "480px", margin: "3rem auto", background: C.beige, borderRadius: "16px", boxShadow: "0 4px 24px rgba(10,51,35,0.10)" },
  stateIcon:   { fontSize: "3rem", marginBottom: "1rem" },
  stateTitle:  { color: C.darkGreen, fontSize: "1.4rem", marginBottom: "0.75rem", fontWeight: "700" },
  stateMsg:    { color: C.muted, fontSize: "0.92rem", lineHeight: "1.7", marginBottom: "0.5rem" },
  partialBox:  { background: `${C.moss}15`, border: `1px solid ${C.moss}33`, borderRadius: "10px", padding: "1rem 1.5rem", margin: "1.25rem auto", textAlign: "left", maxWidth: "340px" },
  partialLabel:{ color: C.darkGreen, fontWeight: "600", fontSize: "0.85rem", margin: "0 0 0.5rem" },
  partialItem: { color: C.darkGreen, fontSize: "0.88rem", margin: "0.25rem 0" },
  ctaBtn:      { marginTop: "1.25rem", padding: "0.65rem 1.5rem", background: C.darkGreen, color: C.beige, border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "0.9rem", fontWeight: "600", fontFamily: "inherit" },
};
