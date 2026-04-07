const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Debt = require("../models/Debt");
const Investment = require("../models/Investment");
const User = require("../models/User");
const calculateFinancialScore = require("../utils/financialScore");

async function getBaseFinancials(userId) {
  const [incomes, expenses, debts, investments, userDoc] = await Promise.all([
    Income.find({ userId }),
    Expense.find({ userId }),
    Debt.find({ userId }),
    Investment.find({ userId }),
    User.findById(userId).select("emergencyFundBalance")
  ]);

  const validIncomes = incomes.filter(i => {
    const d = new Date(i.date || i.createdAt);
    return !isNaN(d.getTime()) && d.getFullYear() >= 2000 && Number(i.amount) >= 0;
  });

  if (!validIncomes.length) return null;

  const incomeMonthKeys = new Set(
    validIncomes.map(i => {
      const d = new Date(i.date || i.createdAt);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );
  const monthsOfData = Math.max(1, incomeMonthKeys.size);
  const safe = (v) => Math.max(0, Number(v) || 0);

  const totalIncome      = validIncomes.reduce((a, i) => a + safe(i.amount), 0);
  const totalExpenses    = expenses.reduce((a, e) => a + safe(e.amount), 0);
  const totalInvestments = investments.reduce((a, i) => a + safe(i.amount), 0);
  const monthlyDebtPmt   = debts.reduce((a, d) => a + safe(d.monthlyPayment), 0);
  const totalDebt        = debts.reduce((a, d) => a + safe(d.totalDebt), 0);

  const monthlyIncome      = totalIncome / monthsOfData;
  const monthlyExpenses    = totalExpenses / monthsOfData;
  const monthlyInvestments = totalInvestments / monthsOfData;

  return {
    monthlyIncome,
    monthlyExpenses,
    monthlyInvestments,
    monthlyDebtPmt,
    totalDebt,
    monthsOfData,
    emergencyFundBalance: userDoc?.emergencyFundBalance
  };
}

router.post("/", protect, async (req, res) => {
  try {
    const base = await getBaseFinancials(req.user);
    if (!base) return res.status(400).json({ message: "Add income data with valid dates first to use the simulator." });

    const safe = (v) => Math.max(0, Number(v) || 0);
    const extraMonthlySavings = safe(req.body.extraMonthlySavings);
    const salaryIncrease      = safe(req.body.salaryIncrease);
    const extraDebtPayment    = safe(req.body.extraDebtPayment);
    const extraInvestment     = safe(req.body.extraInvestment);

    // ── Fix 1: Block extra debt payment when user has no existing debt
    if (extraDebtPayment > 0 && base.totalDebt === 0 && base.monthlyDebtPmt === 0) {
      return res.status(400).json({ message: "You have no existing debt recorded. Add debt entries before simulating extra debt payments." });
    }

    // ── Current score from real stored data
    const current = calculateFinancialScore({
      monthlyIncome:      base.monthlyIncome,
      monthlyExpenses:    base.monthlyExpenses,
      monthlyDebtPayment: base.monthlyDebtPmt,
      monthlyInvestments: base.monthlyInvestments,
      emergencyFundBalance: base.emergencyFundBalance
    });

    // ── Simulated values — clone base and apply deltas
    const simIncome      = base.monthlyIncome + salaryIncrease;
    const simExpenses    = Math.max(0, base.monthlyExpenses - extraMonthlySavings);
    const simDebtPmt     = base.monthlyDebtPmt + extraDebtPayment;
    const simInvestments = base.monthlyInvestments + extraInvestment;

    // ── Fix 4: Correct cash flow — income minus ALL outflows including investments
    const simCashFlow = simIncome - simExpenses - simDebtPmt - simInvestments;

    // Guard: total outflow cannot exceed income
    if (simCashFlow < 0) {
      return res.status(400).json({
        message: `These changes require ₹${Math.round(simIncome - simCashFlow).toLocaleString()}/month but your simulated income is ₹${Math.round(simIncome).toLocaleString()}/month. Reduce the amounts.`
      });
    }

    const simulated = calculateFinancialScore({
      monthlyIncome:      simIncome,
      monthlyExpenses:    simExpenses,
      monthlyDebtPayment: simDebtPmt,
      monthlyInvestments: simInvestments,
      emergencyFundBalance: base.emergencyFundBalance
    });

    const scoreDiff = simulated.score - current.score;

    const cb = current.breakdown;
    const sb = simulated.breakdown;
    const efDataKnown = cb.emergencyFundProvided === true && cb.emergencyFundMonths != null;
    const currentEF = efDataKnown ? cb.emergencyFundMonths : null;
    const currentEFRupees =
      cb.emergencyFundProvided && cb.emergencyFundRupees != null ? cb.emergencyFundRupees : null;
    const simulatedEFRupees =
      sb.emergencyFundProvided && sb.emergencyFundRupees != null ? sb.emergencyFundRupees : null;

    // ── 12-month projections (cash flow already computed correctly above)
    const projectedSavings12m = Math.max(0, simCashFlow * 12);
    const debtFreeMonths = simDebtPmt > 0 && base.totalDebt > 0
      ? Math.ceil(base.totalDebt / simDebtPmt)
      : null;

    // ── EF gates only when user provided a balance (never treat "no data" as 0 months)
    const warnings = [];
    const efTarget3mo = Math.round(base.monthlyExpenses * 3);
    const efCurrentRs = efDataKnown && currentEFRupees != null ? Math.round(currentEFRupees) : (efDataKnown ? Math.round(currentEF * base.monthlyExpenses) : 0);
    const efGap = efDataKnown ? Math.max(0, efTarget3mo - efCurrentRs) : 0;

    if (efDataKnown && currentEF < 1) {
      if (extraInvestment > 0) {
        return res.status(400).json({
          message: `Your emergency fund is critically low (${currentEF.toFixed(1)} months, ₹${efCurrentRs.toLocaleString()} saved). You need ₹${efGap.toLocaleString()} more to reach 3 months. Redirect investments to your emergency fund first before simulating investment increases.`
        });
      }
      if (extraDebtPayment > 0) {
        return res.status(400).json({
          message: `Your emergency fund is critically low (${currentEF.toFixed(1)} months). Build it to at least 1 month before making extra debt payments. Every spare rupee should go to your emergency fund right now.`
        });
      }
    } else if (efDataKnown && currentEF < 3) {
      if (extraInvestment > 0) {
        warnings.push(`⚠️ Your emergency fund is only ${currentEF.toFixed(1)} months (₹${efCurrentRs.toLocaleString()}). You need ₹${efGap.toLocaleString()} more to reach the 3-month minimum. Consider splitting ₹${extraInvestment.toLocaleString()}/month between investments and your emergency fund.`);
      }
    }

    // ── Helpers
    const signedPct = (diff) => `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
    const pctStr    = (v) => `${(v * 100).toFixed(1)}%`;

    // ── Per-input explanations (what changed and why) — one line per input, no overlap
    const explanations = [];

    if (extraMonthlySavings > 0) {
      const savDiff  = (sb.savingsRatio  - cb.savingsRatio)  * 100;
      const spenDiff = (sb.spendingRatio - cb.spendingRatio) * 100;
      explanations.push(
        savDiff > 0.05
          ? `Spending cut ₹${extraMonthlySavings.toLocaleString()}/mo → savings rate ${pctStr(cb.savingsRatio)} → ${pctStr(sb.savingsRatio)} (${signedPct(savDiff)}), spending ratio ${pctStr(cb.spendingRatio)} → ${pctStr(sb.spendingRatio)} (${signedPct(spenDiff)}).`
          : `Spending cut ₹${extraMonthlySavings.toLocaleString()}/mo — savings rate barely moves (already near ceiling at ${pctStr(cb.savingsRatio)}).`
      );
    }

    if (salaryIncrease > 0) {
      const savDiff = (sb.savingsRatio - cb.savingsRatio) * 100;
      const dtiDiff = (sb.debtToIncome - cb.debtToIncome) * 100; // negative = good
      const invDiff = (sb.investmentRatio - cb.investmentRatio) * 100;
      // Only report ratio side-effects that are meaningful AND frame them correctly
      const sideEffects = [];
      if (dtiDiff < -0.05) sideEffects.push(`DTI improves ${signedPct(dtiDiff)} (income grew, debt unchanged)`);
      if (dtiDiff >  0.05) sideEffects.push(`DTI worsens ${signedPct(dtiDiff)}`);
      if (Math.abs(invDiff) > 0.05) sideEffects.push(`investment ratio ${signedPct(invDiff)} (income base grew)`);
      explanations.push(
        `Salary +₹${salaryIncrease.toLocaleString()}/mo → income ₹${Math.round(simIncome).toLocaleString()}/mo. ` +
        `Savings rate: ${pctStr(cb.savingsRatio)} → ${pctStr(sb.savingsRatio)} (${signedPct(savDiff)}).` +
        (sideEffects.length ? ` Also: ${sideEffects.join("; ")}.` : "")
      );
    }

    if (extraDebtPayment > 0) {
      const dtiDiff = (sb.debtToIncome - cb.debtToIncome) * 100;
      const direction = dtiDiff < -0.05 ? `improves by ${Math.abs(dtiDiff).toFixed(1)}%`
                      : dtiDiff >  0.05 ? `worsens by ${dtiDiff.toFixed(1)}%`
                      : "unchanged (debt already low)";
      const debtLine = debtFreeMonths ? ` Debt-free in ~${debtFreeMonths} months.` : "";
      explanations.push(`Extra debt payment ₹${extraDebtPayment.toLocaleString()}/mo: DTI ${pctStr(cb.debtToIncome)} → ${pctStr(sb.debtToIncome)} (${direction}).${debtLine}`);
    }

    if (extraInvestment > 0) {
      const invRatioDiff  = (sb.investmentRatio - cb.investmentRatio) * 100;
      const absInvCurrent = Math.round(base.monthlyInvestments);
      const absInvSim     = Math.round(simInvestments);
      explanations.push(
        Math.abs(invRatioDiff) < 0.1
          ? `Investments ₹${absInvCurrent.toLocaleString()} → ₹${absInvSim.toLocaleString()}/mo (+₹${extraInvestment.toLocaleString()}). Ratio stays ~${pctStr(sb.investmentRatio)} — income also grew, so percentage is flat but absolute amount increases.`
          : `Investments ₹${absInvCurrent.toLocaleString()} → ₹${absInvSim.toLocaleString()}/mo. Ratio: ${pctStr(cb.investmentRatio)} → ${pctStr(sb.investmentRatio)} (${signedPct(invRatioDiff)}).`
      );
    }

    if (explanations.length === 0) {
      explanations.push("No changes applied. Enter at least one value above zero to simulate.");
    }

    // ── Score component breakdown — separate from input explanations, only show moved components
    const normCurrent = cb.normalizedScores || {};
    const normSim     = sb.normalizedScores || {};
    const scoreBreakdown = [
      { label: "Emergency Fund", weight: 25, key: "emergencyFund" },
      { label: "Savings",        weight: 25, key: "savings"       },
      { label: "Debt",           weight: 20, key: "debt"          },
      { label: "Investments",    weight: 15, key: "investment"    },
      { label: "Spending",       weight: 15, key: "spending"      }
    ]
    .map(c => ({ ...c, diff: (normSim[c.key] ?? 0) - (normCurrent[c.key] ?? 0) }))
    .filter(c => Math.abs(c.diff) >= 1)
    .map(c => ({
      label:      c.label,
      pointsDiff: +((c.diff * c.weight) / 100).toFixed(1),
      weight:     c.weight
    }));

    // ── Surplus opportunity — unallocated cash after all committed outflows
    const surplusInsight = (() => {
      if (simCashFlow <= 0) return null;
      const simEFKnown = sb.emergencyFundProvided === true && sb.emergencyFundMonths != null;
      const simEF    = simEFKnown ? sb.emergencyFundMonths : null;
      const simDTI   = sb.debtToIncome       ?? 0;
      const simInvR  = sb.investmentRatio     ?? 0;
      if (simEFKnown && simEF < 3) {
        const efGapRs = Math.max(0, simExpenses * 3 - simEF * simExpenses);
        const moToEF  = efGapRs > 0 ? Math.ceil(efGapRs / simCashFlow) : 0;
        return `You have ₹${Math.round(simCashFlow).toLocaleString()}/mo of unallocated cash. Priority: direct it to your emergency fund (gap ₹${Math.round(efGapRs).toLocaleString()} — funded in ~${moToEF} month${moToEF !== 1 ? "s" : ""}).`;
      }
      if (simDTI > 0.20) {
        return `You have ₹${Math.round(simCashFlow).toLocaleString()}/mo of unallocated cash. Your DTI is still above 20% — consider directing this surplus to accelerate debt repayment.`;
      }
      if (simInvR < 0.10) {
        const invNeeded = Math.round((0.10 - simInvR) * simIncome);
        return `You have ₹${Math.round(simCashFlow).toLocaleString()}/mo of unallocated cash. Your investment rate is below 10% — allocating ₹${invNeeded.toLocaleString()}/mo more would reach the target.`;
      }
      if (!simEFKnown) {
        return `You have ₹${Math.round(simCashFlow).toLocaleString()}/mo of unallocated cash. Add your emergency fund balance under My Financial Data for months-covered guidance; until then, keep extra cash liquid or align with your goals.`;
      }
      return `You have ₹${Math.round(simCashFlow).toLocaleString()}/mo of unallocated cash. Your foundation is strong — consider diversifying into equity, debt funds, or gold.`;
    })();

    // ── Forward-looking strategy — only when simulated score is strong
    const postWeakness = simulated.biggestWeakness !== "None" ? simulated.biggestWeakness : null;
    const strategy = (() => {
      if (simulated.score >= 70 && !postWeakness) {
        return "Your financial foundation is strong after these changes. Next step: focus on wealth-building — increase SIP contributions, diversify across equity/debt/gold, and review your investment allocation annually.";
      }
      if (simulated.score >= 70 && postWeakness) {
        return `Score reaches ${simulated.score} (${simulated.status}) — solid foundation. One remaining gap: ${postWeakness}. Address that to push toward Excellent.`;
      }
      if (scoreDiff > 0 && postWeakness) {
        return `Good progress. Your next highest-impact action is addressing "${postWeakness}" — that component carries the most remaining scoring weight.`;
      }
      if (scoreDiff === 0) {
        return `These changes don't move the score because they don't address "${current.biggestWeakness}" — the component with the most weight in your current profile. Simulate changes that directly target it.`;
      }
      return null;
    })();

    // ── Verdict
    const verdict = scoreDiff > 15
      ? `🚀 Major improvement: +${scoreDiff} points — ${current.status} → ${simulated.status}.`
      : scoreDiff > 5
      ? `✅ Good improvement: +${scoreDiff} points.`
      : scoreDiff > 0
      ? `📈 Small improvement: +${scoreDiff} points.`
      : scoreDiff < 0
      ? `⚠️ Score drops by ${Math.abs(scoreDiff)} points — these changes worsen your financial position.`
      : `➡️ No score change — inputs don't target "${current.biggestWeakness}", the highest-weight weakness.`;

    res.json({
      current:   scoreSnapshot(current, currentEFRupees),
      simulated: scoreSnapshot(simulated, simulatedEFRupees),
      scoreDiff,
      verdict,
      warnings,
      explanations,
      scoreBreakdown,
      surplusInsight,
      strategy,
      postWeakness,
      projections: {
        monthlyCashFlow:          +simCashFlow.toFixed(2),
        projectedSavings12Months: +projectedSavings12m.toFixed(2),
        debtFreeInMonths:         debtFreeMonths
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function scoreSnapshot(s, efRupeesFallback) {
  const b = s.breakdown || {};
  const efProv = b.emergencyFundProvided === true;
  const months = efProv && b.emergencyFundMonths != null ? +Number(b.emergencyFundMonths).toFixed(2) : null;
  const rupees = efProv ? (efRupeesFallback != null ? efRupeesFallback : b.emergencyFundRupees ?? null) : null;
  return {
    score:           s.score,
    status:          s.status,
    biggestWeakness: s.biggestWeakness,
    metrics: {
      savingsRatio:            +(b.savingsRatio        ?? 0).toFixed(4),
      debtToIncome:            +(b.debtToIncome        ?? 0).toFixed(4),
      emergencyFundMonths:     months,
      emergencyFundRupees:     rupees,
      emergencyFundProvided:   efProv,
      investmentRatio:         +(b.investmentRatio     ?? 0).toFixed(4)
    }
  };
}

module.exports = router;
