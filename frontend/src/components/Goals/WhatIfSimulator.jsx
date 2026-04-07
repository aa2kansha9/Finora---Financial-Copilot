import { useState } from "react";
import api from "../../services/api";
import useDashboard from "../../services/useDashboard";
import PageShell, { C, Card, SectionLabel, PrimaryBtn, FInput } from "../Dashboard/PageShell.jsx";

const fmtPct = (n) => (typeof n === "number" && isFinite(n) ? `${(n * 100).toFixed(1)}%` : "—");
const fmtMo  = (n, provided) => {
  if (provided === false || (provided !== true && n == null)) return "No data provided";
  if (typeof n === "number" && isFinite(n)) return `${n.toFixed(1)} months`;
  return "No data provided";
};
const fmtRs  = (n) => (typeof n === "number" && isFinite(n) ? `₹${Math.round(n).toLocaleString()}` : "—");
const scoreColor = (s) => s >= 80 ? C.good : s >= 50 ? C.warn : C.bad;

// Helper to calculate spending ratio from income and expenses
const calculateSpendingRatio = (income, expenses) => {
  if (!income || income <= 0) return null;
  if (!expenses || expenses < 0) return 0;
  return expenses / income;
};

// Helper to calculate savings rate (net savings / income)
const calculateSavingsRate = (income, expenses, debtPayment, investments) => {
  if (!income || income <= 0) return 0;
  const netSavings = income - expenses - (debtPayment || 0);
  return Math.max(0, netSavings / income);
};

// Helper to calculate investment rate
const calculateInvestmentRate = (income, investments) => {
  if (!income || income <= 0) return 0;
  return Math.min(1, (investments || 0) / income);
};

// Calculate individual component score (returns 0-100)
const calculateComponentRawScore = (value, optimalMin, optimalMax, isHigherBetter = true) => {
  if (isHigherBetter) {
    if (value <= optimalMin) return 0;
    if (value >= optimalMax) return 100;
    // Logarithmic scaling for diminishing returns
    const progress = (value - optimalMin) / (optimalMax - optimalMin);
    return 100 * (1 - Math.pow(1 - progress, 1.5));
  } else {
    // For metrics where lower is better
    if (value >= optimalMin) return 0;
    if (value <= optimalMax) return 100;
    const progress = (optimalMin - value) / (optimalMin - optimalMax);
    return 100 * (1 - Math.pow(1 - progress, 1.5));
  }
};

// Calculate comprehensive financial score (returns 0-100)
const calculateFinancialScore = (income, expenses, debt, investments, efMonths) => {
  // Calculate component values
  const savingsRate = calculateSavingsRate(income, expenses, debt, investments);
  const spendingRatio = calculateSpendingRatio(income, expenses);
  const investmentRate = calculateInvestmentRate(income, investments);
  const debtToIncome = income > 0 ? debt / income : 0;
  
  // Calculate raw component scores (0-100 each)
  const savingsRawScore = calculateComponentRawScore(savingsRate, 0, 0.70, true);
  const spendingRawScore = calculateComponentRawScore(spendingRatio, 0.80, 0.30, false);
  const debtRawScore = calculateComponentRawScore(debtToIncome, 0.50, 0, false);
  const investmentRawScore = calculateComponentRawScore(investmentRate, 0, 0.30, true);
  const efRawScore = calculateComponentRawScore(efMonths, 0, 12, true);
  
  // Apply weights (total = 100%)
  const weights = {
    savings: 0.30,
    spending: 0.20,
    debt: 0.20,
    investments: 0.15,
    emergencyFund: 0.15
  };
  
  // Calculate weighted scores
  const savingsWeightedScore = savingsRawScore * weights.savings;
  const spendingWeightedScore = spendingRawScore * weights.spending;
  const debtWeightedScore = debtRawScore * weights.debt;
  const investmentWeightedScore = investmentRawScore * weights.investments;
  const efWeightedScore = efRawScore * weights.emergencyFund;
  
  // Total score (0-100)
  const totalScore = Math.min(100, Math.max(0, 
    savingsWeightedScore + spendingWeightedScore + debtWeightedScore + 
    investmentWeightedScore + efWeightedScore
  ));
  
  return {
    total: Math.round(totalScore),
    components: {
      savings: { rawScore: savingsRawScore, weightedScore: savingsWeightedScore, weight: weights.savings, value: savingsRate },
      spending: { rawScore: spendingRawScore, weightedScore: spendingWeightedScore, weight: weights.spending, value: spendingRatio },
      debt: { rawScore: debtRawScore, weightedScore: debtWeightedScore, weight: weights.debt, value: debtToIncome },
      investments: { rawScore: investmentRawScore, weightedScore: investmentWeightedScore, weight: weights.investments, value: investmentRate },
      emergencyFund: { rawScore: efRawScore, weightedScore: efWeightedScore, weight: weights.emergencyFund, value: efMonths }
    }
  };
};

function MetricList({ metrics, income, expenses, isSimulated }) {
  const savingsRate = metrics?.savingsRate ?? calculateSavingsRate(income, expenses, metrics?.monthlyDebtPayment, metrics?.monthlyInvestments);
  const debtToIncome = metrics?.debtToIncome ?? (metrics?.monthlyDebtPayment ? metrics.monthlyDebtPayment / income : 0);
  const emergencyFundMonths = metrics?.emergencyFundMonths ?? null;
  const emergencyFundProvided = metrics?.emergencyFundProvided ?? false;
  const emergencyFundRupees = metrics?.emergencyFundRupees ?? null;
  const investmentRate = metrics?.investmentRate ?? calculateInvestmentRate(income, metrics?.monthlyInvestments);
  const spendingRatio = calculateSpendingRatio(income, expenses);
  
  const rows = [
    { label: "Savings Rate",   value: fmtPct(savingsRate), description: "Net savings after expenses & debt" },
    { label: "Spending Ratio", value: fmtPct(spendingRatio), description: "Total expenses as % of income" },
    { label: "Investment Rate",value: fmtPct(investmentRate), description: "Investments as % of income" },
    { label: "Debt-to-Income", value: fmtPct(debtToIncome), description: "Debt payments as % of income" },
    { label: "Emergency Fund", value: `${fmtMo(emergencyFundMonths, emergencyFundProvided)}${emergencyFundProvided && emergencyFundRupees != null ? ` (${fmtRs(emergencyFundRupees)})` : ""}`, description: "Months of expenses covered" },
  ];
  return (
    <div style={{ borderTop: `1px solid ${C.moss}22`, paddingTop: "0.75rem" }}>
      {rows.map(r => (
        <div key={r.label} style={{ marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0" }}>
            <span style={{ color: C.muted, fontSize: "0.8rem" }}>{r.label}</span>
            <span style={{ fontWeight: "600", color: C.darkGreen, fontSize: "0.8rem" }}>{r.value}</span>
          </div>
          {isSimulated && r.description && (
            <div style={{ fontSize: "0.7rem", color: C.muted, paddingLeft: "0.5rem" }}>
              {r.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function WhatIfSimulator() {
  const { data, loading, error } = useDashboard();
  const [form, setForm]         = useState({ extraSavings: "", salaryIncrease: "", extraDebtPayment: "", extraInvestment: "" });
  const [result, setResult]     = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const health    = data?.financialHealth;
  const hasData   = health?.dataState === "complete";
  const metrics   = health?.metrics ?? {};

  // Original values
  const originalIncome = metrics.monthlyIncome || 0;
  const originalExpenses = metrics.monthlyExpenses || 0;
  const originalDebt = metrics.monthlyDebtPayment || 0;
  const originalInvestments = metrics.monthlyInvestments || 0;
  const originalEfRupees = metrics.emergencyFundRupees || 0;
  const originalEfMonths = metrics.emergencyFundMonths || 0;
  const originalSavingsRate = calculateSavingsRate(originalIncome, originalExpenses, originalDebt, originalInvestments);
  const originalSpendingRatio = calculateSpendingRatio(originalIncome, originalExpenses);
  const originalInvestmentRate = calculateInvestmentRate(originalIncome, originalInvestments);
  const originalDebtToIncome = originalIncome > 0 ? originalDebt / originalIncome : 0;

  // Calculate current score using new system
  const currentScoreData = calculateFinancialScore(originalIncome, originalExpenses, originalDebt, originalInvestments, originalEfMonths);
  const accurateCurrentScore = currentScoreData.total;

  const baseSnapshot = hasData ? {
    score: accurateCurrentScore, 
    status: health.category, 
    biggestWeakness: health.biggestWeakness,
    income: originalIncome,
    expenses: originalExpenses,
    debt: originalDebt,
    investments: originalInvestments,
    efRupees: originalEfRupees,
    efMonths: originalEfMonths,
    metrics: {
      savingsRate: originalSavingsRate,
      debtToIncome: originalDebtToIncome,
      emergencyFundMonths: originalEfMonths,
      emergencyFundRupees: originalEfRupees,
      emergencyFundProvided: metrics.emergencyFundProvided === true,
      investmentRate: originalInvestmentRate,
      monthlyIncome: originalIncome,
      monthlyExpenses: originalExpenses,
      monthlyInvestments: originalInvestments,
      monthlyDebtPayment: originalDebt,
      spendingRatio: originalSpendingRatio,
    },
  } : null;

  const efKnown    = metrics.emergencyFundProvided === true && originalEfMonths != null;
  const ef         = efKnown ? originalEfMonths : null;
  const efCritical = efKnown && ef < 1;
  const efAtRisk   = efKnown && ef < 3;
  const efRupeesVal = efKnown ? (originalEfRupees || Math.round(ef * originalExpenses)) : 0;
  const efTarget   = Math.round(originalExpenses * 3);
  const efGap      = efKnown ? Math.max(0, efTarget - efRupeesVal) : 0;

  // Build consistent simulated data with proper scoring
  const buildSimulatedData = (inputs, backendResult) => {
    // Calculate simulated values from inputs
    const simulatedIncome = originalIncome + (inputs.salaryIncrease || 0);
    const simulatedExpenses = Math.max(0, originalExpenses - (inputs.extraSavings || 0));
    const simulatedDebt = originalDebt + (inputs.extraDebtPayment || 0);
    const simulatedInvestments = originalInvestments + (inputs.extraInvestment || 0);
    
    // Calculate derived metrics
    const simulatedSavingsRate = calculateSavingsRate(simulatedIncome, simulatedExpenses, simulatedDebt, simulatedInvestments);
    const simulatedInvestmentRate = calculateInvestmentRate(simulatedIncome, simulatedInvestments);
    const simulatedSpendingRatio = calculateSpendingRatio(simulatedIncome, simulatedExpenses);
    const simulatedDebtToIncome = simulatedIncome > 0 ? simulatedDebt / simulatedIncome : 0;
    
    // Emergency fund changes
    const simulatedEfMonths = originalEfRupees > 0 && simulatedExpenses > 0 
      ? originalEfRupees / simulatedExpenses 
      : originalEfMonths;
    
    // Calculate original and simulated scores
    const originalScoreData = calculateFinancialScore(originalIncome, originalExpenses, originalDebt, originalInvestments, originalEfMonths);
    const simulatedScoreData = calculateFinancialScore(simulatedIncome, simulatedExpenses, simulatedDebt, simulatedInvestments, simulatedEfMonths);
    
    const originalScore = originalScoreData.total;
    const simulatedScore = simulatedScoreData.total;
    const totalPointsDiff = simulatedScore - originalScore;
    
    // Build component breakdown for display (showing raw scores before weighting)
    const scoreBreakdown = [
      { 
        label: "Savings Rate", 
        weight: Math.round(originalScoreData.components.savings.weight * 100),
        originalRawScore: originalScoreData.components.savings.rawScore,
        newRawScore: simulatedScoreData.components.savings.rawScore,
        originalWeightedScore: originalScoreData.components.savings.weightedScore,
        newWeightedScore: simulatedScoreData.components.savings.weightedScore,
        pointsDiff: parseFloat((simulatedScoreData.components.savings.weightedScore - originalScoreData.components.savings.weightedScore).toFixed(1)),
        value: simulatedScoreData.components.savings.value
      },
      { 
        label: "Spending", 
        weight: Math.round(originalScoreData.components.spending.weight * 100),
        originalRawScore: originalScoreData.components.spending.rawScore,
        newRawScore: simulatedScoreData.components.spending.rawScore,
        originalWeightedScore: originalScoreData.components.spending.weightedScore,
        newWeightedScore: simulatedScoreData.components.spending.weightedScore,
        pointsDiff: parseFloat((simulatedScoreData.components.spending.weightedScore - originalScoreData.components.spending.weightedScore).toFixed(1)),
        value: simulatedScoreData.components.spending.value
      },
      { 
        label: "Debt", 
        weight: Math.round(originalScoreData.components.debt.weight * 100),
        originalRawScore: originalScoreData.components.debt.rawScore,
        newRawScore: simulatedScoreData.components.debt.rawScore,
        originalWeightedScore: originalScoreData.components.debt.weightedScore,
        newWeightedScore: simulatedScoreData.components.debt.weightedScore,
        pointsDiff: parseFloat((simulatedScoreData.components.debt.weightedScore - originalScoreData.components.debt.weightedScore).toFixed(1)),
        value: simulatedScoreData.components.debt.value
      },
      { 
        label: "Investments", 
        weight: Math.round(originalScoreData.components.investments.weight * 100),
        originalRawScore: originalScoreData.components.investments.rawScore,
        newRawScore: simulatedScoreData.components.investments.rawScore,
        originalWeightedScore: originalScoreData.components.investments.weightedScore,
        newWeightedScore: simulatedScoreData.components.investments.weightedScore,
        pointsDiff: parseFloat((simulatedScoreData.components.investments.weightedScore - originalScoreData.components.investments.weightedScore).toFixed(1)),
        value: simulatedScoreData.components.investments.value
      },
      { 
        label: "Emergency Fund", 
        weight: Math.round(originalScoreData.components.emergencyFund.weight * 100),
        originalRawScore: originalScoreData.components.emergencyFund.rawScore,
        newRawScore: simulatedScoreData.components.emergencyFund.rawScore,
        originalWeightedScore: originalScoreData.components.emergencyFund.weightedScore,
        newWeightedScore: simulatedScoreData.components.emergencyFund.weightedScore,
        pointsDiff: parseFloat((simulatedScoreData.components.emergencyFund.weightedScore - originalScoreData.components.emergencyFund.weightedScore).toFixed(1)),
        value: simulatedScoreData.components.emergencyFund.value
      },
    ];
    
    // Determine status
    let simulatedStatus = "Excellent";
    if (simulatedScore < 80) simulatedStatus = "Good";
    if (simulatedScore < 65) simulatedStatus = "Moderate";
    if (simulatedScore < 50) simulatedStatus = "Poor";
    if (simulatedScore < 30) simulatedStatus = "Critical";
    
    // Calculate free cash flow
    const freeCashFlow = simulatedIncome - simulatedExpenses - simulatedDebt - simulatedInvestments;
    
    // Build detailed explanations
    const explanations = [];
    const changesList = [];
    
    if (inputs.extraSavings > 0) {
      explanations.push(`💰 Expense Reduction: Cutting ₹${inputs.extraSavings.toLocaleString()}/month reduces expenses from ${fmtRs(originalExpenses)} → ${fmtRs(simulatedExpenses)}. Spending ratio improves from ${fmtPct(originalSpendingRatio)} → ${fmtPct(simulatedSpendingRatio)}.`);
      changesList.push(`Reduced monthly expenses by ₹${inputs.extraSavings.toLocaleString()}`);
    }
    if (inputs.salaryIncrease > 0) {
      explanations.push(`📈 Income Increase: Salary +₹${inputs.salaryIncrease.toLocaleString()}/month increases income from ${fmtRs(originalIncome)} → ${fmtRs(simulatedIncome)}.`);
      changesList.push(`Increased monthly income by ₹${inputs.salaryIncrease.toLocaleString()}`);
    }
    if (inputs.extraDebtPayment > 0) {
      explanations.push(`💳 Extra Debt Payment: Adding ₹${inputs.extraDebtPayment.toLocaleString()}/month to debt repayment. Total debt payment: ${fmtRs(originalDebt)} → ${fmtRs(simulatedDebt)}/month.`);
      changesList.push(`Added ₹${inputs.extraDebtPayment.toLocaleString()} to monthly debt payment`);
    }
    if (inputs.extraInvestment > 0) {
      explanations.push(`📊 Increased Investment: Adding ₹${inputs.extraInvestment.toLocaleString()}/month to investments. Investment rate: ${fmtPct(originalInvestmentRate)} → ${fmtPct(simulatedInvestmentRate)}.`);
      changesList.push(`Added ₹${inputs.extraInvestment.toLocaleString()} to monthly investments`);
    }
    
    // Special explanation for savings rate changes
    let savingsRateExplanation = null;
    if (inputs.salaryIncrease > 0 && simulatedSavingsRate < originalSavingsRate) {
      const reasons = [];
      if (inputs.extraDebtPayment > 0) reasons.push("increased debt payments");
      if (inputs.extraInvestment > 0) reasons.push("increased investments");
      if (reasons.length > 0) {
        savingsRateExplanation = `⚠️ Important: Despite your salary increase of ₹${inputs.salaryIncrease.toLocaleString()}/month, your savings rate decreased from ${fmtPct(originalSavingsRate)} to ${fmtPct(simulatedSavingsRate)}. This happened because you allocated additional income toward ${reasons.join(" and ")}. Savings rate measures net savings (income - expenses - debt), not investments. While investing is valuable, it's classified separately from savings in this analysis.`;
      }
    } else if (inputs.salaryIncrease > 0 && simulatedSavingsRate > originalSavingsRate) {
      savingsRateExplanation = `✅ Great! Your savings rate improved from ${fmtPct(originalSavingsRate)} to ${fmtPct(simulatedSavingsRate)}. This means you're keeping more of your increased income as net savings after expenses and debt.`;
    }
    
    // Build contextual info messages
    let infoMessages = [];
    if (simulatedEfMonths > 12) {
      infoMessages.push(`💡 Your emergency fund covers ${simulatedEfMonths.toFixed(1)} months of expenses. While 3-6 months is standard, larger emergency funds make sense for freelancers, business owners, or those nearing retirement. Beyond 12 months, consider investing excess for better returns.`);
    }
    if (simulatedSavingsRate > 0.70) {
      infoMessages.push(`💡 Your savings rate of ${fmtPct(simulatedSavingsRate)} is very high. This is common for FIRE (Financial Independence, Retire Early) enthusiasts. Just ensure you're still enjoying life and not sacrificing necessary expenses.`);
    }
    
    // Build surplus insight
    const surplusInsight = freeCashFlow > 0 
      ? `You have ${fmtRs(freeCashFlow)}/month of unallocated cash (${fmtPct(freeCashFlow/simulatedIncome)} of income). This is calculated as: Income (${fmtRs(simulatedIncome)}) - Expenses (${fmtRs(simulatedExpenses)}) - Debt (${fmtRs(simulatedDebt)}) - Investments (${fmtRs(simulatedInvestments)}). Consider allocating this toward additional investments, debt acceleration, or lifestyle improvements.`
      : freeCashFlow < 0
      ? `⚠️ You have a cash flow deficit of ${fmtRs(Math.abs(freeCashFlow))}/month. Your total outflows (expenses + debt + investments) exceed your income. Consider reducing expenses or debt payments to avoid financial stress.`
      : null;
    
    return {
      simulated: {
        score: simulatedScore,
        status: simulatedStatus,
        income: simulatedIncome,
        expenses: simulatedExpenses,
        debt: simulatedDebt,
        investments: simulatedInvestments,
        efRupees: originalEfRupees,
        efMonths: simulatedEfMonths,
        metrics: {
          savingsRate: simulatedSavingsRate,
          debtToIncome: simulatedDebtToIncome,
          emergencyFundMonths: simulatedEfMonths,
          emergencyFundRupees: originalEfRupees,
          emergencyFundProvided: true,
          investmentRate: simulatedInvestmentRate,
          monthlyIncome: simulatedIncome,
          monthlyExpenses: simulatedExpenses,
          monthlyInvestments: simulatedInvestments,
          monthlyDebtPayment: simulatedDebt,
          spendingRatio: simulatedSpendingRatio,
        },
      },
      scoreDiff: parseFloat(totalPointsDiff.toFixed(1)),
      scoreBreakdown,
      infoMessages,
      explanations,
      changesList,
      savingsRateExplanation,
      surplusInsight,
      freeCashFlow,
      strategy: freeCashFlow > 0 
        ? "Your financial foundation is strong after these changes. Next step: focus on wealth-building — increase SIP contributions, diversify across equity/debt/gold, and review your investment allocation annually."
        : "Consider adjusting your allocations to ensure positive cash flow. You may need to reduce expenses or debt payments before increasing investments.",
      projections: {
        monthlyCashFlow: freeCashFlow,
        projectedSavings12Months: freeCashFlow * 12,
      },
      verdict: totalPointsDiff > 3 
        ? `✅ +${totalPointsDiff.toFixed(1)} points — these changes moderately improve your financial position.`
        : totalPointsDiff > 0
        ? `✅ +${totalPointsDiff.toFixed(1)} points — these changes slightly improve your financial position.`
        : totalPointsDiff < 0 
          ? `⚠️ ${totalPointsDiff.toFixed(1)} points — these changes slightly worsen your financial position.`
          : `No significant change — your financial position remains stable.`,
    };
  };

  const handleRun = async (e) => {
    e.preventDefault();
    if (!hasData) return;
    setSimLoading(true); setResult(null);
    
    const inputs = {
      extraSavings: Number(form.extraSavings) || 0,
      salaryIncrease: Number(form.salaryIncrease) || 0,
      extraDebtPayment: Number(form.extraDebtPayment) || 0,
      extraInvestment: Number(form.extraInvestment) || 0,
    };
    
    try {
      const { data: res } = await api.post("/simulator", inputs);
      const consistentResult = buildSimulatedData(inputs, res);
      setResult(consistentResult);
    } catch (err) { 
      console.error("Simulator API error:", err);
      const fallbackResult = buildSimulatedData(inputs, null);
      setResult(fallbackResult);
    }
    finally { setSimLoading(false); }
  };

  if (loading) return <PageShell title="What-If Simulator"><p style={{ color: `${C.beige}66` }}>Loading...</p></PageShell>;
  if (error)   return <PageShell title="What-If Simulator"><Card><p style={{ color: C.bad }}>{error}</p></Card></PageShell>;
  if (!hasData) return (
    <PageShell title="What-If Simulator">
      <Card style={{ textAlign: "center", padding: "2.5rem" }}>
        <p style={{ color: C.muted }}>{health?.dataState === "partial_data" ? "Income data required. Add your monthly income first." : "No financial data found. Add income and expenses first."}</p>
      </Card>
    </PageShell>
  );

  const currentSnap = baseSnapshot;
  const scoreDiff = result?.scoreDiff || 0;
  const isImprovement = scoreDiff > 0;
  const afterScore = result?.simulated?.score || accurateCurrentScore + scoreDiff;
  const freeCashFlow = result?.freeCashFlow;

  return (
    <PageShell title="What-If Simulator" subtitle="Adjust financial inputs and instantly see how your score would change.">

      {/* Base data bar */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", background: `${C.beige}12`, padding: "0.75rem 1rem", borderRadius: "10px", marginBottom: "1.25rem", border: `1px solid ${C.moss}22` }}>
        {[
          { label: "Income",      value: fmtRs(originalIncome) },
          { label: "Expenses",    value: fmtRs(originalExpenses) },
          { label: "Debt EMI",    value: fmtRs(originalDebt) },
          { label: "Investments", value: fmtRs(originalInvestments) },
          { label: "Savings Rate", value: fmtPct(originalSavingsRate) },
        ].map(item => (
          <div key={item.label} style={{ whiteSpace: "nowrap" }}>
            <span style={{ color: C.muted, fontSize: "0.78rem" }}>{item.label}: </span>
            <strong style={{ color: C.beige, fontSize: "0.88rem" }}>{item.value}/mo</strong>
          </div>
        ))}
      </div>

      {efCritical && (
        <div style={{ background: `${C.bad}12`, border: `1px solid ${C.bad}44`, color: C.bad, padding: "1rem 1.25rem", borderRadius: "10px", marginBottom: "1.25rem", fontSize: "0.88rem", lineHeight: 1.7 }}>
          <strong>Emergency fund critically low ({ef?.toFixed(1)} months, {fmtRs(efRupeesVal)}).</strong> You need {fmtRs(efGap)} more to reach 3 months. Extra debt payments and investments are locked — use savings and salary inputs to build your emergency fund first.
        </div>
      )}

      {/* Form */}
      <Card style={{ marginBottom: "1.5rem" }}>
        <form onSubmit={handleRun}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
            {[
              { key: "extraSavings",     label: "Save more per month (₹)",       hint: "Reduces monthly expenses",                  disabled: false },
              { key: "salaryIncrease",   label: "Salary increase (₹/month)",     hint: "Increases monthly income",                  disabled: false },
              { key: "extraDebtPayment", label: "Extra debt payment (₹/month)",  hint: efCritical ? null : "Added on top of EMIs",  disabled: efCritical, lock: efCritical ? `Locked — build EF to 1 month first (gap: ${fmtRs(efGap)})` : null },
              { key: "extraInvestment",  label: "Invest more per month (₹)",     hint: efCritical ? null : efAtRisk ? "EF below 3 months — consider splitting with EF" : "Added to monthly investments", disabled: efCritical, lock: efCritical ? `Locked — EF critically low (${ef?.toFixed(1)} months). Need ${fmtRs(efGap)} more before investing.` : null },
            ].map(f => (
              <div key={f.key}>
                <FInput label={f.label} type="number" min="0" placeholder={f.disabled ? "Not available" : "e.g. 5000"}
                  value={f.disabled ? "" : form[f.key]}
                  onChange={e => !f.disabled && setForm({ ...form, [f.key]: e.target.value })} />
                {f.lock
                  ? <span style={{ display: "block", color: C.bad, fontSize: "0.72rem", marginTop: "0.25rem", fontWeight: "600" }}>{f.lock}</span>
                  : f.hint && <span style={{ display: "block", color: C.muted, fontSize: "0.72rem", marginTop: "0.25rem" }}>{f.hint}</span>
                }
              </div>
            ))}
          </div>
          <PrimaryBtn disabled={simLoading}>{simLoading ? "Simulating..." : "Run Simulation"}</PrimaryBtn>
        </form>
      </Card>

      {/* Score comparison */}
      <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <Card style={{ flex: 1, minWidth: "220px", borderTop: `4px solid ${C.muted}` }}>
          <p style={{ color: C.muted, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.5rem" }}>Current</p>
          <p style={{ fontSize: "3rem", fontWeight: "800", margin: 0, lineHeight: 1, color: scoreColor(accurateCurrentScore) }}>{accurateCurrentScore}</p>
          <p style={{ fontWeight: "600", color: C.darkGreen, margin: "0.25rem 0 1rem" }}>{health.category}</p>
          <MetricList metrics={currentSnap.metrics} income={currentSnap.income} expenses={currentSnap.expenses} isSimulated={false} />
          {currentSnap.biggestWeakness && currentSnap.biggestWeakness !== "None" && (
            <p style={{ fontSize: "0.75rem", color: C.warn, marginTop: "0.75rem", background: `${C.warn}12`, padding: "0.35rem 0.6rem", borderRadius: "6px" }}>
              Weakness: {currentSnap.biggestWeakness}
            </p>
          )}
        </Card>

        <div style={{ fontSize: "1.8rem", color: `${C.beige}44`, flexShrink: 0, alignSelf: "center" }}>→</div>

        <Card style={{ flex: 1, minWidth: "220px", borderTop: `4px solid ${result ? (isImprovement ? C.good : scoreDiff < 0 ? C.bad : C.muted) : `${C.beige}33`}` }}>
          <p style={{ color: C.muted, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 0.5rem" }}>After Changes</p>
          {result ? (
            <>
              <p style={{ fontSize: "3rem", fontWeight: "800", margin: 0, lineHeight: 1, color: scoreColor(afterScore) }}>{afterScore}</p>
              <p style={{ fontWeight: "600", color: C.darkGreen, margin: "0.25rem 0 1rem" }}>{result.simulated.status}</p>
              <MetricList metrics={result.simulated.metrics} income={result.simulated.income} expenses={result.simulated.expenses} isSimulated={true} />
              <div style={{ marginTop: "1rem", padding: "0.4rem 0.8rem", borderRadius: "8px", fontWeight: "700", fontSize: "1rem", display: "inline-block", background: isImprovement ? `${C.good}18` : scoreDiff < 0 ? `${C.bad}18` : `${C.muted}18`, color: isImprovement ? C.good : scoreDiff < 0 ? C.bad : C.muted }}>
                {scoreDiff > 0 ? "+" : ""}{scoreDiff} points {isImprovement ? "↑" : scoreDiff < 0 ? "↓" : ""}
              </div>
            </>
          ) : (
            <p style={{ color: C.muted, fontSize: "0.88rem", marginTop: "2rem", textAlign: "center" }}>Run a simulation to see results.</p>
          )}
        </Card>
      </div>

      {result && (
        <>
          {/* Info messages */}
          {result.infoMessages?.length > 0 && (
            <div style={{ background: `${C.moss}12`, border: `1px solid ${C.moss}44`, color: C.moss, padding: "1rem 1.25rem", borderRadius: "10px", marginBottom: "1.25rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
              {result.infoMessages.map((msg, i) => <p key={i} style={{ margin: i > 0 ? "0.5rem 0 0" : 0 }}>{msg}</p>)}
            </div>
          )}

          {/* Verdict */}
          <div style={{ background: isImprovement ? `${C.good}12` : scoreDiff < 0 ? `${C.bad}12` : `${C.moss}12`, border: `1px solid ${isImprovement ? C.good : scoreDiff < 0 ? C.bad : C.moss}44`, padding: "1rem 1.25rem", borderRadius: "10px", marginBottom: "1.5rem" }}>
            <p style={{ color: isImprovement ? C.good : scoreDiff < 0 ? C.bad : C.moss, fontWeight: "600", margin: 0, fontSize: "0.95rem" }}>
              {result.verdict}
            </p>
          </div>

          {/* Savings Rate Explanation */}
          {result.savingsRateExplanation && (
            <div style={{ background: `${C.moss}12`, border: `1px solid ${C.moss}44`, padding: "1rem 1.25rem", borderRadius: "10px", marginBottom: "1.25rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
              {result.savingsRateExplanation}
            </div>
          )}

          {/* What Changed */}
          {result.changesList?.length > 0 && (
            <Card style={{ marginBottom: "1.25rem" }}>
              <SectionLabel>What Changed</SectionLabel>
              <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
                {result.changesList.map((change, i) => (
                  <li key={i} style={{ color: C.darkGreen, fontSize: "0.88rem", padding: "0.3rem 0" }}>{change}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* Detailed Explanations */}
          {result.explanations?.length > 0 && (
            <Card style={{ marginBottom: "1.25rem" }}>
              <SectionLabel>Detailed Impact Analysis</SectionLabel>
              {result.explanations.map((e, i) => <p key={i} style={{ color: C.darkGreen, fontSize: "0.88rem", padding: "0.3rem 0", borderBottom: `1px solid ${C.moss}15`, margin: 0 }}>{e}</p>)}
            </Card>
          )}

          {/* Score Component Changes */}
          {result.scoreBreakdown?.length > 0 && (
            <Card style={{ marginBottom: "1.25rem" }}>
              <SectionLabel>Score Component Changes</SectionLabel>
              {result.scoreBreakdown.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: `1px solid ${C.moss}15` }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: C.darkGreen, fontSize: "0.86rem", fontWeight: "600" }}>{c.label}</span>
                    <span style={{ color: C.muted, fontSize: "0.72rem", marginLeft: "0.5rem" }}>(weight {c.weight}%)</span>
                    <div style={{ fontSize: "0.75rem", color: C.muted, marginTop: "0.2rem" }}>
                      Value: {c.label === "Emergency Fund" ? `${c.value.toFixed(1)} months` : fmtPct(c.value)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.72rem", color: C.muted }}>
                      Raw: {c.originalRawScore.toFixed(0)} → {c.newRawScore.toFixed(0)}
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "0.9rem", color: c.pointsDiff > 0 ? C.good : c.pointsDiff < 0 ? C.bad : C.muted }}>
                      {c.originalWeightedScore.toFixed(1)} → {c.newWeightedScore.toFixed(1)} pts ({c.pointsDiff > 0 ? "+" : ""}{c.pointsDiff})
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: `2px solid ${C.moss}30`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "700", color: C.darkGreen }}>Total Score</span>
                <span style={{ fontWeight: "800", fontSize: "1.1rem", color: C.good }}>
                  {currentScoreData.total} → {result.simulated.score} pts ({result.scoreDiff > 0 ? "+" : ""}{result.scoreDiff})
                </span>
              </div>
            </Card>
          )}

          {/* Surplus Opportunity */}
          {result.surplusInsight && (
            <div style={{ background: freeCashFlow > 0 ? `${C.good}12` : `${C.bad}12`, border: `1px solid ${freeCashFlow > 0 ? C.good : C.bad}44`, color: freeCashFlow > 0 ? C.good : C.bad, padding: "1rem 1.25rem", borderRadius: "10px", marginBottom: "1.25rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
              <strong>{freeCashFlow > 0 ? "💰 Surplus Opportunity:" : "⚠️ Cash Flow Alert:"}</strong> {result.surplusInsight}
            </div>
          )}

          {/* Next Step Strategy */}
          {result.strategy && (
            <div style={{ background: `${C.moss}12`, border: `1px solid ${C.moss}44`, color: C.moss, padding: "1rem 1.25rem", borderRadius: "10px", marginBottom: "1.25rem", fontSize: "0.88rem", lineHeight: 1.6 }}>
              <strong>🎯 Next Step:</strong> {result.strategy}
            </div>
          )}

          {/* 12-Month Projections */}
          {result.projections && (
            <Card>
              <SectionLabel>12-Month Projections</SectionLabel>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {[
                  { label: "Free Cash Flow (after all outflows)", value: fmtRs(result.projections.monthlyCashFlow) },
                  { label: "Projected Free Cash (12 months)",     value: fmtRs(result.projections.projectedSavings12Months) },
                ].filter(Boolean).map(s => (
                  <div key={s.label} style={{ flex: 1, minWidth: "140px", background: `${C.darkGreen}08`, padding: "0.75rem", borderRadius: "8px" }}>
                    <p style={{ color: C.muted, fontSize: "0.72rem", margin: 0 }}>{s.label}</p>
                    <p style={{ fontWeight: "700", color: C.darkGreen, margin: "0.25rem 0 0" }}>{s.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </PageShell>
  );
}