const Portfolio = require("../models/Portfolio");

const BASE_ALLOCATION = {
  Conservative: { equity: 20, debt: 50, gold: 10, cash: 20 },
  Moderate:     { equity: 55, debt: 30, gold: 10, cash:  5 },
  Aggressive:   { equity: 75, debt: 15, gold:  5, cash:  5 }
};

const ASSET_RETURNS = {
  equity: 0.12,
  debt:   0.07,
  gold:   0.08,
  cash:   0.04
};

// Conservative volatility estimates for tight, realistic ranges
const ASSET_VOLATILITY = {
  equity: 0.08,
  debt:   0.02,
  gold:   0.05,
  cash:   0.003
};

const RISK_LEVELS = { Conservative: "Low", Moderate: "Medium", Aggressive: "High" };

const RISK_DISCLAIMERS = {
  Conservative: "Past returns are not guaranteed. Debt and gold allocations reduce but do not eliminate risk.",
  Moderate:     "Equity markets can fall 20–40% in the short term. This portfolio is designed for a 5+ year horizon — short-term losses are expected and normal.",
  Aggressive:   "High equity exposure means this portfolio can drop 40–50% in a market downturn. Only invest money you will not need for 7+ years. Short-term volatility is the price of long-term growth."
};

// ── Consistent 1-decimal EF display — never shows 0.0 for non-zero values
const fmtEF = (months) => {
  const v = +months;
  if (v <= 0) return "0.0";
  if (v < 0.1) return "0.1"; // floor at 0.1 so it never shows 0.0 for real data
  return v.toFixed(1);
};

// ── Weighted return with tight ±1% spread
const calcWeightedReturn = (percentages) => {
  let ret = 0;
  let vol = 0;
  for (const [asset, pct] of Object.entries(percentages)) {
    const w = pct / 100;
    ret += w * (ASSET_RETURNS[asset]    || 0);
    vol += w * (ASSET_VOLATILITY[asset] || 0);
  }
  const base   = +(ret * 100).toFixed(1);
  const spread = +(Math.min(1.0, vol * 100 * 0.5)).toFixed(1); // hard cap ±1%
  const low    = +(Math.max(1.0, base - spread)).toFixed(1);
  const high   = +(base + spread).toFixed(1);
  return { weighted: base, low, high, range: `${low}–${high}%` };
};

// ── Key points: strictly one line each, no sub-clauses
const buildKeyPoints = (percentages, base, adjustments, userMetrics) => {
  const { equity: eq, debt: dbt, gold: gld, cash: csh } = percentages;
  const { emergencyFundMonths = 0, debtToIncome = 0, savingsRatio = 0 } = userMetrics;
  const pts = [];

  if (eq < base.equity) {
    const reason = +emergencyFundMonths < 3
      ? `emergency fund is ${fmtEF(emergencyFundMonths)} months (below 3-month minimum)`
      : debtToIncome > 0.30
      ? `debt-to-income is ${(debtToIncome * 100).toFixed(1)}% (above 30% safe limit)`
      : "financial stability metrics";
    pts.push(`${eq}% Equity — reduced from ${base.equity}% because your ${reason}`);
  } else if (eq > base.equity) {
    pts.push(`${eq}% Equity — increased from ${base.equity}% because your savings rate of ${(savingsRatio * 100).toFixed(1)}% supports higher growth`);
  } else {
    pts.push(`${eq}% Equity — standard allocation, primary growth driver`);
  }

  if (dbt > base.debt) {
    pts.push(`${dbt}% Debt — increased from ${base.debt}% to add stability given your financial condition`);
  } else {
    pts.push(`${dbt}% Debt — stability buffer, ~7% predictable annual returns`);
  }

  pts.push(`${gld}% Gold — inflation hedge; tends to rise when equity markets fall`);

  if (csh > base.cash) {
    pts.push(`${csh}% Cash — temporarily above ${base.cash}% base; shift to equity once emergency fund reaches 3 months`);
  } else {
    pts.push(`${csh}% Cash — liquidity reserve for short-term needs`);
  }

  return pts;
};

// ── Full detail: cohesive, health-linked narrative
const buildDetail = (profile, percentages, base, adjustments, userMetrics) => {
  const { eq, dbt, gld, csh } = {
    eq: percentages.equity, dbt: percentages.debt,
    gld: percentages.gold,  csh: percentages.cash
  };
  const {
    emergencyFundMonths = 0, monthlySavings = 0,
    monthlyExpenses = 0,     debtToIncome   = 0,
    savingsRatio    = 0
  } = userMetrics;

  const efStr = fmtEF(emergencyFundMonths);
  const lines = [];

  // Opening: link allocation directly to financial health score
  if (adjustments.length > 0) {
    const reasons = [];
    if (emergencyFundMonths < 3) reasons.push(`emergency fund at ${efStr} months (target: 3)`);
    if (debtToIncome > 0.30)     reasons.push(`debt-to-income at ${(debtToIncome * 100).toFixed(1)}% (safe limit: 20%)`);
    lines.push(`This allocation was adjusted from the standard ${profile} profile because your financial health metrics show: ${reasons.join(" and ")}. These factors reduce your capacity to absorb investment risk, so equity was reduced and safer assets were increased.`);
  } else if (savingsRatio > 0.30) {
    lines.push(`Your strong savings rate of ${(savingsRatio * 100).toFixed(1)}% and stable financial health support this full ${profile} allocation without any defensive adjustments.`);
  } else {
    lines.push(`Standard ${profile} allocation applied — your financial metrics are within acceptable ranges.`);
  }

  // Asset explanations
  if (profile === "Conservative") {
    lines.push(`${eq}% equity provides inflation-beating growth while limiting downside. ${dbt}% debt instruments deliver ~7% predictable returns and protect capital.`);
  } else if (profile === "Moderate") {
    lines.push(`${eq}% equity drives long-term growth (~12% historically over 5+ years). ${dbt}% debt reduces drawdown during market corrections.`);
  } else {
    lines.push(`${eq}% equity maximizes compounding over the long term. Expect 30–40% drawdowns in bad years — this is the cost of higher long-term returns.`);
  }

  lines.push(`${gld}% gold hedges inflation and currency risk, and tends to rise when equity falls — providing natural portfolio balance.`);

  // Cash with specific timeline
  if (csh > base.cash && monthlyExpenses > 0 && monthlySavings > 0) {
    const efTarget  = monthlyExpenses * 3;
    const efCurrent = +emergencyFundMonths * monthlyExpenses;
    const efGap     = Math.max(0, efTarget - efCurrent);
    const months    = Math.ceil(efGap / monthlySavings);
    lines.push(`${csh}% cash (${csh - base.cash}% above standard) improves liquidity while your emergency fund is at ${efStr} months. At ₹${Math.round(monthlySavings).toLocaleString()}/month savings, you will reach the 3-month target (₹${Math.round(efTarget).toLocaleString()}) in ~${months} month${months !== 1 ? "s" : ""}. Then shift this extra ${csh - base.cash}% from cash to equity.`);
  } else if (csh > base.cash) {
    lines.push(`${csh}% cash is temporarily elevated. Once your emergency fund reaches 3 months of expenses, shift the extra ${csh - base.cash}% to equity.`);
  } else {
    lines.push(`${csh}% cash ensures liquidity without meaningfully dragging down returns.`);
  }

  if (eq < base.equity) {
    lines.push(`Once your financial foundation stabilizes, gradually increase equity from ${eq}% toward the standard ${base.equity}% in 2–3% increments every 6 months.`);
  }

  return lines.join(" ");
};

// ── Rebalance timeline — only include steps with complete data
const buildRebalanceTimeline = (percentages, base, userMetrics) => {
  const {
    emergencyFundMonths = 0, monthlySavings  = 0,
    monthlyExpenses     = 0, debtToIncome    = 0
  } = userMetrics;

  const efStr  = fmtEF(emergencyFundMonths);
  const steps  = [];
  const hasEFData = monthlyExpenses > 0;
  const hasSavingsData = monthlySavings > 0;

  // Step 1: Emergency fund — only show if we have expense data
  if (+emergencyFundMonths < 3 && hasEFData) {
    const efTarget  = monthlyExpenses * 3;
    const efCurrent = +emergencyFundMonths * monthlyExpenses;
    const efGap     = Math.max(0, efTarget - efCurrent);
    const cashShift = percentages.cash - base.cash;

    let timeStr;
    if (hasSavingsData && monthlySavings > 0) {
      const months = Math.ceil(efGap / monthlySavings);
      timeStr = `~${months} month${months !== 1 ? "s" : ""} (saving ₹${Math.round(monthlySavings).toLocaleString()}/month)`;
    } else {
      timeStr = "start saving to build this fund";
    }

    steps.push({
      when:   `Now → ${timeStr}`,
      action: `Build emergency fund to ₹${Math.round(efTarget).toLocaleString()} (3 × ₹${Math.round(monthlyExpenses).toLocaleString()}/month expenses) — currently at ${efStr} months`,
      then:   cashShift > 0
        ? `Shift ${cashShift}% from cash (${percentages.cash}%) to equity (${percentages.equity}%)`
        : "Maintain current allocation"
    });
  }

  // Step 2: Debt reduction
  if (debtToIncome > 0.30) {
    steps.push({
      when:   "After emergency fund is stable",
      action: `Reduce debt-to-income from ${(debtToIncome * 100).toFixed(1)}% to below 20%`,
      then:   `Increase equity toward ${base.equity}% as debt reduces`
    });
  }

  // Step 3: Equity rebalance
  if (percentages.equity < base.equity) {
    steps.push({
      when:   "Once foundation is stable",
      action: `Increase equity from ${percentages.equity}% to ${base.equity}% in 2–3% increments`,
      then:   "Review every 6 months — do not rush this rebalance"
    });
  }

  // Always: maintenance
  steps.push({
    when:   "Every 6–12 months",
    action: "Check if any asset has drifted >5% from target",
    then:   "Sell over-allocated, buy under-allocated to restore balance"
  });

  return steps;
};

const personalizeAllocation = (baseProfile, userMetrics = {}) => {
  const base  = { ...BASE_ALLOCATION[baseProfile] };
  const alloc = { ...base };
  const { savingsRatio = 0, debtToIncome = 0, emergencyFundMonths = 0 } = userMetrics;
  const adjustments = [];

  if (+emergencyFundMonths < 3) {
    const shift = baseProfile === "Aggressive" ? 10 : 5;
    alloc.cash   = Math.min(35, alloc.cash + shift);
    alloc.equity = Math.max(10, alloc.equity - shift);
    adjustments.push(`EF: ${fmtEF(emergencyFundMonths)}mo < 3mo → cash +${shift}% (${base.cash}→${alloc.cash}%), equity -${shift}% (${base.equity}→${alloc.equity}%)`);
  }

  if (debtToIncome > 0.30) {
    alloc.debt   = Math.min(60, alloc.debt + 10);
    alloc.equity = Math.max(10, alloc.equity - 10);
    adjustments.push(`DTI: ${(debtToIncome * 100).toFixed(1)}% > 30% → debt +10% (${base.debt}→${alloc.debt}%), equity -10% (${base.equity}→${alloc.equity}%)`);
  }

  if (savingsRatio > 0.30 && debtToIncome <= 0.20 && baseProfile !== "Conservative") {
    alloc.equity = Math.min(80, alloc.equity + 5);
    alloc.cash   = Math.max(3, alloc.cash - 5);
    adjustments.push(`SR: ${(savingsRatio * 100).toFixed(1)}% > 30% → equity +5% (${base.equity}→${alloc.equity}%), cash -5% (${base.cash}→${alloc.cash}%)`);
  }

  const total = Object.values(alloc).reduce((a, b) => a + b, 0);
  const normalized = Object.fromEntries(
    Object.entries(alloc).map(([k, v]) => [k, Math.round((v / total) * 100)])
  );
  const drift = 100 - Object.values(normalized).reduce((a, b) => a + b, 0);
  if (drift !== 0) {
    const largest = Object.entries(normalized).sort((a, b) => b[1] - a[1])[0][0];
    normalized[largest] += drift;
  }

  return { normalized, base, adjustments };
};

const generatePortfolio = async (userId, riskProfile, investmentAmount, userMetrics = {}) => {
  if (!investmentAmount || isNaN(investmentAmount) || investmentAmount <= 0)
    throw new Error("Please enter a valid investment amount greater than ₹0.");
  if (!["Conservative", "Moderate", "Aggressive"].includes(riskProfile))
    throw new Error("Please select a valid risk profile: Conservative, Moderate, or Aggressive.");

  const { normalized: percentages, base, adjustments } = personalizeAllocation(riskProfile, userMetrics);
  const { weighted, low, high, range: expectedReturnRange } = calcWeightedReturn(percentages);
  const keyPoints        = buildKeyPoints(percentages, base, adjustments, userMetrics);
  const detail           = buildDetail(riskProfile, percentages, base, adjustments, userMetrics);
  const rebalanceTimeline = buildRebalanceTimeline(percentages, base, userMetrics);

  const recommendedAssets = Object.fromEntries(
    Object.entries(percentages).map(([asset, pct]) => [
      asset,
      parseFloat(((pct / 100) * investmentAmount).toFixed(2))
    ])
  );

  const portfolio = new Portfolio({
    userId, riskProfile, investmentAmount,
    recommendedAssets,
    explanation: detail
  });
  await portfolio.save();

  return {
    ...portfolio.toObject(),
    explanation:    detail,
    keyPoints,
    rebalanceTimeline,
    disclaimer:     RISK_DISCLAIMERS[riskProfile],
    profileContext: {
      tagline:            riskProfile === "Conservative" ? "Capital preservation with modest growth"
                        : riskProfile === "Moderate"     ? "Balanced growth with managed risk"
                        : "Maximum long-term wealth creation",
      expectedReturn:     expectedReturnRange,
      weightedReturn:     weighted,
      returnLow:          low,
      returnHigh:         high,
      riskLevel:          RISK_LEVELS[riskProfile],
      baseAllocation:     base,
      adjustedAllocation: percentages,
      wasPersonalized:    adjustments.length > 0
    },
    percentages
  };
};

const getPortfolioByUser = (userId) => Portfolio.findOne({ userId }).sort({ createdAt: -1 });

module.exports = { generatePortfolio, getPortfolioByUser };
