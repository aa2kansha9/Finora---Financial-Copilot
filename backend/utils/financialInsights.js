/**
 * generateInsights — priority-ordered financial guidance
 * Uses net savings (income − expenses − debt) and explicit emergency fund balance when provided.
 */
const generateInsights = ({ income, expenses, debt, investments, breakdown }) => {
  if (!breakdown || typeof breakdown !== "object") return [];

  const {
    savingsRatio = null,
    debtToIncome = null,
    investmentRatio = null,
    emergencyFundMonths = null,
    emergencyLabel = "Unknown",
    emergencyFundProvided = false,
    emergencyFundRupees = null,
    monthlyNetSavings,
    monthlySavings = 0,
    monthlyIncome = 0,
    monthlyDebtPayment = 0,
    monthlyExpenses = 0,
    spendingBuffer = null,
    spendingLabel = "Unknown",
    spendingRatio = null,
    spendingRatioDisplayLabel = null,
    spendingRatioLabel = "",
    biggestWeakness = null,
    biggestWeaknessDetail = null
  } = breakdown;

  const netSav = monthlyNetSavings != null ? monthlyNetSavings : monthlySavings;
  const insights = [];
  const hasIncome = monthlyIncome > 0;

  const srPct  = savingsRatio != null ? +((savingsRatio) * 100).toFixed(1) : null;
  const dtiPct = debtToIncome != null ? +((debtToIncome) * 100).toFixed(1) : null;
  const invPct = investmentRatio != null ? +((investmentRatio) * 100).toFixed(1) : null;
  const bufPct = spendingBuffer != null ? +((spendingBuffer) * 100).toFixed(1) : null;
  const sprPct = spendingRatio != null ? +((spendingRatio) * 100).toFixed(1) : null;
  const spendLabelForCopy = spendingRatioDisplayLabel || (sprPct != null ? `${sprPct}%` : null);

  if (breakdown.expensesFarExceedIncome && hasIncome && spendLabelForCopy) {
    insights.push(
      `Spending ratio ${spendLabelForCopy} of income (shown capped at >500% in the app if higher). ` +
      "Reduce monthly expenses below 70% of income if possible, or verify that expense amounts are monthly and not duplicated."
    );
  }

  const ef = emergencyFundMonths != null ? +emergencyFundMonths.toFixed(1) : null;
  const currentEfSaved = emergencyFundRupees != null ? emergencyFundRupees : 0;
  const efTarget3Months = (monthlyExpenses || 0) * 3;
  const efTarget6Months = (monthlyExpenses || 0) * 6;
  const monthsTo3mEF = netSav > 0 && emergencyFundProvided
    ? Math.ceil(Math.max(0, efTarget3Months - currentEfSaved) / netSav)
    : null;
  const monthsTo6mEF = netSav > 0 && emergencyFundProvided
    ? Math.ceil(Math.max(0, efTarget6Months - currentEfSaved) / netSav)
    : null;

  // ── PRIORITY 1: Emergency Fund
  if (!emergencyFundProvided) {
    insights.push(
      "Emergency fund: No balance on file. Add “Emergency Fund Balance (₹)” under My Financial Data — we do not estimate this from other entries."
    );
  } else if (monthlyExpenses <= 0) {
    insights.push(
      "Emergency fund balance is saved, but monthly expenses are ₹0 — cannot compute months of cover. Add expense data for a meaningful runway."
    );
  } else if (ef != null && ef < 1) {
    const timeStr = monthsTo3mEF != null
      ? `At your current net savings of ₹${Math.round(netSav).toLocaleString()}/month, you can reach 3 months in ${monthsTo3mEF} month${monthsTo3mEF !== 1 ? "s" : ""}.`
      : "Increase net savings (after expenses and debt) to build this fund.";
    insights.push(
      `🚨 Emergency Fund: ${ef} months (${emergencyLabel}). ` +
      `Target: 3 months of expenses (₹${Math.round(efTarget3Months).toLocaleString()}). ` +
      `Saved: ₹${Math.round(currentEfSaved).toLocaleString()}. ` +
      `Gap: ₹${Math.round(Math.max(0, efTarget3Months - currentEfSaved)).toLocaleString()}. ` +
      `${timeStr} ` +
      `Continue minimum debt payments; avoid extra debt paydown until this buffer is stronger.`
    );
  } else if (ef != null && ef < 3) {
    const timeStr = monthsTo3mEF != null && monthsTo3mEF > 0
      ? `About ${monthsTo3mEF} month${monthsTo3mEF !== 1 ? "s" : ""} to 3 months at current net savings.`
      : "Close to the 3-month target.";
    insights.push(
      `⚠️ Emergency Fund: ${ef} months (${emergencyLabel}). Target: 3 months. ${timeStr} ` +
      `Direct new net savings here before increasing investments.`
    );
  } else if (ef != null && ef < 6) {
    const timeStr = monthsTo6mEF != null && monthsTo6mEF > 0
      ? ` ~${monthsTo6mEF} more month${monthsTo6mEF !== 1 ? "s" : ""} to 6 months at current net savings.`
      : "";
    insights.push(
      `Emergency Fund: ${ef} months (${emergencyLabel}). You have reached the 3-month minimum; next milestone is 6 months of expenses.${timeStr}`
    );
  } else if (ef != null) {
    insights.push(
      `Emergency Fund: ${ef} months (${emergencyLabel}). Buffer looks adequate on paper — keep it liquid and review yearly.`
    );
  }

  // ── PRIORITY 2: Debt (needs income)
  if (hasIncome && dtiPct != null) {
    if (dtiPct > 50) {
      insights.push(
        `🚨 Debt-to-Income: ${dtiPct}% (safe limit: 20%). More than half your income goes to debt. ` +
        `Pay minimum EMIs; stop new borrowing; attack highest-interest debt first.`
      );
    } else if (dtiPct > 30) {
      const excess = Math.round((debtToIncome - 0.20) * monthlyIncome);
      insights.push(
        `⚠️ Debt-to-Income: ${dtiPct}% (safe limit: 20%). ~₹${excess.toLocaleString()}/month above the safe line. ` +
        `After a 3-month emergency fund, direct extra to debt before investing more.`
      );
    } else if (dtiPct > 20) {
      insights.push(
        `Debt-to-Income: ${dtiPct}% — above the 20% safe limit. Try to reduce by ₹${Math.round((debtToIncome - 0.20) * monthlyIncome).toLocaleString()}/month when possible.`
      );
    } else if (dtiPct > 0) {
      insights.push(`Debt-to-Income: ${dtiPct}% — within the under-20% guideline. Keep EMIs stable and avoid new high-interest debt.`);
    }
  } else if (!hasIncome && (monthlyDebtPayment || 0) > 0) {
    insights.push("You have debt payments but no income on file — add income to see debt-to-income.");
  }

  // ── PRIORITY 3: Net savings rate (after debt)
  if (hasIncome && srPct != null) {
    if (srPct < 5) {
      insights.push(
        `🚨 Net savings rate: ${srPct}% of income after expenses and debt (target: 20%). ` +
        `Net flow: ₹${Math.round(netSav).toLocaleString()}/mo. Review expenses and debt costs.`
      );
    } else if (srPct < 20) {
      const shortfall = Math.round((0.20 - savingsRatio) * monthlyIncome);
      insights.push(
        `Net savings rate: ${srPct}% (target: 20%). Increase net savings by ~₹${shortfall.toLocaleString()}/month.`
      );
    } else if (srPct < 30) {
      insights.push(`Net savings rate: ${srPct}% — above the 20% target. Consider directing part of the surplus to investments once your emergency fund plan is on track.`);
    } else {
      insights.push(`Net savings rate: ${srPct}% — high relative to income. Sustain this only if it matches your lifestyle goals; avoid burnout from over-frugality.`);
    }
  }

  // ── PRIORITY 4: Investments
  const foundationStable =
    emergencyFundProvided &&
    ef != null &&
    ef >= 3 &&
    (debtToIncome ?? 0) <= 0.30;

  if (hasIncome && invPct != null) {
    if (invPct === 0) {
      if (foundationStable) {
        insights.push(
          `Investments: 0%. Foundation looks stable — consider starting ~5% of income in diversified funds.`
        );
      } else {
        insights.push(
          `Investments: 0%. Build emergency fund (balance on file, 3+ months) and keep DTI ≤30% before increasing investments.`
        );
      }
    } else if (invPct < 10) {
      const gap = Math.round((0.10 - investmentRatio) * monthlyIncome);
      if (foundationStable) {
        insights.push(
          `Investments: ${invPct}% (common target 10%+). Increase by ~₹${gap.toLocaleString()}/month to reach 10% of income.`
        );
      } else {
        insights.push(
          `Investments: ${invPct}%. Stabilize emergency fund and debt first; keep current investments if any.`
        );
      }
    } else if (invPct < 20) {
      insights.push(`Investments: ${invPct}% of income — reasonable if emergency fund and debt are under control. Diversify and review fees annually.`);
    } else {
      insights.push(`Investments: ${invPct}% of income — aggressive allocation. Ensure your emergency fund stays at 3+ months and you are not over-leveraged elsewhere.`);
    }
  }

  // ── PRIORITY 5: Spending
  if (hasIncome && spendingRatio != null) {
    const spendLine = spendLabelForCopy || `${sprPct}%`;
    if (sprPct > 100 || (breakdown.spendingRatioOverDisplayCap)) {
      insights.push(
        `Overspending: expenses exceed income (${spendLine} of income, capped for display). ` +
        "Action: reduce expenses below 70% of income where realistic, or correct duplicate/lump-sum entries."
      );
    } else if (sprPct >= 90) {
      insights.push(
        `Overspending: ${spendLine} of income goes to expenses (${spendingRatioLabel || "Excessive"}). ` +
        "Action: cut discretionary spend first; target under 70% of income long term."
      );
    } else if (sprPct >= 80) {
      insights.push(
        `Spending ratio: ${spendLine} (${spendingRatioLabel || "High"}). Only ~${bufPct}% of income left after expenses — tighten budget toward under 70%.`
      );
    } else if (sprPct > 70) {
      insights.push(
        `Spending ratio: ${spendLine}. Target: reduce expenses below 70% of income to improve savings and emergency funding room.`
      );
    } else if (bufPct != null && bufPct < 10) {
      insights.push(
        `Spending buffer: ${bufPct}% after expenses (${spendingLabel}). Little room for surprises — hold a clear EF target (3+ months).`
      );
    } else if (bufPct != null && bufPct < 25) {
      insights.push(
        `Spending buffer: ${bufPct}% after expenses (${spendingLabel}). Aim for 25%+ headroom after fixing emergency fund gaps.`
      );
    }
  }

  if (biggestWeakness && biggestWeakness !== "None" && biggestWeaknessDetail) {
    let timeContext = "";
    if (biggestWeakness === "Emergency Fund" && monthsTo3mEF != null && emergencyFundProvided) {
      timeContext = monthsTo3mEF === 0
        ? " Almost at 3 months."
        : ` ~${monthsTo3mEF} month${monthsTo3mEF !== 1 ? "s" : ""} to 3 months at current net savings.`;
    } else if (biggestWeakness === "Savings Rate" && savingsRatio != null && savingsRatio < 0.20 && hasIncome) {
      timeContext = ` Need ~₹${Math.round((0.20 - savingsRatio) * monthlyIncome).toLocaleString()}/mo more net savings.`;
    } else if (biggestWeakness === "Overspending" && spendingRatio != null) {
      const targetExpenses = Math.round(monthlyIncome * 0.70);
      const currentExpenses = Math.round(spendingRatio * monthlyIncome);
      timeContext = ` Cut ~₹${Math.max(0, currentExpenses - targetExpenses).toLocaleString()}/mo to get under 70% spend.`;
    }
    insights.push(`📌 Priority: ${biggestWeakness} — ${biggestWeaknessDetail}${timeContext}`);
  }

  return insights;
};

module.exports = generateInsights;
