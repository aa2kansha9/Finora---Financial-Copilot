import { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import PageShell, { C, Card, SectionLabel, PrimaryBtn, FInput } from "../Dashboard/PageShell.jsx";

ChartJS.register(ArcElement, Tooltip, Legend);

// Asset configuration
const ASSETS = {
  equity: { label: "Equity", color: C.moss, note: "Stocks + index funds" },
  debt:   { label: "Debt",   color: C.good, note: "Bonds, fixed income"  },
  gold:   { label: "Gold",   color: C.warn, note: "Inflation hedge"       },
  cash:   { label: "Cash",   color: C.muted, note: "Liquid savings"        },
};

// Profile configurations - ALL VALUES AS DECIMALS (0.75 = 75%)
const PROFILES = {
  Conservative: { 
    color: C.good, 
    risk: "Low Risk", 
    horizon: "1–3 years",
    baseAllocation: { equity: 0.15, debt: 0.65, gold: 0.10, cash: 0.10 }
  },
  Moderate: { 
    color: C.moss, 
    risk: "Medium Risk", 
    horizon: "5–7 years",
    baseAllocation: { equity: 0.55, debt: 0.30, gold: 0.10, cash: 0.05 }
  },
  Aggressive: { 
    color: C.bad, 
    risk: "High Risk", 
    horizon: "7+ years",
    baseAllocation: { equity: 0.75, debt: 0.15, gold: 0.05, cash: 0.05 }
  },
};

// Helper: Convert decimal to percentage string (0.75 -> "75%")
const toPercent = (decimal) => {
  if (decimal === null || decimal === undefined) return "0%";
  return `${(decimal * 100).toFixed(1)}%`;
};

// Helper: Validate and normalize allocation values (convert percentages to decimals if needed)
const normalizeAllocation = (allocation) => {
  if (!allocation) return null;
  const normalized = {};
  Object.entries(allocation).forEach(([key, value]) => {
    if (value > 1 && value <= 100) {
      normalized[key] = value / 100;
    } else {
      normalized[key] = value;
    }
  });
  return normalized;
};

// Helper: Fix conservative portfolio cash allocation (backend bug fix)
const fixConservativeAllocation = (data, healthMetrics) => {
  if (data.riskProfile !== "Conservative") return data;
  
  const savingsRate = healthMetrics?.savingsRatio || 0;
  const efMonths = healthMetrics?.emergencyFundMonths || 0;
  
  // Only fix if user has strong financial health (high savings or strong EF)
  if (savingsRate >= 0.30 || efMonths >= 6) {
    const total = data.recommendedAssets.equity + data.recommendedAssets.debt + 
                  data.recommendedAssets.gold + data.recommendedAssets.cash;
    
    // Correct allocation for strong financial health:
    // Equity: 20%, Debt: 65%, Gold: 10%, Cash: 5%
    const correctedEquity = total * 0.20;
    const correctedDebt = total * 0.65;
    const correctedGold = total * 0.10;
    const correctedCash = total * 0.05;
    
    data.recommendedAssets.equity = Math.round(correctedEquity);
    data.recommendedAssets.debt = Math.round(correctedDebt);
    data.recommendedAssets.gold = Math.round(correctedGold);
    data.recommendedAssets.cash = Math.round(correctedCash);
    
    // Update profile context for Base vs Adjusted display
    if (data.profileContext) {
      data.profileContext.wasPersonalized = true;
      data.profileContext.baseAllocation = PROFILES.Conservative.baseAllocation;
      data.profileContext.adjustedAllocation = {
        equity: 0.20,
        debt: 0.65,
        gold: 0.10,
        cash: 0.05
      };
    }
  }
  
  return data;
};

// Helper: Validate allocation totals (should sum to 1.0 within 0.01 tolerance)
const validateAllocationTotal = (allocations) => {
  if (!allocations) return false;
  const total = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  return Math.abs(total - 1.0) < 0.01;
};

// Helper: Generate personalized AI recommendations
const generateAIRecommendation = (riskProfile, metrics, portfolio, totalInvested) => {
  const sr = metrics?.savingsRatio || 0;
  const efMonths = metrics?.emergencyFundMonths || 0;
  const dti = metrics?.debtToIncome || 0;
  
  const equityAmount = portfolio?.recommendedAssets?.equity || 0;
  const equityDecimal = totalInvested > 0 ? equityAmount / totalInvested : 0;
  const equityPercent = (equityDecimal * 100).toFixed(1);

  if (riskProfile === "Conservative") {
    if (efMonths < 3) {
      return {
        nextAction: `Build emergency fund to 3 months (currently ${efMonths.toFixed(1)} months) before investing. Redirect this ₹${totalInvested.toLocaleString()} to savings account.`,
        timeline: "3–6 months",
        rebalanceTrigger: "After EF is funded, review conservative allocation annually."
      };
    }
    const debtDecimal = portfolio?.recommendedAssets?.debt / totalInvested || 0;
    return {
      nextAction: `Maintain conservative allocation with ${toPercent(debtDecimal)} debt (₹${((portfolio?.recommendedAssets?.debt || 0)).toLocaleString()}). Your ${(sr * 100).toFixed(1)}% savings rate supports this defensive posture. Consider a 1-year recurring deposit for additional stability.`,
      timeline: "Review quarterly or when interest rates change significantly",
      rebalanceTrigger: "Rebalance when debt allocation drifts >5% from target."
    };
  }
  
  if (riskProfile === "Moderate") {
    if (efMonths < 6) {
      return {
        nextAction: `Strengthen emergency fund to 6 months (currently ${efMonths.toFixed(1)} months). Consider reducing equity exposure temporarily or allocating 20% of new investments to debt.`,
        timeline: "6–12 months",
        rebalanceTrigger: "After EF reaches 6 months, rebalance to target moderate allocation."
      };
    }
    if (sr > 0.30) {
      return {
        nextAction: `Excellent savings rate (${(sr * 100).toFixed(1)}%). Increase equity SIP by ₹${Math.round(totalInvested * 0.1).toLocaleString()} annually. Your risk capacity is above average.`,
        timeline: "Next 3 months",
        rebalanceTrigger: "Rebalance semi-annually or when any asset drifts >5%."
      };
    }
    return {
      nextAction: `Maintain ${equityPercent}% equity (₹${equityAmount.toLocaleString()}). Use 50% of future salary hikes to increase equity allocation. Target ${Math.min(65, parseFloat(equityPercent) + 5)}% equity within 2 years.`,
      timeline: "6–12 months",
      rebalanceTrigger: "Rebalance annually or after major market moves (±10%)."
    };
  }
  
  // Aggressive profile
  if (efMonths < 6) {
    return {
      nextAction: `Emergency fund (${efMonths.toFixed(1)} months) insufficient for aggressive portfolio. Build to 9 months before deploying full equity allocation. Temporarily shift to moderate allocation.`,
      timeline: "9–12 months",
      rebalanceTrigger: "After EF secured, rebalance to aggressive targets."
    };
  }
  if (dti > 0.20) {
    return {
      nextAction: `Reduce debt (DTI: ${(dti * 100).toFixed(1)}%) before maximizing equity exposure. Direct 30% of investment amount to debt repayment.`,
      timeline: "12–18 months",
      rebalanceTrigger: "When DTI falls below 15%, rebalance to full aggressive allocation."
    };
  }
  return {
    nextAction: `Full aggressive allocation: ${equityPercent}% equity (₹${equityAmount.toLocaleString()}). Consider small-cap and mid-cap funds for alpha. Expected long-term return: 11-13% but expect 30-40% drawdowns.`,
    timeline: "Review in 12 months or after major market events",
    rebalanceTrigger: "Rebalance annually. During market crashes (>20% drop), consider tax-loss harvesting."
  };
};

export default function Portfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [form, setForm] = useState({ riskProfile: "Moderate", investmentAmount: "" });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [healthMetrics, setHealthMetrics] = useState(null);

  useEffect(() => {
    if (user?._id) {
      Promise.all([
        api.get(`/portfolio/${user._id}`).catch(() => ({ data: null })),
        api.get("/financial/health").catch(() => ({ data: null }))
      ]).then(([portfolioRes, healthRes]) => {
        let portfolioData = portfolioRes.data;
        const metrics = healthRes.data?.metrics || null;
        
        // Normalize portfolio data if it exists
        if (portfolioData && portfolioData.profileContext) {
          if (portfolioData.profileContext.baseAllocation) {
            portfolioData.profileContext.baseAllocation = normalizeAllocation(portfolioData.profileContext.baseAllocation);
          }
          if (portfolioData.profileContext.adjustedAllocation) {
            portfolioData.profileContext.adjustedAllocation = normalizeAllocation(portfolioData.profileContext.adjustedAllocation);
          }
        }
        
        // Fix conservative portfolio if needed
        if (portfolioData && portfolioData.riskProfile === "Conservative" && metrics) {
          portfolioData = fixConservativeAllocation(portfolioData, metrics);
        }
        
        setPortfolio(portfolioData);
        setHealthMetrics(metrics);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else { setLoading(false); }
  }, [user]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError("");
    const amount = Number(form.investmentAmount);
    if (!amount || amount <= 0) { 
      setError("Enter a valid investment amount greater than 0."); 
      return; 
    }
    if (amount < 1000) { 
      setError("Minimum investment amount is Rs.1,000."); 
      return; 
    }
    setGenerating(true);
    try {
      const { data } = await api.post("/portfolio/generate", { 
        riskProfile: form.riskProfile, 
        investmentAmount: amount,
        healthMetrics
      });
      
      // Normalize the response data
      if (data && data.profileContext) {
        if (data.profileContext.baseAllocation) {
          data.profileContext.baseAllocation = normalizeAllocation(data.profileContext.baseAllocation);
        }
        if (data.profileContext.adjustedAllocation) {
          data.profileContext.adjustedAllocation = normalizeAllocation(data.profileContext.adjustedAllocation);
        }
      }
      
      // Fix conservative portfolio cash allocation bug
      const fixedData = fixConservativeAllocation(data, healthMetrics);
      
      // Validate the returned allocations sum to 100% (decimal 1.0)
      if (fixedData.recommendedAssets) {
        const totalDecimal = Object.values(fixedData.recommendedAssets).reduce((sum, val) => sum + (val / amount), 0);
        if (Math.abs(totalDecimal - 1.0) > 0.01) {
          console.error("Invalid allocation total from API:", totalDecimal);
          setError("Generated portfolio has invalid allocation. Please try again.");
          setGenerating(false);
          return;
        }
      }
      
      setPortfolio(fixedData); 
      setAiSuggestion(null);
    } catch (err) { 
      setError(err.response?.data?.message || "Could not generate portfolio."); 
    } finally { 
      setGenerating(false); 
    }
  };

  const handleAISuggest = async () => {
    if (!portfolio) return;
    const metrics = healthMetrics || {};
    const totalInvested = portfolio.recommendedAssets ? 
      Object.values(portfolio.recommendedAssets).reduce((a, b) => a + b, 0) : 0;
    const recommendation = generateAIRecommendation(portfolio.riskProfile, metrics, portfolio, totalInvested);
    setAiSuggestion(recommendation);
  };

  const assets = portfolio?.recommendedAssets || {};
  const assetEntries = Object.entries(assets).filter(([, v]) => v > 0);
  const totalInvested = assetEntries.reduce((a, [, v]) => a + v, 0);
  const profileConfig = portfolio ? PROFILES[portfolio.riskProfile] : null;

  // Calculate expected return using decimal weights
  const getExpectedReturnRange = () => {
    if (!portfolio?.recommendedAssets || !profileConfig || totalInvested === 0) return null;
    
    const equityWeight = (portfolio.recommendedAssets.equity || 0) / totalInvested;
    const debtWeight = (portfolio.recommendedAssets.debt || 0) / totalInvested;
    const goldWeight = (portfolio.recommendedAssets.gold || 0) / totalInvested;
    const cashWeight = (portfolio.recommendedAssets.cash || 0) / totalInvested;
    
    const equityReturnLow = 0.08;
    const equityReturnHigh = 0.12;
    const debtReturnLow = 0.06;
    const debtReturnHigh = 0.08;
    const goldReturnLow = 0.07;
    const goldReturnHigh = 0.09;
    const cashReturnLow = 0.035;
    const cashReturnHigh = 0.045;
    
    const lowReturn = (equityWeight * equityReturnLow) + (debtWeight * debtReturnLow) + (goldWeight * goldReturnLow) + (cashWeight * cashReturnLow);
    const highReturn = (equityWeight * equityReturnHigh) + (debtWeight * debtReturnHigh) + (goldWeight * goldReturnHigh) + (cashWeight * cashReturnHigh);
    
    return { 
      low: (lowReturn * 100).toFixed(1),
      high: (highReturn * 100).toFixed(1)
    };
  };

  const returnRange = getExpectedReturnRange();

  const chartData = assetEntries.length > 0 ? {
    labels: assetEntries.map(([k]) => ASSETS[k]?.label || k),
    datasets: [{ 
      data: assetEntries.map(([, v]) => v), 
      backgroundColor: assetEntries.map(([k]) => ASSETS[k]?.color || C.muted), 
      borderWidth: 2, 
      borderColor: C.beige 
    }],
  } : null;

  // Build personalized explanation with standardized decimal handling
  const getPersonalizedExplanation = () => {
    if (!portfolio || !profileConfig || totalInvested === 0) return "";
    
    const sr = healthMetrics?.savingsRatio || 0;
    const efMonths = healthMetrics?.emergencyFundMonths || 0;
    const dti = healthMetrics?.debtToIncome || 0;
    
    const equityDecimal = (portfolio.recommendedAssets.equity || 0) / totalInvested;
    const debtDecimal = (portfolio.recommendedAssets.debt || 0) / totalInvested;
    const goldDecimal = (portfolio.recommendedAssets.gold || 0) / totalInvested;
    const cashDecimal = (portfolio.recommendedAssets.cash || 0) / totalInvested;
    
    const baseAlloc = profileConfig.baseAllocation;
    
    let adjustments = [];
    let reasoning = [];
    
    // Check equity adjustment
    if (Math.abs(equityDecimal - baseAlloc.equity) > 0.005) {
      if (equityDecimal > baseAlloc.equity) {
        adjustments.push(`equity increased from ${toPercent(baseAlloc.equity)} to ${toPercent(equityDecimal)}`);
        if (sr >= 0.30) reasoning.push(`exceptional savings rate (${toPercent(sr)}) increases risk capacity`);
        else if (efMonths >= 6) reasoning.push(`fully funded emergency fund (${efMonths.toFixed(1)} months) supports higher equity`);
        else if (dti === 0) reasoning.push(`zero debt burden enables higher growth allocation`);
      } else if (equityDecimal < baseAlloc.equity) {
        adjustments.push(`equity reduced from ${toPercent(baseAlloc.equity)} to ${toPercent(equityDecimal)}`);
        if (efMonths < 3) reasoning.push(`insufficient emergency fund (${efMonths.toFixed(1)} months) requires defensive posture`);
        else if (dti > 0.35) reasoning.push(`high debt burden (${toPercent(dti)} DTI) limits risk capacity`);
        else if (sr < 0.10) reasoning.push(`low savings rate (${toPercent(sr)}) reduces ability to recover from losses`);
      }
    }
    
    // Check cash adjustment - FIXED: Cash decreases when risk capacity increases
    if (Math.abs(cashDecimal - baseAlloc.cash) > 0.005) {
      if (cashDecimal < baseAlloc.cash) {
        adjustments.push(`cash reduced from ${toPercent(baseAlloc.cash)} to ${toPercent(cashDecimal)}`);
        if (efMonths >= 6) reasoning.push(`strong emergency fund allows minimizing cash drag for better returns`);
        else if (sr >= 0.30) reasoning.push(`high savings rate reduces need for excess liquidity`);
      } else if (cashDecimal > baseAlloc.cash) {
        adjustments.push(`cash increased from ${toPercent(baseAlloc.cash)} to ${toPercent(cashDecimal)}`);
        if (efMonths < 3) reasoning.push(`low emergency fund requires higher liquidity buffer`);
        else if (dti > 0.35) reasoning.push(`high debt burden necessitates larger cash reserve`);
      }
    }
    
    const adjustmentText = adjustments.length > 0 ? `${adjustments.join(", ")}. ` : "";
    const reasoningText = reasoning.length > 0 ? `This allocation was personalized because ${reasoning.join(", and ")}. ` : "";
    
    const equityNote = equityDecimal > 0.50 ? 
      `${toPercent(equityDecimal)} equity drives long-term growth (~10-12% historically over 7+ years).` :
      `${toPercent(equityDecimal)} equity provides inflation-beating growth while limiting downside.`;
    
    const debtNote = debtDecimal > 0.40 ?
      `${toPercent(debtDecimal)} debt provides stability and ~7-8% predictable returns, forming portfolio anchor.` :
      `${toPercent(debtDecimal)} debt offers stability buffer with ~7% predictable returns.`;
    
    const goldNote = `${toPercent(goldDecimal)} gold hedges inflation and currency risk, and tends to rise when equity falls — providing natural portfolio balance.`;
    
    const cashNote = cashDecimal <= 0.05 ?
      `${toPercent(cashDecimal)} cash minimizes liquidity drag; emergency fund covers short-term needs.` :
      `${toPercent(cashDecimal)} cash ensures liquidity without meaningfully dragging down returns.`;
    
    return `${adjustmentText}${reasoningText}${equityNote} ${debtNote} ${goldNote} ${cashNote}`;
  };

  return (
    <PageShell title="Portfolio Recommendation" subtitle="Generate a personalized asset allocation based on your risk profile and financial health.">

      {/* Profile selector */}
      <Card style={{ marginBottom: "1.5rem" }}>
        <SectionLabel>Risk Profile</SectionLabel>
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {Object.entries(PROFILES).map(([profile, cfg]) => (
            <div key={profile} onClick={() => setForm({ ...form, riskProfile: profile })} style={{ flex: 1, minWidth: "120px", padding: "1rem", borderRadius: "12px", border: `2px solid ${form.riskProfile === profile ? cfg.color : `${C.moss}22`}`, background: form.riskProfile === profile ? `${cfg.color}12` : `${C.darkGreen}06`, cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}>
              <p style={{ fontWeight: "700", fontSize: "0.95rem", color: cfg.color, margin: "0 0 0.2rem" }}>{profile}</p>
              <p style={{ color: C.muted, fontSize: "0.78rem", margin: "0 0 0.1rem" }}>{cfg.risk}</p>
              <p style={{ color: C.muted, fontSize: "0.72rem", margin: 0 }}>Horizon: {cfg.horizon}</p>
            </div>
          ))}
        </div>
        <form onSubmit={handleGenerate} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: "240px" }}>
            <FInput label="Investment Amount (Rs.) — minimum Rs.1,000" type="number" min="1000" placeholder="e.g. 50000" value={form.investmentAmount} onChange={e => { setForm({ ...form, investmentAmount: e.target.value }); setError(""); }} required />
          </div>
          <PrimaryBtn disabled={generating} style={{ flexShrink: 0, alignSelf: "flex-end" }}>{generating ? "Generating..." : "Generate Portfolio"}</PrimaryBtn>
        </form>
        {error && <p style={{ color: C.bad, fontSize: "0.85rem", marginTop: "0.75rem", background: `${C.bad}0f`, padding: "0.6rem 0.9rem", borderRadius: "8px", border: `1px solid ${C.bad}33` }}>{error}</p>}
      </Card>

      {loading && <p style={{ color: `${C.beige}66` }}>Loading portfolio...</p>}

      {!loading && !portfolio && !generating && (
        <Card style={{ textAlign: "center", padding: "2.5rem" }}>
          <p style={{ color: C.muted }}>No portfolio yet. Select a risk profile and enter an amount above to get started.</p>
        </Card>
      )}

      {portfolio && (
        <Card style={{ marginBottom: "1.5rem" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
            <div>
              <p style={{ fontWeight: "700", fontSize: "1.1rem", color: C.darkGreen, margin: 0 }}>{portfolio.riskProfile} Portfolio</p>
              <p style={{ color: C.muted, fontSize: "0.85rem", margin: "0.2rem 0 0" }}>Total: ₹{totalInvested.toLocaleString()}</p>
            </div>
            <span style={{ padding: "0.3rem 0.9rem", borderRadius: "999px", fontWeight: "600", fontSize: "0.82rem", background: `${profileConfig?.color}18`, color: profileConfig?.color }}>{profileConfig?.risk}</span>
          </div>

          {/* Chart + asset list */}
          <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {chartData && <div style={{ width: "200px", flexShrink: 0 }}><Pie data={chartData} options={{ plugins: { legend: { display: false } } }} /></div>}
            <div style={{ flex: 1, minWidth: "200px" }}>
              {assetEntries.map(([key, amount]) => {
                const cfg = ASSETS[key] || { label: key, color: C.muted, note: "" };
                const decimal = totalInvested > 0 ? amount / totalInvested : 0;
                const percentDisplay = toPercent(decimal);
                return (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: `1px solid ${C.moss}15` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontWeight: "600", color: C.darkGreen, fontSize: "0.88rem", margin: 0 }}>{cfg.label}</p>
                        {cfg.note && <p style={{ color: C.muted, fontSize: "0.7rem", margin: "0.1rem 0 0" }}>{cfg.note}</p>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: "700", color: C.darkGreen, margin: 0, fontSize: "0.92rem" }}>₹{amount.toLocaleString()}</p>
                      <p style={{ color: C.muted, fontSize: "0.72rem", margin: "0.1rem 0 0" }}>{percentDisplay}</p>
                    </div>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.75rem" }}>
                <span style={{ fontWeight: "700", color: C.darkGreen }}>Total</span>
                <span style={{ fontWeight: "700", color: C.darkGreen }}>₹{totalInvested.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Rationale */}
          <div style={{ background: `${C.darkGreen}06`, border: `1px solid ${C.moss}22`, padding: "1rem 1.25rem", borderRadius: "10px", marginBottom: "1rem" }}>
            <p style={{ fontWeight: "600", color: C.darkGreen, fontSize: "0.85rem", margin: "0 0 0.5rem" }}>Why this allocation?</p>
            <p style={{ color: C.darkGreen, fontSize: "0.86rem", lineHeight: 1.6, marginBottom: "0.75rem" }}>
              {getPersonalizedExplanation()}
            </p>
            <button style={{ background: "none", border: "none", color: C.moss, cursor: "pointer", fontSize: "0.8rem", fontWeight: "600", padding: 0, fontFamily: "inherit" }} onClick={() => setShowDetail(d => !d)}>
              {showDetail ? "Hide details" : "Show asset breakdown"}
            </button>
            {showDetail && (
              <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: `1px solid ${C.moss}22` }}>
                {assetEntries.map(([key, amount]) => {
                  const decimal = totalInvested > 0 ? amount / totalInvested : 0;
                  const percentDisplay = toPercent(decimal);
                  let detailText = "";
                  if (key === "equity") detailText = decimal > 0.50 ? "Primary growth driver. Expect 30-40% drawdowns in bear markets." : "Provides inflation-beating growth while limiting downside.";
                  if (key === "debt") detailText = "Delivers ~7% predictable returns and capital protection.";
                  if (key === "gold") detailText = "Inflation hedge; tends to rise when equity falls.";
                  if (key === "cash") detailText = decimal <= 0.05 ? "Minimal liquidity drag; EF covers short-term needs." : "Liquidity reserve for short-term needs.";
                  return <p key={key} style={{ color: C.muted, fontSize: "0.8rem", marginBottom: "0.3rem" }}>• {ASSETS[key]?.label}: {percentDisplay} — {detailText}</p>;
                })}
              </div>
            )}
          </div>

          {/* Expected Return */}
          {returnRange && (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div style={{ flex: 1, minWidth: "110px", background: `${C.darkGreen}06`, padding: "0.75rem 1rem", borderRadius: "8px" }}>
                <p style={{ color: C.muted, fontSize: "0.72rem", margin: 0, textTransform: "uppercase", letterSpacing: "0.3px" }}>Expected Return</p>
                <p style={{ fontWeight: "700", color: C.darkGreen, margin: "0.2rem 0 0", fontSize: "0.92rem" }}>{returnRange.low}–{returnRange.high}%</p>
              </div>
              <div style={{ flex: 1, minWidth: "110px", background: `${C.darkGreen}06`, padding: "0.75rem 1rem", borderRadius: "8px" }}>
                <p style={{ color: C.muted, fontSize: "0.72rem", margin: 0, textTransform: "uppercase", letterSpacing: "0.3px" }}>Risk Level</p>
                <p style={{ fontWeight: "700", color: profileConfig?.color, margin: "0.2rem 0 0", fontSize: "0.92rem" }}>{profileConfig?.risk}</p>
              </div>
              <div style={{ flex: 1, minWidth: "110px", background: `${C.darkGreen}06`, padding: "0.75rem 1rem", borderRadius: "8px" }}>
                <p style={{ color: C.muted, fontSize: "0.72rem", margin: 0, textTransform: "uppercase", letterSpacing: "0.3px" }}>Horizon</p>
                <p style={{ fontWeight: "700", color: C.darkGreen, margin: "0.2rem 0 0", fontSize: "0.92rem" }}>{profileConfig?.horizon}</p>
              </div>
              {portfolio.profileContext?.wasPersonalized && (
                <div style={{ flex: 1, minWidth: "110px", background: `${C.darkGreen}06`, padding: "0.75rem 1rem", borderRadius: "8px" }}>
                  <p style={{ color: C.muted, fontSize: "0.72rem", margin: 0, textTransform: "uppercase", letterSpacing: "0.3px" }}>Personalized</p>
                  <p style={{ fontWeight: "700", color: C.moss, margin: "0.2rem 0 0", fontSize: "0.92rem" }}>Yes</p>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ background: `${C.warn}0f`, border: `1px solid ${C.warn}33`, padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1rem" }}>
            <p style={{ color: C.warn, fontSize: "0.75rem", margin: 0, lineHeight: 1.4 }}>
              ⚠️ Expected returns are based on long-term historical averages (equity: 8-12%, debt: 6-8%, gold: 7-9%, cash: 3.5-4.5%) and are not guaranteed. Past performance does not indicate future results. This is not investment advice.
            </p>
          </div>

          {/* Base vs Adjusted Allocation */}
          {portfolio.profileContext?.wasPersonalized && portfolio.profileContext.baseAllocation && (
            <div style={{ background: `${C.darkGreen}06`, border: `1px solid ${C.moss}22`, padding: "1rem 1.25rem", borderRadius: "10px", marginBottom: "1rem" }}>
              <SectionLabel>Base vs Adjusted Allocation</SectionLabel>
              {Object.entries(portfolio.profileContext.baseAllocation).map(([asset, baseDecimal]) => {
                const baseDecimalValue = typeof baseDecimal === 'number' ? baseDecimal : 0;
                const adjDecimal = portfolio.profileContext.adjustedAllocation?.[asset] ?? baseDecimalValue;
                const adjDecimalValue = typeof adjDecimal === 'number' ? adjDecimal : 0;
                const diff = adjDecimalValue - baseDecimalValue;
                const cfg = ASSETS[asset] || { label: asset, color: C.muted };
                
                const basePercent = (baseDecimalValue * 100).toFixed(0);
                const adjPercent = (adjDecimalValue * 100).toFixed(0);
                const diffPercent = (diff * 100).toFixed(0);
                
                return (
                  <div key={asset} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.86rem", marginBottom: "0.35rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.color }} />
                    <span style={{ flex: 1, color: C.darkGreen }}>{cfg.label}</span>
                    <span style={{ color: C.muted, minWidth: "32px", textAlign: "right" }}>{basePercent}%</span>
                    <span style={{ color: C.muted, fontSize: "0.78rem" }}>→</span>
                    <span style={{ fontWeight: "700", minWidth: "48px", color: diff > 0 ? C.bad : diff < 0 ? C.good : C.muted }}>
                      {adjPercent}%{diff !== 0 && <span style={{ fontSize: "0.7rem", marginLeft: "0.2rem" }}>({diff > 0 ? "+" : ""}{diffPercent}%)</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <PrimaryBtn onClick={handleAISuggest} style={{ background: C.darkGreen, color: C.beige }}>Get AI Suggestion</PrimaryBtn>

          {/* Rebalance Roadmap */}
          {portfolio.rebalanceTimeline?.length > 0 && (
            <div style={{ background: `${C.darkGreen}06`, border: `1px solid ${C.moss}22`, padding: "1rem 1.25rem", borderRadius: "10px", marginTop: "1.25rem" }}>
              <SectionLabel>Rebalance Roadmap</SectionLabel>
              {portfolio.rebalanceTimeline.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: "0.75rem", marginBottom: "0.9rem", alignItems: "flex-start" }}>
                  <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: C.moss, color: C.darkGreen, fontSize: "0.7rem", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>{i+1}</div>
                  <div>
                    <p style={{ fontWeight: "700", color: C.moss, fontSize: "0.82rem", margin: 0 }}>{step.when}</p>
                    <p style={{ color: C.darkGreen, fontSize: "0.86rem", margin: "0.15rem 0 0" }}>{step.action}</p>
                    <p style={{ color: C.muted, fontSize: "0.8rem", margin: "0.1rem 0 0", fontStyle: "italic" }}>{step.then}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {aiSuggestion && (
        <Card>
          <SectionLabel>AI Next Steps</SectionLabel>
          <div style={{ marginBottom: "0.9rem" }}>
            <p style={{ color: C.muted, fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 0.25rem" }}>Priority Action</p>
            <p style={{ color: C.darkGreen, fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{aiSuggestion.nextAction}</p>
          </div>
          <div style={{ marginBottom: "0.9rem" }}>
            <p style={{ color: C.muted, fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 0.25rem" }}>Timeline</p>
            <p style={{ color: C.darkGreen, fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{aiSuggestion.timeline}</p>
          </div>
          <div>
            <p style={{ color: C.muted, fontSize: "0.72rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 0.25rem" }}>When to Rebalance</p>
            <p style={{ color: C.darkGreen, fontSize: "0.88rem", lineHeight: 1.6, margin: 0 }}>{aiSuggestion.rebalanceTrigger}</p>
          </div>
        </Card>
      )}
    </PageShell>
  );
}