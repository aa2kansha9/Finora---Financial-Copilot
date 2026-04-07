import { useEffect, useState } from "react";
import api from "../../services/api";
import PageShell, { C, Card, SectionLabel, PrimaryBtn, FInput } from "../Dashboard/PageShell.jsx";

const STATUS = {
  blocked:  { label: "Blocked — EF Critical",    color: C.bad,  bg: `${C.bad}0f`,  border: `${C.bad}44`  },
  paused:   { label: "Paused — Build EF First",  color: C.warn, bg: `${C.warn}0f`, border: `${C.warn}44` },
  active:   { label: "Active",                   color: C.moss, bg: `${C.moss}0f`, border: `${C.moss}44` },
  achieved: { label: "Achieved",                 color: C.good, bg: `${C.good}0f`, border: `${C.good}44` },
  unknown:  { label: "No Data",                  color: C.muted,bg: `${C.muted}0f`,border: `${C.muted}44`},
};

const PLAN_COLORS = { critical: C.bad, high: C.warn, medium: C.warn, low: C.moss };

export default function GoalPlanner() {
  const [goals,   setGoals]   = useState([]);
  const [form,    setForm]    = useState({ title: "", goalAmount: "", currentSavings: "", deadlineMonths: "" });
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [error,   setError]   = useState("");
  const [userMetrics, setUserMetrics] = useState(null);

  const fetchGoals = () => {
    setLoading(true);
    Promise.all([
      api.get("/goals").catch(() => ({ data: [] })),
      api.get("/financial/health").catch(() => ({ data: { metrics: null } }))
    ]).then(([goalsRes, healthRes]) => {
      setGoals(goalsRes.data);
      setUserMetrics(healthRes.data?.metrics || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault(); setError("");
    const amount = Number(form.goalAmount), deadline = Number(form.deadlineMonths);
    if (!form.title.trim()) { setError("Please enter a goal name."); return; }
    if (amount <= 0)         { setError("Goal amount must be greater than 0."); return; }
    if (deadline <= 0)       { setError("Deadline must be at least 1 month."); return; }
    setAdding(true);
    try {
      await api.post("/goals", { 
        title: form.title, 
        goalAmount: amount, 
        currentSavings: Number(form.currentSavings) || 0, 
        deadlineMonths: deadline,
        userMetrics 
      });
      setForm({ title: "", goalAmount: "", currentSavings: "", deadlineMonths: "" });
      fetchGoals();
    } catch (err) { setError(err.response?.data?.message || "Failed to add goal."); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    await api.delete(`/goals/${id}`);
    setGoals(g => g.filter(x => x._id !== id));
  };

  const formatINR = (num) => {
    if (num == null || isNaN(num)) return "₹0";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <PageShell title="Goal Planning" subtitle="Set financial goals and track your progress with AI-powered recommendations based on your actual savings capacity.">

      {/* Add goal form */}
      <Card style={{ marginBottom: "1.5rem" }}>
        <SectionLabel>New Goal</SectionLabel>
        <form onSubmit={handleAdd} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <FInput label="Goal Name" placeholder='e.g. Emergency Fund, New Laptop' value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <FInput label="Target Amount (Rs.)" type="number" placeholder="e.g. 100000" value={form.goalAmount} onChange={e => setForm({ ...form, goalAmount: e.target.value })} required />
          <FInput label="Already Saved (Rs.)" type="number" placeholder="e.g. 20000" value={form.currentSavings} onChange={e => setForm({ ...form, currentSavings: e.target.value })} />
          <FInput label="Deadline (months)" type="number" placeholder="e.g. 12" value={form.deadlineMonths} onChange={e => setForm({ ...form, deadlineMonths: e.target.value })} required />
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <PrimaryBtn disabled={adding} style={{ width: "100%" }}>{adding ? "Adding..." : "Add Goal"}</PrimaryBtn>
          </div>
        </form>
        {error && <p style={{ color: C.bad, fontSize: "0.85rem", marginTop: "0.75rem", background: `${C.bad}0f`, padding: "0.6rem 0.9rem", borderRadius: "8px", border: `1px solid ${C.bad}33` }}>{error}</p>}
      </Card>

      {loading && <p style={{ color: `${C.beige}66` }}>Loading goals...</p>}

      {!loading && goals.length === 0 && (
        <Card style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: C.muted, fontSize: "0.95rem" }}>No goals yet. Add your first financial goal above.</p>
        </Card>
      )}

      {goals.map(g => {
        const status = STATUS[g.priorityStatus] || STATUS.active;
        const isBlocked = g.priorityStatus === "blocked";
        const isPaused = g.priorityStatus === "paused";
        const barColor = isBlocked ? C.bad : isPaused ? C.warn : g.onTrack ? C.good : C.moss;
        
        // Get user's financial metrics
        const monthlySavings = userMetrics?.monthlyNetSavings || userMetrics?.monthlySavings || 0;
        const savingsRate = userMetrics?.savingsRatio || 0;
        const monthlyIncome = userMetrics?.monthlyIncome || 0;
        
        // Calculate goal metrics
        const remainingAmount = Math.max(0, g.goalAmount - (g.currentSavings || 0));
        const progressPct = g.goalAmount > 0 ? ((g.currentSavings || 0) / g.goalAmount * 100).toFixed(1) : 0;
        const requiredMonthly = g.requiredMonthlySaving || (remainingAmount / g.deadlineMonths);
        
        // Calculate realistic timeline at current savings rate
        const monthsAtCurrentRate = monthlySavings > 0 ? Math.ceil(remainingAmount / monthlySavings) : 0;
        
        // Calculate sustainable rate (don't exceed 30% or user's current rate)
        const sustainableRate = Math.min(0.30, Math.max(savingsRate, 0.20));
        const sustainableMonthly = monthlyIncome * sustainableRate;
        const monthsAtSustainableRate = sustainableMonthly > 0 ? Math.ceil(remainingAmount / sustainableMonthly) : 0;

        // Filter and clean alternatives - keep only relevant, non-contradictory ones
        const getAlternatives = () => {
          const alts = [];
          
          // Primary: Based on user's actual behavior (5 months at current rate)
          if (monthsAtCurrentRate > 0 && monthsAtCurrentRate !== g.deadlineMonths) {
            alts.push(`Extend deadline to ${monthsAtCurrentRate} months — matches your current savings of ${formatINR(monthlySavings)}/month`);
          }
          
          // Secondary: Conservative option (8-10 months at sustainable rate)
          if (monthsAtSustainableRate > 0 && monthsAtSustainableRate !== monthsAtCurrentRate) {
            alts.push(`Extend deadline to ${monthsAtSustainableRate} months with ${Math.round(sustainableRate * 100)}% savings rate (${formatINR(sustainableMonthly)}/month)`);
          }
          
          // Last resort: Reduce goal amount
          const achievableAmountAtCurrentRate = monthlySavings * g.deadlineMonths;
          if (achievableAmountAtCurrentRate > 0 && achievableAmountAtCurrentRate < g.goalAmount) {
            alts.push(`Adjust goal to ${formatINR(achievableAmountAtCurrentRate)} — achievable within ${g.deadlineMonths} months at your current savings rate`);
          }
          
          return alts.slice(0, 3);
        };
        
        const alternatives = getAlternatives();
        const hasAlternatives = alternatives.length > 0;
        
        // Determine if deadline is unrealistic
        const isDeadlineUnrealistic = monthsAtCurrentRate > g.deadlineMonths;
        
        // Single, clear insight statement
        const getInsight = () => {
          if (isDeadlineUnrealistic) {
            return `${formatINR(requiredMonthly)}/month needed — ${Math.round((requiredMonthly / monthlyIncome) * 100)}% of income. At your current savings rate of ${Math.round(savingsRate * 100)}% (${formatINR(monthlySavings)}/month), this would take ${monthsAtCurrentRate} months.`;
          }
          return `You need ${formatINR(requiredMonthly)}/month. Your current savings of ${formatINR(monthlySavings)}/month puts you on track for ${monthsAtCurrentRate} months.`;
        };

        return (
          <Card key={g._id} style={{ marginBottom: "1.25rem", borderLeft: `4px solid ${barColor}` }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                  <p style={{ fontWeight: "700", fontSize: "1rem", color: C.darkGreen, margin: 0 }}>{g.title}</p>
                  <span style={{ fontSize: "0.7rem", fontWeight: "700", padding: "0.2rem 0.65rem", borderRadius: "999px", background: status.bg, color: status.color, border: `1px solid ${status.border}` }}>{status.label}</span>
                </div>
                <p style={{ color: C.muted, fontSize: "0.83rem", margin: 0 }}>
                  {formatINR(g.currentSavings)} saved of {formatINR(g.goalAmount)} — {progressPct}% complete — {g.deadlineMonths} months remaining
                </p>
              </div>
              <button style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1rem", marginLeft: "0.5rem" }} onClick={() => handleDelete(g._id)}>×</button>
            </div>

            {/* Progress Bar */}
            <div style={{ background: `${C.darkGreen}18`, borderRadius: "999px", height: "8px", marginBottom: "0.4rem" }}>
              <div style={{ height: "8px", borderRadius: "999px", width: `${progressPct}%`, background: barColor, transition: "width 0.4s" }} />
            </div>
            
            {progressPct > 0 && !isBlocked && (
              <p style={{ color: C.good, fontSize: "0.75rem", marginBottom: "1rem", fontWeight: "500" }}>
                🎯 {progressPct}% complete — keep going!
              </p>
            )}

            {/* Stats */}
            {!isBlocked && monthlySavings > 0 && (
              <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                {[
                  { label: "Your Monthly Savings", val: formatINR(monthlySavings), color: C.moss },
                  { label: "Required Monthly", val: formatINR(requiredMonthly), color: requiredMonthly > monthlySavings ? C.warn : C.good },
                  { label: "Monthly Gap", val: requiredMonthly > monthlySavings ? formatINR(requiredMonthly - monthlySavings) : "On track", color: requiredMonthly > monthlySavings ? C.bad : C.good },
                  { label: "Your Savings Rate", val: `${Math.round(savingsRate * 100)}% of income`, color: C.muted },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, background: `${C.darkGreen}08`, padding: "0.7rem 0.9rem", borderRadius: "10px", minWidth: "110px" }}>
                    <p style={{ color: C.muted, fontSize: "0.72rem", margin: 0, textTransform: "uppercase", letterSpacing: "0.4px" }}>{s.label}</p>
                    <p style={{ fontWeight: "700", fontSize: "0.95rem", margin: "0.2rem 0 0", color: s.color || C.darkGreen }}>{s.val}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Single, clear insight - no contradictions */}
            <div style={{ padding: "0.85rem 1rem", borderRadius: "8px", marginBottom: "1rem", background: status.bg, border: `1px solid ${status.border}` }}>
              <p style={{ fontSize: "0.88rem", lineHeight: "1.6", margin: 0, color: status.color, fontWeight: isBlocked || isPaused ? "600" : "400" }}>
                {getInsight()}
              </p>
            </div>

            {/* Recommended Plan - Prioritizes user's actual behavior */}
            {isDeadlineUnrealistic && !isBlocked && (
              <div style={{ background: `${C.darkGreen}06`, border: `1px solid ${C.moss}22`, borderRadius: "10px", padding: "1rem 1.25rem", marginBottom: "0.9rem" }}>
                <SectionLabel>Recommended Plan</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {/* Primary: Extend to match user's actual savings behavior */}
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: C.moss, color: "#fff", fontSize: "0.7rem", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>1</div>
                    <div>
                      <p style={{ fontWeight: "700", fontSize: "0.86rem", margin: 0, color: C.moss }}>Extend deadline to {monthsAtCurrentRate} months</p>
                      <p style={{ color: C.muted, fontSize: "0.82rem", margin: "0.15rem 0 0", lineHeight: 1.5 }}>
                        This matches your current savings of {formatINR(monthlySavings)}/month ({Math.round(savingsRate * 100)}% of income).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alternatives - Only show if they add value beyond the primary recommendation */}
            {hasAlternatives && !isBlocked && !isPaused && alternatives.length > 0 && (
              <div style={{ borderTop: `1px solid ${C.moss}22`, paddingTop: "0.75rem" }}>
                <p style={{ color: C.muted, fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 0.4rem" }}>
                  Alternative Approaches
                </p>
                {alternatives.map((alt, i) => (
                  <p key={i} style={{ color: C.darkGreen, fontSize: "0.83rem", margin: "0.2rem 0", lineHeight: 1.5 }}>{alt}</p>
                ))}
              </div>
            )}

            {/* Blocked message */}
            {isBlocked && (
              <div style={{ background: `${C.bad}0a`, border: `1px solid ${C.bad}33`, borderRadius: "8px", padding: "0.75rem 1rem" }}>
                <p style={{ color: C.bad, fontSize: "0.84rem", margin: 0, lineHeight: 1.5 }}>
                  ⚠️ This goal becomes active once your emergency fund reaches 3 months. Focus entirely on building your safety net first.
                </p>
              </div>
            )}

            {/* Single bottom recommendation - no redundancy */}
            {!isBlocked && !isPaused && monthlySavings > 0 && remainingAmount > 0 && (
              <div style={{ background: `${C.moss}0a`, border: `1px solid ${C.moss}33`, borderRadius: "8px", padding: "0.75rem 1rem", marginTop: "0.75rem" }}>
                <p style={{ color: C.moss, fontSize: "0.84rem", margin: 0, lineHeight: 1.5 }}>
                  {monthsAtCurrentRate <= g.deadlineMonths ? (
                    `✅ On track! At your current savings rate, you'll reach this goal in ${monthsAtCurrentRate} months.`
                  ) : (
                    `💡 Extending your deadline to ${monthsAtCurrentRate} months would make this goal achievable with your current savings of ${formatINR(monthlySavings)}/month.`
                  )}
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </PageShell>
  );
}