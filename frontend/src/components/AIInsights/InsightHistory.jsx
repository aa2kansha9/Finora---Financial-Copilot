import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from "chart.js";
import api from "../../services/api";
import PageShell, { C, Card, SectionLabel } from "../Dashboard/PageShell.jsx";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const STATUS = {
  improved: { color: C.good, bg: `${C.good}0f`, border: `${C.good}44`, label: "Improved"  },
  worse:    { color: C.bad,  bg: `${C.bad}0f`,  border: `${C.bad}44`,  label: "Declined"  },
  same:     { color: C.muted,bg: `${C.muted}0f`,border: `${C.muted}33`,label: "No Change" },
};

const SEV_COLOR = { high: C.bad, medium: C.warn, low: C.moss, good: C.good, warning: C.bad, suggestion: C.moss, achievement: C.good, risk_alert: C.bad };

export default function InsightHistory() {
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get("/financial/ai/insights/history")
      .then(r => setLogs(r.data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const chartData = logs.length > 1 ? {
    labels: [...logs].reverse().map(l => { const d = new Date(l.generatedAt); return `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`; }),
    datasets: [{
      data: [...logs].reverse().map(l => l.score),
      borderColor: C.moss, backgroundColor: `${C.moss}18`, fill: true, tension: 0.4,
      pointBackgroundColor: [...logs].reverse().map(l => l.status === "improved" ? C.good : l.status === "worse" ? C.bad : C.moss),
      pointRadius: 5,
    }],
  } : null;

  return (
    <PageShell title="Insight History" subtitle="Track how your financial health score has changed over time.">

      {loading && <p style={{ color: `${C.beige}66` }}>Loading history...</p>}

      {!loading && logs.length === 0 && (
        <Card style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: C.muted }}>No history yet. Visit AI Insights to generate your first report.</p>
        </Card>
      )}

      {chartData && (
        <Card style={{ marginBottom: "1.5rem" }}>
          <SectionLabel>Score Trend</SectionLabel>
          <Line data={chartData} options={{
            responsive: true,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` Score: ${c.parsed.y}` } } },
            scales: {
              y: { min: 0, max: 100, ticks: { stepSize: 20, color: C.muted }, grid: { color: `${C.moss}18` } },
              x: { ticks: { color: C.muted }, grid: { display: false } },
            },
          }} />
        </Card>
      )}

      {logs.map((log, i) => {
        const cfg   = STATUS[log.status] || STATUS.same;
        const date  = new Date(log.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        const isOpen = expanded === i;
        const prev  = logs[i + 1];
        const delta = prev ? log.score - prev.score : null;
        const prevTitles = new Set((prev?.insights || []).map(ins => ins.title));
        const newInsights = log.insights?.filter(ins => !prevTitles.has(ins.title)) || [];
        const unchanged   = (log.insights?.length || 0) - newInsights.length;

        return (
          <Card key={log._id} style={{ marginBottom: "1rem", padding: 0, overflow: "hidden" }}>
            {/* Header row */}
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.1rem 1.4rem", cursor: "pointer", background: cfg.bg, borderBottom: isOpen ? `1px solid ${cfg.border}` : "none" }}
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: "600", color: C.darkGreen, margin: 0, fontSize: "0.92rem" }}>{date}</p>
                  <p style={{ fontSize: "0.78rem", fontWeight: "600", margin: "0.1rem 0 0", color: cfg.color }}>{cfg.label}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ padding: "0.2rem 0.65rem", borderRadius: "999px", fontWeight: "700", fontSize: "0.82rem", background: `${cfg.color}18`, color: cfg.color }}>{log.score}/100</span>
                {delta !== null && (
                  <span style={{ fontWeight: "700", fontSize: "0.82rem", color: delta > 0 ? C.good : delta < 0 ? C.bad : C.muted }}>
                    {delta > 0 ? `+${delta}` : delta} pts
                  </span>
                )}
                {log.riskProfile && <span style={{ background: `${C.moss}18`, color: C.moss, padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.78rem" }}>{log.riskProfile}</span>}
                <span style={{ color: C.muted, fontSize: "0.82rem" }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ padding: "1rem 1.4rem" }}>
                {delta !== null && (
                  <p style={{ fontSize: "0.88rem", fontWeight: "600", color: delta > 0 ? C.good : delta < 0 ? C.bad : C.muted, paddingBottom: "0.75rem", borderBottom: `1px solid ${C.moss}18`, marginBottom: "0.75rem" }}>
                    {delta > 0 ? `Score improved by ${delta} points since last session.` : delta < 0 ? `Score dropped by ${Math.abs(delta)} points since last session.` : "Score unchanged since last session."}
                  </p>
                )}

                {newInsights.length > 0 && (
                  <>
                    <SectionLabel>New or Changed Alerts</SectionLabel>
                    {newInsights.map((ins, j) => (
                      <div key={j} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", padding: "0.55rem 0", borderBottom: `1px solid ${C.moss}12` }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: SEV_COLOR[ins.severity] || C.muted, marginTop: "6px", flexShrink: 0 }} />
                        <div>
                          <p style={{ fontWeight: "600", color: C.darkGreen, margin: 0, fontSize: "0.88rem" }}>{ins.title}</p>
                          <p style={{ color: C.muted, fontSize: "0.82rem", margin: "0.1rem 0 0" }}>{ins.message}</p>
                          {ins.action && <p style={{ color: C.moss, fontSize: "0.8rem", margin: "0.2rem 0 0", fontWeight: "600" }}>{ins.action}</p>}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {unchanged > 0 && <p style={{ color: C.muted, fontSize: "0.8rem", fontStyle: "italic", paddingTop: "0.5rem" }}>{unchanged} insight{unchanged > 1 ? "s" : ""} unchanged from previous session.</p>}
                {newInsights.length === 0 && unchanged === 0 && <p style={{ color: C.muted, fontSize: "0.88rem" }}>No insights recorded for this session.</p>}
              </div>
            )}
          </Card>
        );
      })}
    </PageShell>
  );
}
