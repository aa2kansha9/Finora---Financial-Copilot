/**
 * calculateFinancialScore — SINGLE SOURCE OF TRUTH
 *
 * Net Savings = Income − Expenses − Debt Payments (can be negative)
 * Free Cash   = Net Savings − Investments (monthly, can be negative)
 *
 * Emergency fund months = User-provided balance ÷ monthly expenses only (never inferred from “savings”).
 * savingsRatio = Net Savings ÷ Income (when income > 0)
 *
 * Debt score (DTI = debt ÷ income): 0–10% → 90–100, 10–20% → 70–89, 20–35% → 40–69, >35% → 0–39
 * Investment score: 0% → 0; (0,10%] → 30–50; (10%,20%] → 50–75; >20% → 75–100
 *
 * Component weights (total 100%): Emergency 25, Savings 25, Debt 20, Investment 15, Spending 15
 */

/** Display cap for spending ratio (expenses ÷ income) to avoid absurd UI like 20000% */
const SPENDING_RATIO_DISPLAY_CAP = 5;

const SCORE_WEIGHTS = {
  emergencyFund: 25,
  savings: 25,
  debt: 20,
  investment: 15,
  spending: 15
};

const normDebtFromDti = (dti) => {
  if (dti <= 0) return 100;
  if (dti <= 0.10) return 100 - (dti / 0.10) * 10;
  if (dti <= 0.20) return 90 - ((dti - 0.10) / 0.10) * 35;
  if (dti <= 0.35) return 55 - ((dti - 0.20) / 0.15) * 25;
  if (dti <= 1) return 30 - ((dti - 0.35) / 0.65) * 30;
  return 0;
};

const normInvestmentFromRatio = (invRatio) => {
  if (invRatio <= 0) return 0;
  if (invRatio <= 0.10) return 30 + (invRatio / 0.10) * 20;
  if (invRatio <= 0.20) return 50 + ((invRatio - 0.10) / 0.10) * 25;
  if (invRatio <= 0.35) return 75 + ((invRatio - 0.20) / 0.15) * 15;
  if (invRatio <= 0.60) return 90 - ((invRatio - 0.35) / 0.25) * 20;
  if (invRatio <= 0.80) return 70 - ((invRatio - 0.60) / 0.20) * 20;
  return 30;
};

const normSavingsFromRatio = (savingsRatio) => {
  const sr = savingsRatio;
  if (sr < 0) return 0;
  return sr >= 0.40 ? 100
    : sr >= 0.30 ? 83 + ((sr - 0.30) / 0.10) * 17
    : sr >= 0.20 ? 67 + ((sr - 0.20) / 0.10) * 16
    : sr >= 0.10 ? 33 + ((sr - 0.10) / 0.10) * 34
    : sr >= 0.05 ? 17 + ((sr - 0.05) / 0.05) * 16
    : (sr / 0.05) * 17;
};

const normSpendingFromRatio = (spendingRatio) => {
  const sr = Math.min(spendingRatio, 10);
  if (sr <= 0) return 35;
  if (sr <= 0.05) return 35 + (sr / 0.05) * 10;
  if (sr <= 0.20) return 45 + ((sr - 0.05) / 0.15) * 20;
  if (sr <= 0.50) return 65 + ((sr - 0.20) / 0.30) * 30;
  if (sr <= 0.70) return 95 - ((sr - 0.50) / 0.20) * 25;
  if (sr <= 0.85) return 70 - ((sr - 0.70) / 0.15) * 30;
  if (sr <= 1.0) return 40 - ((sr - 0.85) / 0.15) * 30;
  return 0;
};

function buildBehavioralValidation({ income, expenses, debtPmt, investments, spendingRatio, savingsRatio, investmentRatio }) {
  const flags = [];
  const warnings = [];

  if (income > 0 && expenses === 0) {
    flags.push("ZERO_EXPENSES_WITH_INCOME");
    warnings.push("Expenses are entered as Rs.0 despite non-zero income. This is usually unrealistic and may inflate the score.");
  }
  if (income > 0 && spendingRatio <= 0) {
    flags.push("ZERO_SPENDING_RATIO");
    warnings.push("Spending ratio is 0%. Real-world households usually have baseline living costs.");
  }
  if (income > 0 && investmentRatio >= 1) {
    flags.push("INVESTMENT_AT_OR_ABOVE_100_PCT");
    warnings.push("Investment rate is 100% or higher of income, which is not financially sustainable for most households.");
  } else if (income > 0 && investmentRatio >= 0.8) {
    flags.push("EXTREME_INVESTMENT_RATE");
    warnings.push("Investment rate is above 80% of income. This is treated as suspicious and not rewarded fully.");
  }
  if (income > 0 && savingsRatio > 0.90) {
    flags.push("EXTREME_SAVINGS_RATE");
    warnings.push("Net savings rate is above 90%, which may indicate missing expenses or incorrect data periods.");
  }
  if (income > 0 && (expenses + debtPmt + investments) === 0) {
    flags.push("NO_OUTFLOWS_WITH_INCOME");
    warnings.push("No monthly outflows are recorded against non-zero income; score is penalized until data looks realistic.");
  }

  const penalty =
    (flags.includes("INVESTMENT_AT_OR_ABOVE_100_PCT") ? 20 : 0) +
    (flags.includes("EXTREME_INVESTMENT_RATE") ? 12 : 0) +
    (flags.includes("ZERO_EXPENSES_WITH_INCOME") ? 12 : 0) +
    (flags.includes("ZERO_SPENDING_RATIO") ? 8 : 0) +
    (flags.includes("EXTREME_SAVINGS_RATE") ? 8 : 0) +
    (flags.includes("NO_OUTFLOWS_WITH_INCOME") ? 10 : 0);

  return {
    flags,
    warnings,
    suspicious: flags.length > 0,
    penalty: Math.min(35, penalty)
  };
}

function spendingRatioDisplayFields(spendingRatio) {
  const raw = +spendingRatio;
  if (!Number.isFinite(raw)) {
    return {
      spendingRatioDisplayLabel: "—",
      spendingRatioDisplayPercent: null,
      spendingRatioOverDisplayCap: false,
      expensesFarExceedIncome: false,
      extremeSpendingWarning: null
    };
  }
  const pct = raw * 100;
  const overCap = raw > SPENDING_RATIO_DISPLAY_CAP;
  const label = overCap ? ">500%" : `${pct >= 100 ? pct.toFixed(0) : pct.toFixed(1)}%`;
  const expensesFarExceedIncome = raw > 1;
  return {
    spendingRatioDisplayLabel: label,
    spendingRatioDisplayPercent: overCap ? SPENDING_RATIO_DISPLAY_CAP * 100 : +pct.toFixed(1),
    spendingRatioOverDisplayCap: overCap,
    expensesFarExceedIncome,
    extremeSpendingWarning: expensesFarExceedIncome
      ? "Expenses far exceed income — data may be unrealistic. Check amounts and periods (monthly vs one-off)."
      : null
  };
}

const normEmergencyFromMonths = (months) => {
  if (months == null || Number.isNaN(months)) return 0;
  const m = +months;
  if (m <= 0) return 0;
  if (m < 1) return (m / 1) * 20;
  if (m < 3) return 20 + ((m - 1) / 2) * 30;
  if (m < 4) return 50 + ((m - 3) / 1) * 20;
  if (m < 6) return 70 + ((m - 4) / 2) * 20;
  return Math.min(100, 90 + ((m - 6) / 6) * 10);
};

const calculateFinancialScore = ({
  monthlyIncome,
  monthlyExpenses,
  monthlyDebtPayment = 0,
  monthlyInvestments = 0,
  emergencyFundBalance = null
}) => {
  const income = +monthlyIncome || 0;
  const expenses = Math.max(0, +monthlyExpenses || 0);
  const debtPmt = Math.max(0, +monthlyDebtPayment || 0);
  const investments = Math.max(0, +monthlyInvestments || 0);

  const efBalRaw = emergencyFundBalance;
  const emergencyFundProvided =
    efBalRaw != null && efBalRaw !== "" && !Number.isNaN(Number(efBalRaw)) && Number(efBalRaw) >= 0;
  const emergencyFundRupees = emergencyFundProvided ? Math.max(0, Number(efBalRaw)) : null;

  const monthlyNetSavings = income - expenses - debtPmt;
  const monthlyFreeCash = monthlyNetSavings - investments;

  let emergencyFundMonths = null;
  if (emergencyFundProvided && expenses > 0) {
    emergencyFundMonths = Math.min(24, emergencyFundRupees / expenses);
  }

  const incomeZeroWarning = income === 0;
  const incomeZeroMessage = "Income is zero — financial metrics may not be meaningful.";

  if (income <= 0) {
    const normEmergency = normEmergencyFromMonths(emergencyFundMonths);
    let normDebt = debtPmt <= 0 ? 100 : 0;
    const norm = {
      savings: 0,
      debt: +normDebt.toFixed(1),
      emergencyFund: +normEmergency.toFixed(1),
      investment: 0,
      spending: expenses > 0 ? 0 : 50
    };
    const weights = SCORE_WEIGHTS;
    let score = Object.keys(weights).reduce((sum, key) => sum + (norm[key] * weights[key]) / 100, 0);
    score = Math.round(Math.max(0, Math.min(100, score)));

    const status =
      score < 30 ? "At Risk" :
      score < 50 ? "Poor" :
      score < 70 ? "Moderate" :
      score < 85 ? "Good" :
      "Excellent";

    return {
      score,
      status,
      biggestWeakness: "Income",
      biggestWeaknessDetail: incomeZeroMessage,
      breakdown: {
        monthlyIncome: +income.toFixed(2),
        monthlyExpenses: +expenses.toFixed(2),
        monthlyDebtPayment: +debtPmt.toFixed(2),
        monthlyInvestments: +investments.toFixed(2),
        monthlyNetSavings: +monthlyNetSavings.toFixed(2),
        monthlyFreeCash: +monthlyFreeCash.toFixed(2),
        monthlySavings: +monthlyNetSavings.toFixed(2),
        savingsRatio: null,
        spendingRatio: null,
        spendingRatioLabel: expenses > 0 ? "N/A" : "—",
        debtToIncome: null,
        investmentRatio: null,
        emergencyFundMonths: emergencyFundMonths != null ? +emergencyFundMonths.toFixed(2) : null,
        emergencyFundRupees,
        emergencyFundProvided,
        emergencyLabel: !emergencyFundProvided ? "No data" : emergencyFundMonths != null ? (
          emergencyFundMonths < 1 ? "Critical" :
          emergencyFundMonths < 3 ? "At Risk" :
          emergencyFundMonths < 4 ? "Moderate" :
          emergencyFundMonths < 6 ? "Safe" : "Strong"
        ) : "No data",
        spendingBuffer: null,
        spendingLabel: "Unknown",
        spendingRatioDisplayLabel: "—",
        spendingRatioDisplayPercent: null,
        spendingRatioOverDisplayCap: false,
        expensesFarExceedIncome: false,
        extremeSpendingWarning: null,
        incomeZeroWarning: true,
        incomeZeroMessage,
        behavioralFlags: [],
        behavioralWarnings: [],
        suspiciousDataDetected: false,
        suspiciousDataPenalty: 0,
        normalizedScores: norm,
        scoreWeights: { ...SCORE_WEIGHTS }
      }
    };
  }

  const savingsRatio = monthlyNetSavings / income;
  const spendingRatio = expenses / income;
  const spendDisplay = spendingRatioDisplayFields(spendingRatio);
  const debtToIncome = Math.min(1, debtPmt / income);
  const investmentRatio = Math.min(1, investments / income);
  const spendingBuffer = Math.max(0, (income - expenses) / income);
  const behavioralValidation = buildBehavioralValidation({
    income,
    expenses,
    debtPmt,
    investments,
    spendingRatio,
    savingsRatio,
    investmentRatio
  });

  const normSavings = normSavingsFromRatio(savingsRatio);
  const normDebt = normDebtFromDti(debtToIncome);
  const normEmergency = normEmergencyFromMonths(emergencyFundMonths);
  const normInvestment = normInvestmentFromRatio(investmentRatio);
  const normSpending = normSpendingFromRatio(spendingRatio);

  const norm = {
    savings: +normSavings.toFixed(1),
    debt: +normDebt.toFixed(1),
    emergencyFund: +normEmergency.toFixed(1),
    investment: +normInvestment.toFixed(1),
    spending: +normSpending.toFixed(1)
  };

  const weights = SCORE_WEIGHTS;

  let score = Object.keys(weights).reduce(
    (sum, key) => sum + (norm[key] * weights[key]) / 100,
    0
  );

  const isOverspending = spendingRatio >= 0.90;
  const hasCriticalIssue =
    (emergencyFundProvided && emergencyFundMonths != null && emergencyFundMonths < 1) ||
    savingsRatio < 0.05 ||
    debtToIncome > 0.50 ||
    isOverspending;
  const hasModerateIssue =
    (emergencyFundProvided && emergencyFundMonths != null && emergencyFundMonths < 3) ||
    savingsRatio < 0.10 ||
    debtToIncome > 0.30 ||
    spendingRatio > 0.80;

  if (hasCriticalIssue) score = Math.min(score, 55);
  else if (hasModerateIssue) score = Math.min(score, 74);

  if (behavioralValidation.suspicious) {
    score = Math.min(score, 88);
    score -= behavioralValidation.penalty;
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  const status =
    score < 30 ? "At Risk" :
    score < 50 ? "Poor" :
    score < 70 ? "Moderate" :
    score < 85 ? "Good" :
    "Excellent";

  const emergencyLabel = !emergencyFundProvided
    ? "No data"
    : emergencyFundMonths == null
    ? "No data"
    : emergencyFundMonths < 1 ? "Critical" :
      emergencyFundMonths < 3 ? "At Risk" :
      emergencyFundMonths < 4 ? "Moderate" :
      emergencyFundMonths < 6 ? "Safe" : "Strong";

  const spendingRatioLabel =
    spendingRatio >= 0.95 ? "Excessive" :
    spendingRatio >= 0.70 ? "High" :
    spendingRatio >= 0.60 ? "Elevated" :
    spendingRatio >= 0.40 ? "Healthy" : "Low";

  const spendingLabel =
    spendingBuffer < 0.10 ? "Very Tight" :
    spendingBuffer < 0.25 ? "Moderate" :
    spendingBuffer < 0.40 ? "Healthy" : "Strong";

  let biggestWeakness = null;
  let biggestWeaknessDetail = null;

  if (!emergencyFundProvided) {
    biggestWeakness = "Emergency Fund";
    biggestWeaknessDetail =
      "No emergency fund balance on file. Add “Emergency Fund Balance (₹)” under My Financial Data to see months covered and accurate safety metrics.";
  } else if (emergencyFundMonths != null && emergencyFundMonths < 3) {
    biggestWeakness = "Emergency Fund";
    biggestWeaknessDetail = `${emergencyFundMonths.toFixed(1)} months saved vs 3 months recommended (${emergencyLabel}). ` +
      "Build this before increasing investments or extra debt payments.";
  } else if (debtToIncome > 0.30) {
    biggestWeakness = "Debt Burden";
    biggestWeaknessDetail = `${(debtToIncome * 100).toFixed(1)}% of income goes to debt vs 20% safe limit. ` +
      "High debt limits your ability to save and invest.";
  } else if (spendingRatio >= 0.70) {
    biggestWeakness = "Overspending";
    biggestWeaknessDetail = `${spendDisplay.spendingRatioDisplayLabel} of income goes to expenses (${spendingRatioLabel}). ` +
      "Aim to bring expenses below 70% of income so savings and buffers are sustainable.";
  } else if (behavioralValidation.suspicious) {
    biggestWeakness = "Data Quality";
    biggestWeaknessDetail = "Some entries appear unrealistic or inconsistent. Score has been reduced until the data reflects a practical monthly budget.";
  } else if (savingsRatio < 0.20) {
    biggestWeakness = "Savings Rate";
    biggestWeaknessDetail = `${(savingsRatio * 100).toFixed(1)}% net savings rate (after debt) vs 20% recommended. ` +
      "Increase net savings before focusing on investments.";
  } else if (investmentRatio < 0.10) {
    biggestWeakness = "Investments";
    biggestWeaknessDetail = `${(investmentRatio * 100).toFixed(1)}% investment rate vs 10% recommended. ` +
      "Your financial foundation is stable — now grow your wealth.";
  } else {
    biggestWeakness = "None";
    biggestWeaknessDetail = "All core metrics are in good shape. Focus on optimizing and diversifying.";
  }

  return {
    score,
    status,
    biggestWeakness,
    biggestWeaknessDetail,
    breakdown: {
      monthlyIncome: +income.toFixed(2),
      monthlyExpenses: +expenses.toFixed(2),
      monthlyDebtPayment: +debtPmt.toFixed(2),
      monthlyInvestments: +investments.toFixed(2),
      monthlyNetSavings: +monthlyNetSavings.toFixed(2),
      monthlyFreeCash: +monthlyFreeCash.toFixed(2),
      monthlySavings: +monthlyNetSavings.toFixed(2),
      savingsRatio: +savingsRatio.toFixed(4),
      spendingRatio: +spendingRatio.toFixed(4),
      spendingRatioDisplayLabel: spendDisplay.spendingRatioDisplayLabel,
      spendingRatioDisplayPercent: spendDisplay.spendingRatioDisplayPercent,
      spendingRatioOverDisplayCap: spendDisplay.spendingRatioOverDisplayCap,
      expensesFarExceedIncome: spendDisplay.expensesFarExceedIncome,
      extremeSpendingWarning: spendDisplay.extremeSpendingWarning,
      spendingRatioLabel,
      debtToIncome: +debtToIncome.toFixed(4),
      investmentRatio: +investmentRatio.toFixed(4),
      emergencyFundMonths: emergencyFundMonths != null ? +emergencyFundMonths.toFixed(2) : null,
      emergencyFundRupees,
      emergencyFundProvided,
      emergencyLabel,
      spendingBuffer: +spendingBuffer.toFixed(4),
      spendingLabel,
      incomeZeroWarning: false,
      incomeZeroMessage: null,
      behavioralFlags: behavioralValidation.flags,
      behavioralWarnings: behavioralValidation.warnings,
      suspiciousDataDetected: behavioralValidation.suspicious,
      suspiciousDataPenalty: behavioralValidation.penalty,
      normalizedScores: norm,
      scoreWeights: { ...SCORE_WEIGHTS }
    }
  };
};

calculateFinancialScore.SCORE_WEIGHTS = SCORE_WEIGHTS;
calculateFinancialScore.SPENDING_RATIO_DISPLAY_CAP = SPENDING_RATIO_DISPLAY_CAP;
module.exports = calculateFinancialScore;
