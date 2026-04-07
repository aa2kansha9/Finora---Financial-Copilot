import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import PageShell, { C, Card, SectionLabel, PrimaryBtn } from "../Dashboard/PageShell.jsx";

// ── Severity config — clean professional colors
const SEV = {
  critical: { border: `${C.bad}66`, bg: `${C.bad}0f`, color: C.bad, label: "Critical", textColor: "#ff8a7a" },
  high:     { border: `${C.warn}66`, bg: `${C.warn}0f`, color: C.warn, label: "High", textColor: "#ffb347" },
  medium:   { border: `${C.warn}55`, bg: `${C.warn}08`, color: C.warn, label: "Medium", textColor: "#ffcc66" },
  low:      { border: `${C.moss}66`, bg: `${C.moss}0f`, color: C.moss, label: "Info", textColor: "#a8e6cf" },
  good:     { border: `${C.good}66`, bg: `${C.good}0f`, color: C.good, label: "Good", textColor: "#8bc34a" },
};

// ── Helper: format currency
const formatINR = (num) => {
  if (num == null || isNaN(num)) return "₹0";
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

// ── Forward-looking milestone generator
const getNextMilestone = (m) => {
  const sr = m.savingsRatio != null ? +m.savingsRatio : null;
  const inv = m.investmentRatio != null ? +m.investmentRatio : null;
  const mi = +(m.monthlyIncome ?? 0);
  const me = +(m.monthlyExpenses ?? 0);
  const efMonths = m.emergencyFundMonths;
  const dti = m.debtToIncome != null ? +m.debtToIncome : null;
  
  // Only show milestone for financially healthy users
  const isHealthy = sr >= 0.20 && efMonths >= 3 && dti <= 0.20;
  
  if (!isHealthy) return null;
  
  const monthlyInvestable = (sr * mi) - (inv * mi);
  const annualInvestable = monthlyInvestable * 12;
  
  // Calculate time to common goals
  const emergencyFundTarget = me * 6;
  const currentEF = m.emergencyFundRupees || 0;
  const efProgress = Math.min(100, (currentEF / emergencyFundTarget) * 100);
  
  // 5-year wealth projection at current vs optimized rates
  const currentAnnualInvestment = (inv || 0) * mi * 12;
  const optimizedAnnualInvestment = sr * mi * 12;
  const fiveYearCurrent = currentAnnualInvestment * 5 * 1.08; // 8% returns
  const fiveYearOptimized = optimizedAnnualInvestment * 5 * 1.08;
  
  let milestone = null;
  
  if (efProgress < 100) {
    const monthsToFullEF = Math.ceil((emergencyFundTarget - currentEF) / (sr * mi));
    milestone = {
      title: "Emergency Fund Completion",
      current: `${efMonths.toFixed(1)} months (${formatINR(currentEF)})`,
      target: `6 months (${formatINR(emergencyFundTarget)})`,
      timeline: `${monthsToFullEF} months at current savings rate`,
      action: `Direct ${formatINR(sr * mi)}/month to EF until target reached.`
    };
  } else if (inv < 0.25) {
    const targetRate = Math.min(0.25, inv + 0.05);
    const additionalMonthly = mi * (targetRate - inv);
    milestone = {
      title: "Investment Rate Optimization",
      current: `${(inv * 100).toFixed(1)}% (${formatINR(inv * mi)}/month)`,
      target: `${(targetRate * 100).toFixed(0)}% (${formatINR(targetRate * mi)}/month)`,
      timeline: "Immediate - adjust SIP mandate",
      action: `Increase monthly investments by ${formatINR(additionalMonthly)}.`
    };
  } else {
    milestone = {
      title: "5-Year Wealth Target",
      current: `~${formatINR(fiveYearCurrent)} at current rate`,
      target: `~${formatINR(fiveYearOptimized)} at optimized rate`,
      timeline: "5 years",
      action: `Increase total savings-to-investment ratio to ${(sr * 100).toFixed(0)}% for +${formatINR(fiveYearOptimized - fiveYearCurrent)} additional wealth.`
    };
  }
  
  return milestone;
};

// ── Personalized wealth-building recommendations (fixed logical errors)
const getWealthOptimization = (m) => {
  const sr = m.savingsRatio != null ? +m.savingsRatio : null;
  const inv = m.investmentRatio != null ? +m.investmentRatio : null;
  const mi = +(m.monthlyIncome ?? 0);
  const freeCash = m.freeCashLeft ?? (mi - (m.monthlyExpenses ?? 0) - (m.monthlyDebtPayments ?? 0) - (m.monthlyInvestments ?? 0));
  const efMonths = m.emergencyFundMonths;
  const efProvided = m.emergencyFundProvided;
  const me = +(m.monthlyExpenses ?? 0);

  const suggestions = [];

  // Surplus cash optimization with explicit reasoning
  if (freeCash > 0 && sr >= 0.20 && efMonths >= 3) {
    const investAmount = freeCash * 0.7;
    const keepAmount = freeCash * 0.3;
    suggestions.push({
      title: "Surplus Cash Deployment",
      reasoning: `70/30 split: 70% invested for wealth creation (avg 10-12% returns), 30% retained for liquidity and discretionary spending.`,
      message: `${formatINR(freeCash)} monthly surplus after all obligations.`,
      action: `Deploy ${formatINR(investAmount)} into stepped SIP. Retain ${formatINR(keepAmount)} for lifestyle flexibility.`,
      impact: `Annual wealth addition: ${formatINR(investAmount * 12)}.`
    });
  }

  // Investment rate boost - FIXED: suggests higher target when already at 20%
  if (inv !== null && sr > 0.25 && efMonths >= 6) {
    let targetRate = 0.25;
    let recommendation = "";
    
    if (inv < 0.15) {
      targetRate = 0.20;
      recommendation = `Increase to 20% (standard aggressive growth target)`;
    } else if (inv >= 0.15 && inv < 0.25) {
      targetRate = 0.25;
      recommendation = `Increase to 25% (accelerated wealth building)`;
    } else if (inv >= 0.25 && inv < 0.35) {
      targetRate = 0.35;
      recommendation = `Increase to 35% (hyper-saver track to early FI)`;
    } else if (inv >= 0.35) {
      // Already high investor - suggest optimization not increase
      suggestions.push({
        title: "Portfolio Optimization",
        reasoning: `At ${(inv * 100).toFixed(0)}% investment rate, focus shifts from quantity to quality.`,
        message: `Your investment rate exceeds standard targets.`,
        action: `Review asset allocation: 70% equity, 20% debt, 10% gold/reits. Consider direct equity for tax efficiency.`,
        impact: `Optimizing allocation could add 1-2% annual returns.`
      });
      return suggestions;
    }
    
    const additionalMonthly = mi * (targetRate - inv);
    if (additionalMonthly > 0) {
      suggestions.push({
        title: "Investment Rate Escalation",
        reasoning: `With ${(sr * 100).toFixed(0)}% savings rate and ${efMonths.toFixed(1)} months emergency fund, you can safely increase investment allocation.`,
        message: `Current investment: ${(inv * 100).toFixed(1)}% of income.`,
        action: `Increase by ${formatINR(additionalMonthly)}/month to reach ${(targetRate * 100).toFixed(0)}%. Implement step-up SIP.`,
        impact: `Additional annual investment: ${formatINR(additionalMonthly * 12)}. Projected 10-year wealth increase: ~${formatINR(additionalMonthly * 12 * 15)}.`
      });
    }
  }

  // Emergency fund optimization - FIXED: proper calculation
  if (efMonths > 8 && efProvided) {
    const optimalMonths = 6;
    const excessMonths = efMonths - optimalMonths;
    const currentEF = m.emergencyFundRupees || (efMonths * me);
    const optimalEF = optimalMonths * me;
    const excessAmount = currentEF - optimalEF;
    const investAmount = excessAmount * 0.8; // Keep 20% buffer
    
    suggestions.push({
      title: "Emergency Fund Reallocation",
      reasoning: `6 months expenses (${formatINR(optimalEF)}) provides adequate safety. Beyond this, cash loses to inflation (6%+).`,
      message: `Current EF: ${efMonths.toFixed(1)} months (${formatINR(currentEF)}).`,
      action: `Move ${formatINR(investAmount)} to growth assets. Keep ${formatINR(excessAmount * 0.2)} as additional buffer.`,
      impact: `Reallocated funds could generate ${formatINR(investAmount * 0.10)}/year at 10% returns.`
    });
  }

  // Tax efficiency (India context) - FIXED: proper range logic
  if (inv && (inv * mi * 12) >= 150000 && (inv * mi * 12) < 1500000) {
    const currentAnnualInv = inv * mi * 12;
    const remaining80C = Math.max(0, 150000 - currentAnnualInv);
    if (remaining80C > 0) {
      suggestions.push({
        title: "Tax-Efficient Investing",
        reasoning: `Section 80C allows ₹1.5L tax deduction. You're currently investing ₹${(currentAnnualInv/1000).toFixed(0)}K annually.`,
        message: `${formatINR(currentAnnualInv)}/year invested.`,
        action: `Increase by ${formatINR(remaining80C)} to reach ₹1.5L 80C limit. Use ELSS (3yr lock-in) or PPF.`,
        impact: `Tax savings: ~${formatINR(remaining80C * 0.3)} annually (30% bracket).`
      });
    }
  }

  return suggestions;
};

const buildAlerts = (m) => {
  const efProvided = m.emergencyFundProvided;
  const ef = m.emergencyFundMonths != null ? +m.emergencyFundMonths : null;
  const sr = m.savingsRatio != null ? +m.savingsRatio : null;
  const dti = m.debtToIncome != null ? +m.debtToIncome : null;
  const inv = m.investmentRatio != null ? +m.investmentRatio : null;
  const mi = +(m.monthlyIncome ?? 0);
  const ms = +(m.monthlyNetSavings ?? m.monthlySavings ?? 0);
  const me = +(m.monthlyExpenses ?? 0);
  const spr = m.spendingRatio != null ? +m.spendingRatio : (mi > 0 ? me / mi : null);

  const issues = [], positives = [];
  const foundationStable = efProvided && ef != null && ef >= 3 && dti != null && dti <= 0.30;
  const isOverspending = spr != null && spr >= 0.80;
  const isCriticalSpend = spr != null && spr >= 0.90;
  const spendLabel = m.spendingRatioDisplayLabel || (spr != null ? `${(spr * 100).toFixed(1)}%` : null);

  // ── Emergency Fund (directive, no emojis)
  if (!efProvided) {
    issues.push({ 
      severity: "high", 
      title: "Emergency Fund Required", 
      message: "No emergency fund on file. This is a critical safety gap.", 
      action: `Add emergency fund balance. Minimum target: ${formatINR(me * 3)} (3 months expenses). Priority #1.`, 
      blocking: true 
    });
  } else if (ef != null && ef < 3) {
    const rupees = m.emergencyFundRupees != null ? m.emergencyFundRupees : ef * me;
    const efTarget = me * 3;
    const efGap = Math.max(0, efTarget - rupees);
    const monthsNeeded = ms > 0 && efGap > 0 ? Math.ceil(efGap / ms) : null;
    issues.push({ 
      severity: ef < 1 ? "critical" : "high", 
      title: ef < 1 ? "Emergency Fund Critical" : "Emergency Fund Insufficient", 
      message: `${ef.toFixed(1)} months covered. Need 3-6 months. Balance: ${formatINR(rupees)}.`, 
      action: `Target: ${formatINR(efTarget)}. Gap: ${formatINR(efGap)}.${monthsNeeded ? ` At ${formatINR(ms)}/mo savings rate: ${monthsNeeded} months to reach minimum.` : ""} Redirect all surplus until funded.`, 
      blocking: true 
    });
  } else if (ef != null && ef >= 3) {
    positives.push({ 
      severity: ef < 6 ? "medium" : "good", 
      title: ef < 6 ? "Emergency Fund Adequate" : "Emergency Fund Strong", 
      message: `${ef.toFixed(1)} months expenses covered. Balance: ${formatINR(m.emergencyFundRupees || ef * me)}.`, 
      action: ef < 6 ? `Target 6 months: ${formatINR(me * 6)}. Need ${formatINR((me * 6) - (m.emergencyFundRupees || ef * me))} more.` : "Fully funded. Consider reallocating excess beyond 6 months to investments."
    });
  }

  // ── Spending ratio (directive, clear action)
  if (spr != null && isCriticalSpend) {
    const targetExpense = mi * 0.70;
    const requiredCut = me - targetExpense;
    issues.push({ 
      severity: "critical", 
      title: "Spending Crisis", 
      message: `${spendLabel} of income (${formatINR(me)}/month) exceeds safe threshold.`, 
      action: `Must reduce expenses by ${formatINR(requiredCut)}/month to reach 70% (${formatINR(targetExpense)}). Review rent, EMIs, and discretionary categories immediately.` 
    });
  } else if (spr != null && isOverspending) {
    const targetExpense = mi * 0.70;
    const requiredCut = me - targetExpense;
    issues.push({ 
      severity: "high", 
      title: "High Spending Ratio", 
      message: `${spendLabel} of income (${formatINR(me)}/month) exceeds 70% guideline.`, 
      action: `Reduce expenses by ${formatINR(requiredCut)}/month. Track spending for 30 days. Cut non-essentials first.` 
    });
  } else if (spr != null && spr > 0.70) {
    issues.push({ 
      severity: "medium", 
      title: "Spending Above Target", 
      message: `${spendLabel} of income to expenses.`, 
      action: `Reduce discretionary spending by ${formatINR(me - mi * 0.70)}/month to reach 70% ceiling.` 
    });
  }

  // ── Debt (directive, mathematically accurate)
  if (dti != null) {
    const monthlyDebt = dti * mi;
    if (dti > 0.50) {
      issues.push({ 
        severity: "critical", 
        title: "Debt Overload", 
        message: `${(dti * 100).toFixed(1)}% (${formatINR(monthlyDebt)}/month) of income to debt.`, 
        action: "Stop all new borrowing. Pay minimums on all debts. Aggressively pay highest interest rate first. Consider debt consolidation." 
      });
    } else if (dti > 0.35) {
      const excessDebt = monthlyDebt - (mi * 0.20);
      issues.push({ 
        severity: "high", 
        title: "High Debt Burden", 
        message: `${(dti * 100).toFixed(1)}% DTI (${formatINR(monthlyDebt)}/month). Safe zone: below 20%.`, 
        action: `Reduce debt by ${formatINR(excessDebt)}/month. Pay extra ${formatINR(monthlyDebt * 0.3)}/month toward principal.` 
      });
    } else if (dti > 0.20) {
      issues.push({ 
        severity: "medium", 
        title: "Elevated Debt Level", 
        message: `${(dti * 100).toFixed(1)}% DTI (${formatINR(monthlyDebt)}/month).`, 
        action: `Pay extra ${formatINR(monthlyDebt * 0.2)}/month to bring DTI below 20% within 6 months.` 
      });
    } else if (dti > 0) {
      positives.push({ 
        severity: "low", 
        title: "Debt Under Control", 
        message: `${(dti * 100).toFixed(1)}% DTI (${formatINR(monthlyDebt)}/month) — below 20% guideline.`, 
        action: "Maintain payments. If interest rates exceed 8%, accelerate payoff. Avoid new debt."
      });
    } else {
      positives.push({ 
        severity: "low", 
        title: "Debt-Free Status", 
        message: "No debt payments. This is optimal for wealth building.", 
        action: "Maintain debt-free position. Use credit cards for convenience only, pay in full monthly."
      });
    }
  }

  // ── Net savings (directive, accurate targets)
  if (sr != null) {
    const monthlySavingsAmount = sr * mi;
    const targetSavingsAmount = mi * 0.20;
    if (sr < 0.05) {
      issues.push({ 
        severity: "critical", 
        title: "Savings Rate Critical", 
        message: `Saving only ${(sr * 100).toFixed(1)}% (${formatINR(monthlySavingsAmount)}/month) after expenses and debt.`, 
        action: `Minimum viable: 5% (${formatINR(mi * 0.05)}/month). Cut expenses by ${formatINR(mi * 0.05 - monthlySavingsAmount)}/month immediately.` 
      });
    } else if (sr < 0.20) {
      const gap = targetSavingsAmount - monthlySavingsAmount;
      issues.push({ 
        severity: sr < 0.10 ? "high" : "medium", 
        title: "Savings Rate Below Target", 
        message: `${(sr * 100).toFixed(1)}% saved (${formatINR(monthlySavingsAmount)}/month). Target: 20% (${formatINR(targetSavingsAmount)}).`, 
        action: `Increase savings by ${formatINR(gap)}/month. ${gap > 0 ? "Reduce expenses or accelerate debt payoff." : ""}` 
      });
    } else {
      positives.push({ 
        severity: "low", 
        title: "Savings Rate Strong", 
        message: `${(sr * 100).toFixed(1)}% (${formatINR(monthlySavingsAmount)}/month) saved after expenses and debt.`, 
        action: sr >= 0.30 ? "Excellent. Direct surplus to tax-efficient investments." : "Target 30% for accelerated wealth building."
      });
    }
  }

  // ── Investments (FIXED: no contradictory suggestions)
  if (inv != null) {
    const monthlyInvestmentAmount = inv * mi;
    
    if (!foundationStable && inv > 0) {
      const shouldPause = isCriticalSpend || (isOverspending && ef != null && ef < 1);
      if (shouldPause) {
        issues.push({ 
          severity: "high", 
          title: "Investments on Hold Required", 
          message: `Investing ${(inv * 100).toFixed(1)}% (${formatINR(monthlyInvestmentAmount)}/month) while foundation is unstable.`, 
          action: `Pause investments. Build 3-month EF (${formatINR(me * 3)}) first. Resume after foundation secure.` 
        });
      } else if (ef != null && ef < 3) {
        issues.push({ 
          severity: "medium", 
          title: "Prioritize Emergency Fund", 
          message: `EF at ${ef.toFixed(1)} months. Minimum: 3 months.`, 
          action: `Redirect ${formatINR(monthlyInvestmentAmount)}/month to EF for ${Math.ceil((me * 3 - (m.emergencyFundRupees || 0)) / monthlyInvestmentAmount)} months.` 
        });
      }
    } else if (foundationStable) {
      if (inv === 0) {
        positives.push({ 
          severity: "low", 
          title: "Start Investing", 
          message: "Foundation stable. Ready to build wealth.", 
          action: `Start with ${formatINR(mi * 0.10)}/month (10% of income) in low-cost index funds or SIPs.` 
        });
      } else if (inv < 0.10) {
        const increaseAmount = (mi * 0.10) - monthlyInvestmentAmount;
        positives.push({ 
          severity: "low", 
          title: "Increase Investment Rate", 
          message: `${(inv * 100).toFixed(1)}% (${formatINR(monthlyInvestmentAmount)}/month) invested.`, 
          action: `Increase by ${formatINR(increaseAmount)}/month to reach 10% minimum. Use automated step-up SIP.` 
        });
      } else if (inv >= 0.10 && inv < 0.20) {
        const increaseAmount = (mi * 0.20) - monthlyInvestmentAmount;
        positives.push({ 
          severity: "low", 
          title: "Good Investment Foundation", 
          message: `${(inv * 100).toFixed(1)}% (${formatINR(monthlyInvestmentAmount)}/month) invested.`, 
          action: `Target 20%: increase by ${formatINR(increaseAmount)}/month. Use 50% of future salary hikes.` 
        });
      } else if (inv >= 0.20 && inv < 0.30) {
        positives.push({ 
          severity: "low", 
          title: "Strong Investment Rate", 
          message: `${(inv * 100).toFixed(1)}% (${formatINR(monthlyInvestmentAmount)}/month) invested.`, 
          action: `Target 30% for accelerated wealth. Increase by ${formatINR(mi * 0.05)}/month. Review asset allocation: 70% equity, 20% debt, 10% alternatives.` 
        });
      } else {
        positives.push({ 
          severity: "low", 
          title: "Excellent Investment Discipline", 
          message: `${(inv * 100).toFixed(1)}% (${formatINR(monthlyInvestmentAmount)}/month) — top-tier rate.`, 
          action: "Focus on asset allocation, tax efficiency, and direct equity for long-term outperformance. Rebalance annually."
        });
      }
    }
  }

  return { issues, positives };
};

function AlertCard({ alert, id, expanded, onToggle }) {
  const cfg = SEV[alert.severity] || SEV.low;
  const textColor = cfg.textColor || cfg.color;
  const isLongAction = alert.action && alert.action.length > 100;
  
  return (
    <div style={{ ...as.card, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <div style={as.header}>
        <span style={{ ...as.title, color: textColor }}>{alert.title}</span>
        <span style={{ ...as.badge, color: cfg.color, background: `${cfg.color}22`, border: `1px solid ${cfg.color}44` }}>{cfg.label}</span>
      </div>
      <p style={as.msg}>{alert.message}</p>
      {alert.action && (
        <>
          {isLongAction ? (
            !expanded ? (
              <p style={as.hint}>{alert.action.substring(0, 100)}…</p>
            ) : (
              <p style={as.expanded}>{alert.action}</p>
            )
          ) : (
            <p style={as.expanded}>{alert.action}</p>
          )}
          {isLongAction && (
            <button style={{ ...as.expandBtn, color: textColor }} onClick={() => onToggle(id)}>
              {expanded ? "Collapse" : "View Full Recommendation"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

const as = {
  card:      { padding: "1rem 1.25rem", borderRadius: "8px", marginBottom: "0.75rem" },
  header:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", gap: "0.75rem" },
  title:     { fontWeight: "600", fontSize: "0.9rem", lineHeight: 1.35 },
  badge:     { fontSize: "0.7rem", padding: "0.2rem 0.6rem", borderRadius: "4px", fontWeight: "600", flexShrink: 0 },
  msg:       { fontSize: "0.85rem", lineHeight: "1.5", margin: "0 0 0.5rem", color: "#f0e6c5" },
  hint:      { fontSize: "0.8rem", fontWeight: "500", margin: "0.3rem 0", color: "#d4cba8" },
  expandBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", padding: 0, textDecoration: "underline", textUnderlineOffset: "2px", marginTop: "0.25rem" },
  expanded:  { marginTop: "0.75rem", fontSize: "0.85rem", lineHeight: "1.55", borderTop: "1px solid rgba(247,244,213,0.2)", paddingTop: "0.75rem", color: "#e8e0b0" },
};

export default function AIInsights() {
  const [health,    setHealth]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [expanded,  setExpanded]  = useState({});
  const [showPos,   setShowPos]   = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);
  const [authError, setAuthError] = useState(false);

  const fetch = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setAuthError(false);
    try {
      const { data: h } = await api.get("/financial/health");
      setHealth(h);
    } catch (err) {
      if (err.response?.status === 401) setAuthError(true);
      setHealth(null);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const toggle = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  const renderBody = () => {
    if (loading) return <p style={{ color: "#d4cba8", padding: "2rem 0", fontSize: "0.9rem" }}>Loading insights...</p>;

    if (authError) return (
      <Card>
        <p style={{ color: "#ff8a7a", fontWeight: "500", marginBottom: "0.75rem" }}>Session expired. Please log in again.</p>
        <PrimaryBtn onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}>Log In</PrimaryBtn>
      </Card>
    );

    if (!health) return (
      <Card>
        <p style={{ color: "#b0b0a0", marginBottom: "0.75rem" }}>Unable to load insights. Please try again.</p>
        <PrimaryBtn onClick={() => fetch()}>Retry</PrimaryBtn>
      </Card>
    );

    const m = health.metrics || {};
    const { issues, positives } = buildAlerts(m);
    const optimizations = getWealthOptimization(m);
    const milestone = getNextMilestone(m);
    const spr = m.spendingRatio != null ? +m.spendingRatio : (m.monthlyIncome > 0 ? (m.monthlyExpenses ?? 0) / m.monthlyIncome : null);
    
    let topPriority = health.biggestWeakness;
    let topDetail = health.biggestWeaknessDetail;
    if (spr != null && spr >= 0.90) { 
      topPriority = "Spending Crisis"; 
      topDetail = `${(spr * 100).toFixed(1)}% of income spent. Must reduce expenses immediately.`; 
    } else if (spr != null && spr >= 0.80 && health.biggestWeakness === "Emergency Fund") { 
      topPriority = "Spending + EF Gap"; 
      topDetail = `High spending (${(spr * 100).toFixed(1)}%) prevents emergency fund growth. Cut expenses first.`; 
    }

    const efMo = m.emergencyFundMonths;
    const efVal = m.emergencyFundProvided && efMo != null ? `${efMo.toFixed(1)} mo` : "No data";
    const sr = m.savingsRatio;
    const dti = m.debtToIncome;

    const metrics = [
      { label: "Emergency Fund", val: efVal, good: efMo != null && efMo >= 3, warn: efMo != null && efMo >= 1 },
      { label: "Net Savings", val: sr != null ? `${(sr * 100).toFixed(1)}%` : "—", good: sr != null && sr >= 0.20, warn: sr != null && sr >= 0.10 },
      { label: "Debt-to-Income", val: dti != null ? `${(dti * 100).toFixed(1)}%` : "—", good: dti != null && dti <= 0.20, warn: dti != null && dti <= 0.35, invert: true },
      { label: "Spending Ratio", val: spr != null ? `${(spr * 100).toFixed(1)}%` : "—", good: spr != null && spr <= 0.70, warn: spr != null && spr <= 0.80, invert: true },
    ];

    const hasStrongHealth = sr >= 0.20 && (!efMo || efMo >= 3) && (!dti || dti <= 0.20) && (!spr || spr <= 0.70);

    return (
      <>
        {/* Top Priority Section */}
        {topPriority && topPriority !== "None" && (
          <Card style={{ marginBottom: "1.25rem", borderLeft: `4px solid ${C.warn}`, background: "rgba(255,180,71,0.08)" }}>
            <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "#ffb347", marginBottom: "0.5rem" }}>Priority Action</p>
            <p style={{ fontWeight: "600", fontSize: "1rem", color: "#f5f0d1", margin: "0 0 0.3rem" }}>{topPriority}</p>
            {topDetail && <p style={{ fontSize: "0.85rem", color: "#d4cba8", margin: 0, lineHeight: 1.5 }}>{topDetail}</p>}
          </Card>
        )}

        {/* Issues Banner */}
        {issues.length > 0 && (
          <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", marginBottom: "1.25rem", fontWeight: "500", fontSize: "0.85rem", background: "rgba(247,244,213,0.95)", borderLeft: `3px solid ${issues.some(i => i.severity === "critical") ? C.bad : C.warn}`, color: issues.some(i => i.severity === "critical") ? "#8b2c1d" : "#6b5a0a" }}>
            {issues.length} issue{issues.length > 1 ? "s require" : " requires"} immediate attention.
          </div>
        )}

        {/* Issues List */}
        {issues.length > 0 && (
          <>
            <SectionLabel>Required Actions</SectionLabel>
            {issues.map((a, i) => <AlertCard key={i} alert={a} id={`issue-${i}`} expanded={!!expanded[`issue-${i}`]} onToggle={toggle} />)}
          </>
        )}

        {/* No Issues Message */}
        {issues.length === 0 && (
          <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: "rgba(76,175,125,0.1)", borderLeft: `3px solid ${C.good}`, marginBottom: "1.25rem" }}>
            <p style={{ color: "#a5d6a5", fontWeight: "500", margin: 0 }}>No critical issues. Financial foundation is secure.</p>
          </div>
        )}

        {/* Next Milestone - Forward-looking insight */}
        {milestone && (
          <Card style={{ marginBottom: "1.25rem", borderLeft: `3px solid ${C.good}`, background: "rgba(76,175,125,0.05)" }}>
            <p style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "#8bc34a", marginBottom: "0.5rem" }}>Next Milestone</p>
            <p style={{ fontWeight: "600", fontSize: "0.95rem", color: "#f5f0d1", margin: "0 0 0.3rem" }}>{milestone.title}</p>
            <p style={{ fontSize: "0.85rem", color: "#d4cba8", marginBottom: "0.3rem" }}>Current: {milestone.current} → Target: {milestone.target}</p>
            <p style={{ fontSize: "0.8rem", color: "#b0b0a0", marginBottom: "0.5rem" }}>Timeline: {milestone.timeline}</p>
            <p style={{ fontSize: "0.85rem", color: "#8bc34a", margin: 0 }}>→ {milestone.action}</p>
          </Card>
        )}

        {/* Wealth Optimization Section */}
        {hasStrongHealth && optimizations.length > 0 && (
          <>
            <SectionLabel>Wealth Optimization</SectionLabel>
            <div style={{ marginBottom: "1.25rem" }}>
              <button 
                type="button" 
                style={{ 
                  width: "100%", 
                  padding: "0.6rem 0.75rem", 
                  background: "rgba(76,175,125,0.1)", 
                  border: `1px solid ${C.good}44`, 
                  borderRadius: "6px", 
                  cursor: "pointer", 
                  color: "#c8e6c8", 
                  fontWeight: "500", 
                  marginBottom: "0.75rem", 
                  fontSize: "0.85rem", 
                  fontFamily: "inherit",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }} 
                onClick={() => setShowOptimization(p => !p)}
              >
                <span>Strategic Recommendations</span>
                <span style={{ fontSize: "0.75rem" }}>{showOptimization ? "−" : "+"}</span>
              </button>
              {showOptimization && optimizations.map((opt, i) => (
                <Card key={i} style={{ marginBottom: "0.75rem", borderLeft: `3px solid ${C.good}` }}>
                  <p style={{ fontWeight: "600", fontSize: "0.9rem", margin: "0 0 0.4rem", color: "#127612" }}>{opt.title}</p>
                  <p style={{ fontSize: "0.75rem", color: "#113311", marginBottom: "0.5rem", fontStyle: "italic" }}>Why: {opt.reasoning}</p>
                  <p style={{ fontSize: "0.85rem", margin: "0 0 0.3rem", color: "#303025" }}>{opt.message}</p>
                  <p style={{ fontSize: "0.85rem", fontWeight: "500", margin: "0.3rem 0 0", color: "#8bc34a" }}>Action: {opt.action}</p>
                  {opt.impact && <p style={{ fontSize: "0.75rem", margin: "0.3rem 0 0", color: "#3e3e23" }}>Impact: {opt.impact}</p>}
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Positives Section - Collapsible */}
        {positives.length > 0 && (
          <>
            <button 
              type="button" 
              style={{ 
                width: "100%", 
                padding: "0.5rem 0.75rem", 
                background: "transparent", 
                border: `1px solid ${C.moss}44`, 
                borderRadius: "6px", 
                cursor: "pointer", 
                color: "#c0c0a5", 
                fontWeight: "500", 
                marginBottom: "0.75rem", 
                fontSize: "0.8rem", 
                fontFamily: "inherit",
                textAlign: "left"
              }} 
              onClick={() => setShowPos(p => !p)}
            >
              {showPos ? "−" : "+"} {positives.length} Positive Indicator{positives.length > 1 ? "s" : ""}
            </button>
            {showPos && positives.map((a, i) => <AlertCard key={i} alert={a} id={`pos-${i}`} expanded={!!expanded[`pos-${i}`]} onToggle={toggle} />)}
          </>
        )}

        {/* Metrics Strip - Clean */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginTop: "1rem" }}>
          {metrics.map(item => {
            let color = "#c0c0a5";
            if (item.good) color = "#8bc34a";
            else if (item.warn) color = "#ffb347";
            else color = "#ff8a7a";
            
            return (
              <Card key={item.label} style={{ padding: "0.75rem", background: "rgba(30,61,47,0.4)" }}>
                <p style={{ color: "#b0b09a", fontSize: "0.65rem", margin: "0 0 0.25rem", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</p>
                <p style={{ fontWeight: "600", fontSize: "0.95rem", margin: 0, color: color }}>{item.val}</p>
              </Card>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <PageShell
      title="Financial Insights"
      subtitle="Data-driven recommendations for your financial health."
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.25rem" }}>
        <PrimaryBtn onClick={() => fetch(true)} disabled={refreshing} style={{ fontSize: "0.8rem", padding: "0.4rem 1rem" }}>
          {refreshing ? "Updating..." : "Refresh Data"}
        </PrimaryBtn>
      </div>
      {renderBody()}
    </PageShell>
  );
}