import { useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const C = {
  darkGreen: "#0A3323", moss: "#839958", beige: "#F7F4D5",
  rosy: "#D3968C", muted: "#8aab90", good: "#4caf7d", warn: "#d4a843", bad: "#c0503a",
};
const TEXT = {
  onDark: "#F7F4D5",
  onDarkMuted: "rgba(247,244,213,0.76)",
  onDarkSoft: "rgba(247,244,213,0.55)",
};

const scoreColor  = (s) => s >= 70 ? C.good : s >= 50 ? C.warn : C.bad;
const scoreLabel  = (s) => s >= 85 ? "Excellent" : s >= 70 ? "Good" : s >= 50 ? "Moderate" : s >= 30 ? "Poor" : "At Risk";
const metricColor = (good, warn) => good ? C.good : warn ? C.warn : C.bad;

function HoverCard({ children, style }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...style,
        transform:  hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow:  hovered ? `0 8px 32px rgba(10,51,35,0.18), 0 0 0 1px ${C.moss}33` : `0 2px 12px rgba(10,51,35,0.10)`,
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {children}
    </div>
  );
}

export default function FinancialHealth({ data, onRefresh }) {
  const [calcOpen, setCalcOpen] = useState(false);
  if (!data) return null;
  const m = data.metrics || {};

  const w = m.scoreWeights || { emergencyFund: 25, savings: 25, debt: 20, investment: 15, spending: 15 };

  const savingsRatePct    = m.savingsRatio != null ? +((m.savingsRatio) * 100).toFixed(1) : null;
  const debtToIncomePct   = m.debtToIncome != null ? +((m.debtToIncome) * 100).toFixed(1) : null;
  const emergencyMonths   = m.emergencyFundMonths != null ? +m.emergencyFundMonths.toFixed(1) : null;
  const investmentRatePct = m.investmentRatio != null ? +((m.investmentRatio) * 100).toFixed(1) : null;
  const spendingRatioPct  = m.spendingRatio != null ? +((m.spendingRatio) * 100).toFixed(1) : null;
  const spendShow         = m.spendingRatioDisplayLabel ?? (spendingRatioPct != null ? `${spendingRatioPct}%` : "—");
  const monthlyNetSav     = +(m.monthlyNetSavings ?? m.monthlySavings ?? 0).toFixed(0);
  const monthlyFreeCash   = +(m.monthlyFreeCash ?? 0).toFixed(0);
  const monthlyInvested   = +(m.monthlyInvestments ?? 0).toFixed(0);
  const monthlyIncome     = +(m.monthlyIncome       || 0).toFixed(0);
  const monthlyExpenses   = +(m.monthlyExpenses     || 0).toFixed(0);
  const monthlyDebtPmt    = +(m.monthlyDebtPayment  || 0).toFixed(0);
  const emergencyLabel    = m.emergencyLabel        || "";
  const spendingRatioLabel= m.spendingRatioLabel    || "";
  const incomeZeroWarn    = m.incomeZeroWarning;

  const efDisplay = m.emergencyFundProvided && emergencyMonths != null
    ? `${emergencyMonths} mo`
    : "No data provided";
  const efSub = m.emergencyFundProvided && emergencyMonths != null
    ? (emergencyLabel ? `${emergencyLabel} — target 3 mo` : "target: 3 months")
    : "Add balance under My Financial Data";

  const metrics = [
    { label: "Net savings rate", value: savingsRatePct != null ? `${savingsRatePct}%` : "—", sub: `₹${Number(monthlyNetSav).toLocaleString()}/mo after expenses & debt`, good: savingsRatePct != null && savingsRatePct >= 20, warn: savingsRatePct != null && savingsRatePct >= 10 && savingsRatePct < 20, hint: savingsRatePct == null ? "Needs income > 0" : savingsRatePct >= 20 ? "Above 20% target" : savingsRatePct >= 10 ? `Need ${(20 - savingsRatePct).toFixed(1)}% more` : "Critically low" },
    { label: "Debt-to-Income", value: debtToIncomePct != null ? `${debtToIncomePct}%` : "—", sub: `₹${Number(monthlyDebtPmt).toLocaleString()}/mo payments`, good: debtToIncomePct != null && debtToIncomePct <= 10, warn: debtToIncomePct != null && debtToIncomePct > 10 && debtToIncomePct <= 20, hint: debtToIncomePct == null ? "Needs income > 0" : debtToIncomePct === 0 ? "No debt 🎉" : debtToIncomePct <= 10 ? "Low debt pressure" : debtToIncomePct <= 20 ? "Moderate risk zone" : debtToIncomePct > 50 ? "Dangerously high" : "Above safe limit" },
    { label: "Emergency Fund", value: efDisplay, sub: efSub, good: emergencyMonths != null && emergencyMonths >= 3, warn: emergencyMonths != null && emergencyMonths >= 1 && emergencyMonths < 3, hint: emergencyMonths == null ? "Not estimated from cash flow" : emergencyMonths >= 6 ? "Fully funded" : emergencyMonths >= 3 ? "Minimum met" : emergencyMonths < 1 ? "Critical" : "Below minimum" },
    { label: "Investment Rate", value: investmentRatePct != null ? `${investmentRatePct}%` : "—", sub: `₹${Number(monthlyInvested).toLocaleString()}/mo invested`, good: investmentRatePct != null && investmentRatePct >= 10, warn: investmentRatePct != null && investmentRatePct > 0 && investmentRatePct < 10, hint: investmentRatePct == null ? "—" : investmentRatePct >= 10 ? "On track" : investmentRatePct === 0 ? "Not investing" : "Below 10% target" },
    { label: "Spending Ratio", value: spendShow, sub: (m.spendingRatioOverDisplayCap ? "Shown capped at >500% — " : "") + (spendingRatioLabel ? `${spendingRatioLabel} — expenses ÷ income` : "expenses ÷ income"), good: spendingRatioPct != null && spendingRatioPct <= 60, warn: spendingRatioPct != null && spendingRatioPct > 60 && spendingRatioPct < 70, hint: spendingRatioPct == null ? "—" : m.expensesFarExceedIncome ? "Check data" : spendingRatioPct <= 60 ? "Within range" : spendingRatioPct < 70 ? "Elevated" : spendingRatioPct <= 90 ? "High" : "Severe" },
  ];

  const sc = scoreColor(data.score);

  const chartS = savingsRatePct ?? 0;
  const chartD = debtToIncomePct ?? 0;
  const chartE = emergencyMonths ?? 0;
  const chartI = investmentRatePct ?? 0;
  const chartP = Math.min(m.spendingRatioDisplayPercent ?? spendingRatioPct ?? 0, 100);

  const chartData = {
    labels: ["Net sav %", "Debt %", "Emergency (mo)", "Investment %", "Spending %"],
    datasets: [{
      data: [chartS, chartD, chartE, chartI, chartP],
      backgroundColor: [
        metricColor(chartS >= 20, chartS >= 10),
        metricColor(chartD <= 20, chartD <= 35),
        metricColor(chartE >= 3, chartE >= 1),
        metricColor(chartI >= 10, chartI > 0),
        metricColor(chartP <= 60, chartP <= 80),
      ],
      borderRadius: 8, borderSkipped: false,
    }],
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Financial Health</h1>
          <p style={s.sub}>Your complete financial picture — updated from your latest data.</p>
        </div>
        {onRefresh && <button type="button" style={s.refreshBtn} onClick={onRefresh}>🔄 Refresh</button>}
      </div>

      {m.extremeSpendingWarning && (
        <div style={s.extremeBanner} role="alert">
          <strong style={{ color: C.warn }}>Data check:</strong>{" "}
          <span style={{ color: TEXT.onDark }}>{m.extremeSpendingWarning}</span>
        </div>
      )}
      {m.suspiciousDataDetected && (
        <div style={{ ...s.extremeBanner, border: `1px solid ${C.bad}66`, background: "rgba(192,80,58,0.14)" }} role="alert">
          <strong style={{ color: C.bad }}>Behavioral validation warning:</strong>{" "}
          <span style={{ color: TEXT.onDark }}>
            Some entries look unrealistic, so your score includes a data-quality penalty
            {m.suspiciousDataPenalty ? ` (${m.suspiciousDataPenalty} points)` : ""}.
            {Array.isArray(m.behavioralWarnings) && m.behavioralWarnings.length > 0 ? ` ${m.behavioralWarnings[0]}` : ""}
          </span>
        </div>
      )}

      <div style={s.calcSection}>
        <button type="button" style={s.calcToggle} onClick={() => setCalcOpen(o => !o)} aria-expanded={calcOpen}>
          {calcOpen ? "▼" : "▶"} How this score is calculated
        </button>
        {calcOpen && (
          <div style={s.calcBody}>
            <p style={s.calcP}>Your score (0–100) is a <strong>weighted average</strong> of five component scores (each 0–100). Weights: Emergency fund {w.emergencyFund}%, Net savings rate {w.savings}%, Debt {w.debt}%, Investments {w.investment}%, Spending {w.spending}%.</p>
            <ul style={s.calcList}>
              <li><strong>Net savings</strong> = Monthly income − Monthly expenses − Monthly debt payments.</li>
              <li><strong>Free cash</strong> = Net savings − Investments (monthly averages).</li>
              <li><strong>Net savings rate</strong> = Net savings ÷ Income (when income &gt; 0).</li>
              <li><strong>Debt score</strong> uses debt payments ÷ income (DTI), mapped to bands (e.g. under 10% of income scores highest).</li>
              <li><strong>Emergency fund</strong> uses your saved balance ÷ monthly expenses (months covered); we do not guess this if you did not enter a balance.</li>
              <li><strong>Spending ratio</strong> = Expenses ÷ Income. For display, values above 500% show as <strong>&gt;500%</strong> so the UI stays readable; scoring still uses the true ratio.</li>
            </ul>
            <p style={{ ...s.calcP, fontSize: "0.8rem", color: TEXT.onDarkSoft }}>The model also performs behavioral validation. Unrealistic patterns (for example 0% spending with non-zero income or 80%+ investing) trigger warnings and score penalties to prevent artificial score inflation.</p>
          </div>
        )}
      </div>

      <div style={s.topGrid}>
        <HoverCard style={s.scoreCard}>
          <p style={s.scoreLbl}>Overall Score</p>
          <div style={s.scoreRow}>
            <span style={{ ...s.scoreNum, color: sc }}>{data.score}</span>
            <div style={s.scoreRight}>
              <span style={{ ...s.scoreBadge, background: `${sc}22`, color: sc, border: `1px solid ${sc}44` }}>{scoreLabel(data.score)}</span>
              {data.biggestWeakness && data.biggestWeakness !== "None" && <p style={s.weakTag}>⚠️ Focus: <strong>{data.biggestWeakness}</strong></p>}
              {data.biggestWeaknessDetail && <p style={s.weakDetail}>{data.biggestWeaknessDetail}</p>}
            </div>
          </div>
          <div style={s.arcBg}><div style={{ ...s.arcFill, width: `${Math.min(100, data.score)}%`, background: `linear-gradient(90deg, ${sc}88, ${sc})` }} /></div>
          <p style={s.arcLbl}>{data.score} / 100</p>
          {incomeZeroWarn && (
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.82rem", color: C.warn, fontWeight: "600", lineHeight: 1.45 }}>
              {m.incomeZeroMessage || "Income is zero — financial metrics may not be meaningful."}
            </p>
          )}
        </HoverCard>

        <div style={s.summaryGrid}>
          {[
            { label: "Monthly Income",   value: `₹${Number(monthlyIncome).toLocaleString()}`,   color: C.good },
            { label: "Monthly Expenses", value: `₹${Number(monthlyExpenses).toLocaleString()}`, color: C.rosy },
            { label: "Net Savings",      value: `₹${Number(monthlyNetSav).toLocaleString()}`,   color: C.moss, sub: "Income − expenses − debt" },
            { label: "Invested Amount",  value: `₹${Number(monthlyInvested).toLocaleString()}`, color: "#5a7a9e", sub: "per month (avg)" },
            { label: "Free Cash Left",   value: `₹${Number(monthlyFreeCash).toLocaleString()}`, color: monthlyFreeCash >= 0 ? C.good : C.bad, sub: "Net savings − investments" },
            { label: "Debt Payments",    value: `₹${Number(monthlyDebtPmt).toLocaleString()}`,  color: C.warn },
          ].map(item => (
            <HoverCard key={item.label} style={s.summaryCard}>
              <p style={s.summaryLbl}>{item.label}</p>
              <p style={{ ...s.summaryVal, color: item.color }}>{item.value}</p>
              {item.sub && <p style={{ fontSize: "0.68rem", color: C.muted, margin: "0.25rem 0 0", lineHeight: 1.35 }}>{item.sub}</p>}
            </HoverCard>
          ))}
        </div>
      </div>

      <div style={s.metricsGrid}>
        {metrics.map(mc => {
          const color = metricColor(mc.good, mc.warn);
          return (
            <HoverCard key={mc.label} style={{ ...s.metricCard, borderTop: `3px solid ${color}` }}>
              <p style={s.metricLbl}>{mc.label}</p>
              <p style={{ ...s.metricVal, color }}>{mc.value}</p>
              <p style={s.metricSub}>{mc.sub}</p>
              <div style={{ ...s.hintPill, background: `${color}18`, color }}>{mc.hint}</div>
            </HoverCard>
          );
        })}
      </div>

      <div style={s.bottomGrid}>
        <HoverCard style={s.chartCard}>
          <p style={s.sectionTitle}>Metrics at a Glance</p>
          <Bar data={chartData} options={{
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (c) => {
                    const y = c.parsed.y;
                    if (c.dataIndex === 2) return ` ${y} months (emergency runway)`;
                    if (c.dataIndex === 4) {
                      const full = m.spendingRatioDisplayLabel || `${y}%`;
                      return ` Spending: ${full} (bar capped at 100 for scale)`;
                    }
                    return ` ${y}%`;
                  },
                },
              },
            },
            scales: {
              y: { beginAtZero: true, suggestedMax: 100, grid: { color: `${C.moss}18` }, ticks: { color: C.muted } },
              x: { grid: { display: false }, ticks: { color: C.muted, font: { size: 11 } } },
            },
          }} />
        </HoverCard>

        {m.normalizedScores && (
          <HoverCard style={s.normCard}>
            <p style={s.sectionTitle}>Score Breakdown</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { label: "Emergency Fund", score: m.normalizedScores.emergencyFund, weight: `${w.emergencyFund}%`, detail: emergencyMonths != null ? `${emergencyMonths}mo` : "—" },
                { label: "Savings",        score: m.normalizedScores.savings,       weight: `${w.savings}%`, detail: savingsRatePct != null ? `${savingsRatePct}%` : "—" },
                { label: "Debt",           score: m.normalizedScores.debt,          weight: `${w.debt}%`, detail: debtToIncomePct != null ? `${debtToIncomePct}% DTI` : "—" },
                { label: "Investments",    score: m.normalizedScores.investment,    weight: `${w.investment}%`, detail: investmentRatePct != null ? `${investmentRatePct}%` : "—" },
                { label: "Spending",       score: m.normalizedScores.spending,      weight: `${w.spending}%`, detail: spendShow },
              ].map(n => {
                const c = n.score >= 70 ? C.good : n.score >= 40 ? C.warn : C.bad;
                return (
                  <div key={n.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "600", color: C.darkGreen }}>{n.label}</span>
                      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                        <span style={{ fontSize: "0.72rem", color: C.muted }}>{n.detail}</span>
                        <span style={{ fontSize: "0.72rem", color: C.muted }}>w:{n.weight}</span>
                        <span style={{ fontSize: "0.82rem", fontWeight: "700", color: c }}>{n.score?.toFixed(0)}/100</span>
                      </div>
                    </div>
                    <div style={s.barBg}><div style={{ ...s.barFill, width: `${n.score || 0}%`, background: `linear-gradient(90deg, ${c}88, ${c})` }} /></div>
                  </div>
                );
              })}
            </div>
          </HoverCard>
        )}
      </div>
    </div>
  );
}

const s = {
  root:         { fontFamily: "'Inter','Poppins',-apple-system,sans-serif", background: C.darkGreen, borderRadius: "18px", padding: "1.75rem 2rem 2rem", boxSizing: "border-box" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" },
  title:        { fontSize: "1.6rem", fontWeight: "800", color: TEXT.onDark, margin: 0, letterSpacing: "-0.5px" },
  sub:          { fontSize: "0.85rem", color: TEXT.onDarkMuted, marginTop: "0.25rem", lineHeight: 1.5 },
  refreshBtn:   { padding: "0.5rem 1.1rem", background: "rgba(247,244,213,0.12)", color: TEXT.onDark, border: `1px solid ${C.moss}66`, borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", fontFamily: "inherit" },
  extremeBanner:{ marginBottom: "1.25rem", padding: "0.85rem 1rem", borderRadius: "12px", border: `1px solid ${C.warn}55`, background: "rgba(212,168,67,0.12)", fontSize: "0.84rem", lineHeight: 1.55 },
  calcSection:  { marginBottom: "1.35rem" },
  calcToggle:   { background: "rgba(247,244,213,0.1)", border: `1px solid ${C.moss}44`, color: TEXT.onDark, padding: "0.55rem 0.9rem", borderRadius: "10px", cursor: "pointer", fontSize: "0.82rem", fontWeight: "600", fontFamily: "inherit", width: "100%", textAlign: "left" },
  calcBody:     { marginTop: "0.75rem", padding: "1rem 1.1rem", borderRadius: "12px", background: "rgba(247,244,213,0.08)", border: `1px solid ${C.moss}33` },
  calcP:        { margin: "0 0 0.65rem", fontSize: "0.84rem", color: TEXT.onDarkMuted, lineHeight: 1.6 },
  calcList:     { margin: "0 0 0.5rem", paddingLeft: "1.2rem", color: TEXT.onDarkMuted, fontSize: "0.82rem", lineHeight: 1.65 },
  topGrid:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" },
  scoreCard:    { background: C.beige, borderRadius: "16px", padding: "1.5rem 2rem", cursor: "default" },
  scoreLbl:     { fontSize: "0.75rem", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.5rem" },
  scoreRow:     { display: "flex", alignItems: "flex-start", gap: "1.25rem", marginBottom: "1.25rem" },
  scoreNum:     { fontSize: "4.5rem", fontWeight: "800", lineHeight: 1, letterSpacing: "-2px" },
  scoreRight:   { display: "flex", flexDirection: "column", gap: "0.4rem", paddingTop: "0.5rem" },
  scoreBadge:   { display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.82rem", fontWeight: "700" },
  weakTag:      { fontSize: "0.78rem", color: C.warn, margin: 0 },
  weakDetail:   { fontSize: "0.72rem", color: C.muted, margin: 0, lineHeight: 1.5, maxWidth: "260px" },
  arcBg:        { background: `${C.darkGreen}18`, borderRadius: "999px", height: "8px", overflow: "hidden" },
  arcFill:      { height: "8px", borderRadius: "999px", transition: "width 0.6s ease" },
  arcLbl:       { fontSize: "0.72rem", color: C.muted, marginTop: "0.4rem", textAlign: "right" },
  summaryGrid:  { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" },
  summaryCard:  { background: C.beige, borderRadius: "12px", padding: "1rem 1.25rem", cursor: "default" },
  summaryLbl:   { fontSize: "0.72rem", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.4px", margin: 0 },
  summaryVal:   { fontSize: "1.2rem", fontWeight: "800", margin: "0.3rem 0 0", letterSpacing: "-0.3px" },
  metricsGrid:  { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "1.25rem" },
  metricCard:   { background: C.beige, borderRadius: "12px", padding: "1rem 1.1rem", cursor: "default" },
  metricLbl:    { fontSize: "0.72rem", fontWeight: "600", color: C.muted, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 0.4rem" },
  metricVal:    { fontSize: "1.6rem", fontWeight: "800", margin: 0, letterSpacing: "-0.5px" },
  metricSub:    { fontSize: "0.72rem", color: C.muted, margin: "0.2rem 0 0.5rem" },
  hintPill:     { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: "600" },
  bottomGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" },
  chartCard:    { background: C.beige, borderRadius: "16px", padding: "1.5rem", cursor: "default" },
  normCard:     { background: C.beige, borderRadius: "16px", padding: "1.5rem", cursor: "default" },
  sectionTitle: { fontSize: "0.82rem", fontWeight: "700", color: C.darkGreen, textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 1.25rem" },
  barBg:        { background: `${C.darkGreen}15`, borderRadius: "999px", height: "7px", overflow: "hidden" },
  barFill:      { height: "7px", borderRadius: "999px", transition: "width 0.5s ease" },
};
