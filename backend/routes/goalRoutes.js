const express = require("express");
const router  = express.Router();
const protect = require("../middleware/authMiddleware");
const Goal    = require("../models/Goal");
const Income  = require("../models/Income");
const Expense = require("../models/Expense");
const Debt    = require("../models/Debt");
const User    = require("../models/User");
const calculateFinancialScore = require("../utils/financialScore");

const getMonthlyFinancials = async (userId) => {
  const [incomes, expensesArr, debtsArr, userDoc] = await Promise.all([
    Income.find({ userId }),
    Expense.find({ userId }),
    Debt.find({ userId }),
    User.findById(userId).select("emergencyFundBalance")
  ]);

  const totalIncome   = incomes.reduce((a, i) => a + Math.max(0, Number(i.amount) || 0), 0);
  const totalExpenses = expensesArr.reduce((a, e) => a + Math.max(0, Number(e.amount) || 0), 0);
  const totalDebtPmt  = debtsArr.reduce((a, d) => a + Math.max(0, Number(d.monthlyPayment) || 0), 0);
  const hasData       = incomes.length > 0 || expensesArr.length > 0 || debtsArr.length > 0;

  if (!hasData || incomes.length === 0) {
    return { monthlyIncome: 0, monthlyExpenses: 0, monthlySavings: 0, emergencyFundMonths: null, hasData, hasIncome: incomes.length > 0 };
  }

  const incomeMonthKeys = new Set(
    incomes.map(i => {
      const d = new Date(i.date || i.createdAt);
      if (isNaN(d.getTime()) || d.getFullYear() < 2000) return null;
      return `${d.getFullYear()}-${d.getMonth()}`;
    }).filter(Boolean)
  );
  const monthsOfData    = Math.max(1, incomeMonthKeys.size);
  const monthlyIncome   = totalIncome / monthsOfData;
  const monthlyExpenses = totalExpenses / monthsOfData;

  const scoreData = calculateFinancialScore({
    monthlyIncome,
    monthlyExpenses,
    monthlyDebtPayment: totalDebtPmt,
    monthlyInvestments: 0,
    emergencyFundBalance: userDoc?.emergencyFundBalance
  });

  return {
    monthlyIncome,
    monthlyExpenses,
    monthlySavings:      scoreData.breakdown.monthlySavings      ?? 0,
    emergencyFundMonths: scoreData.breakdown.emergencyFundMonths ?? null,
    hasData: true,
    hasIncome: true
  };
};

// Safe ceiling division — never returns Infinity or NaN
const safeCeil = (num, den) => {
  if (!den || den <= 0 || !isFinite(den)) return null;
  if (!num || num <= 0) return 0;
  const r = Math.ceil(num / den);
  return isFinite(r) ? r : null;
};

const analyzeGoal = (goal, fin) => {
  const { monthlyIncome: mi, monthlyExpenses: me, monthlySavings: ms, emergencyFundMonths: ef, hasIncome } = fin;

  const remaining   = Math.max(0, goal.goalAmount - goal.currentSavings);
  const progressPct = goal.goalAmount > 0
    ? Math.min(100, Math.round((goal.currentSavings / goal.goalAmount) * 100))
    : 0;

  if (goal.goalAmount <= 0)     return { ...goal.toObject(), error: "Invalid goal amount",  progressPct: 0, alternatives: [], recommendedPlan: [], priorityStatus: "unknown" };
  if (goal.deadlineMonths <= 0) return { ...goal.toObject(), error: "Invalid deadline",    progressPct,   alternatives: [], recommendedPlan: [], priorityStatus: "unknown" };

  // Goal achieved
  if (goal.currentSavings >= goal.goalAmount) {
    return {
      ...goal.toObject(),
      progressPct:           100,
      onTrack:               true,
      achieved:              true,
      priorityStatus:        "achieved",
      insight:               `Goal achieved! You saved Rs.${goal.currentSavings.toLocaleString()}.`,
      requiredMonthlySaving: 0,
      currentMonthlySavings: ms,
      gap:                   0,
      alternatives:          [],
      recommendedPlan:       []
    };
  }

  const req      = remaining / goal.deadlineMonths;
  const gap      = req - ms;
  const onTrack  = gap <= 0;

  // No income data
  if (!hasIncome) {
    return {
      ...goal.toObject(),
      requiredMonthlySaving: +req.toFixed(2),
      currentMonthlySavings: 0,
      gap:                   +req.toFixed(2),
      progressPct,
      priorityStatus:        "unknown",
      onTrack:               false,
      isFeasible:            null,
      emergencyRisk:         false,
      efCritical:            false,
      insight:               `To reach this goal in ${goal.deadlineMonths} months, you need Rs.${Math.round(req).toLocaleString()}/month.`,
      alternatives:          [],
      recommendedPlan: [
        { step: 1, action: "Add income data",  detail: "Go to My Financial Data > Income tab and add your monthly income.", priority: "high" },
        { step: 2, action: "Add expense data", detail: "Add your monthly expenses so we can calculate your savings capacity.", priority: "high" },
        { step: 3, action: "Return here",      detail: "Your goal plan will update automatically.", priority: "low" }
      ]
    };
  }

  const maxAffordable = mi * 0.40;
  const isFeasible    = req <= maxAffordable;
  const emergencyRisk = ef < 3;   // EF below 3 months — risky
  const efCritical    = ef < 1;   // EF below 1 month — critical, block goal
  const hasSavings    = ms > 0;

  // ── Priority status — strict hierarchy
  let priorityStatus;
  if (efCritical && !onTrack)    priorityStatus = "blocked";  // EF < 1 month: stop goal contributions
  else if (emergencyRisk && !onTrack) priorityStatus = "paused";   // EF 1-3 months: split savings
  else if (onTrack)              priorityStatus = "active";
  else                           priorityStatus = "active";

  // ── Insight — EF is the PRIMARY message when risk exists, not a footnote
  let insight = "";

  if (efCritical && !onTrack) {
    const efTarget   = me > 0 ? Math.round(me * 3) : 0;
    const monthsToEF = hasSavings && efTarget > 0 ? safeCeil(efTarget, ms) : null;
    // Do NOT mention the original deadline — it is no longer valid
    const restartMonths = monthsToEF && hasSavings
      ? safeCeil(remaining, ms)
      : null;
    insight = `Your ${goal.deadlineMonths}-month deadline is on hold — emergency fund must reach 3 months first. ` +
      (efTarget > 0 ? `Build \u20b9${efTarget.toLocaleString()} (3 \u00d7 monthly expenses). ` : "") +
      (monthsToEF
        ? `Emergency fund ready in ~${monthsToEF} months. ` +
          (restartMonths ? `After that, this goal can be completed in ~${restartMonths} more months.` : "Then restart this goal.")
        : "Increase savings to start building the emergency fund.");

  } else if (emergencyRisk && !onTrack) {
    const efGap      = me > 0 ? Math.max(0, me * 3 - ef * me) : 0;
    const monthsToEF = hasSavings && efGap > 0 ? safeCeil(efGap, ms) : null;
    insight = `Emergency fund is at ${ef.toFixed(1)} months (target: 3 months). ` +
      `Build this before accelerating goal savings. ` +
      (monthsToEF ? `~${monthsToEF} months to reach safety at current savings rate.` : "");

  } else if (onTrack) {
    insight = `On track. Your savings of \u20b9${Math.round(ms).toLocaleString()}/month covers this goal.`;

  } else if (!hasSavings) {
    insight = `You need \u20b9${Math.round(req).toLocaleString()}/month for this goal, but you are currently saving \u20b90 \u2014 expenses equal income.`;

  } else if (!isFeasible) {
    insight = `This goal needs \u20b9${Math.round(req).toLocaleString()}/month \u2014 more than 40% of your income. Not achievable in ${goal.deadlineMonths} months at a sustainable rate.`;

  } else if (gap > ms * 0.5) {
    insight = `You need \u20b9${Math.round(req).toLocaleString()}/month but save \u20b9${Math.round(ms).toLocaleString()}/month. Gap: \u20b9${Math.round(gap).toLocaleString()}/month.`;

  } else {
    insight = `You need \u20b9${Math.round(req).toLocaleString()}/month. You save \u20b9${Math.round(ms).toLocaleString()}/month. Increase savings by \u20b9${Math.round(gap).toLocaleString()}/month.`;
  }

  // ── Alternatives — not shown when blocked (only one right action exists)
  const alternatives = [];

  if (!efCritical) {
    if (!onTrack && hasSavings) {
      const monthsAtCurrent = safeCeil(remaining, ms);
      if (monthsAtCurrent && monthsAtCurrent > goal.deadlineMonths) {
        alternatives.push(`Extend deadline to ~${monthsAtCurrent} months at your current savings rate`);
      }
    }

    if (!isFeasible) {
      const at30 = mi * 0.30;
      const m30  = safeCeil(remaining, at30);
      if (m30) alternatives.push(`Save 25-30% of income (\u20b9${Math.round(mi * 0.25).toLocaleString()}-\u20b9${Math.round(at30).toLocaleString()}/month) to reach goal in ~${m30} months`);
      const achievable = Math.round(at30 * goal.deadlineMonths + goal.currentSavings);
      if (achievable > goal.currentSavings) {
        alternatives.push(`Reduce goal to \u20b9${achievable.toLocaleString()} (achievable in ${goal.deadlineMonths} months at 30% savings rate)`);
      }
    } else if (!onTrack && gap > 0) {
      const lo = Math.round(gap * 0.85);
      const hi = Math.round(gap * 1.15);
      alternatives.push(`Reduce expenses by \u20b9${lo.toLocaleString()}-\u20b9${hi.toLocaleString()}/month to close the gap`);
      alternatives.push(`Find \u20b9${lo.toLocaleString()}-\u20b9${hi.toLocaleString()}/month in additional income (freelance, part-time)`);
    }

    if (!hasSavings) {
      const a20 = safeCeil(remaining, mi * 0.20);
      const a30 = safeCeil(remaining, mi * 0.30);
      if (a20) alternatives.push(`Save 20% of income (\u20b9${Math.round(mi * 0.20).toLocaleString()}/month) to reach goal in ~${a20} months`);
      if (a30) alternatives.push(`Save 30% of income (\u20b9${Math.round(mi * 0.30).toLocaleString()}/month) to reach goal in ~${a30} months`);
    }
  }

  // ── Recommended plan — step-by-step, priority-aware
  const recommendedPlan = [];
  let s = 1;

  if (efCritical) {
    const efTarget   = me > 0 ? Math.round(me * 3) : 0;
    const monthsToEF = hasSavings && efTarget > 0 ? safeCeil(efTarget, ms) : null;
    const restartMonths = hasSavings ? safeCeil(remaining, ms) : null;
    recommendedPlan.push({
      step: s++, priority: "critical",
      action: "Step 1: Build emergency fund — do this now",
      detail: efTarget > 0
        ? `Save \u20b9${efTarget.toLocaleString()} (3 months of expenses). ` +
          (monthsToEF ? `At your current savings rate, this takes ~${monthsToEF} months.` : "Increase savings to start.")
        : "Build 3 months of expenses as a safety net."
    });
    recommendedPlan.push({
      step: s++, priority: "critical",
      action: "Step 2: Pause all goal contributions",
      detail: "Direct 100% of your savings to the emergency fund. Do not split between goals and EF right now."
    });
    recommendedPlan.push({
      step: s++, priority: "medium",
      action: `Step 3: Restart this goal after ~${monthsToEF || "?"} months`,
      detail: restartMonths
        ? `Once EF is stable, resume saving \u20b9${Math.round(ms).toLocaleString()}/month toward this goal. At that rate, you can complete it in ~${restartMonths} more months.`
        : "Once EF reaches 3 months, return here to get an updated goal plan."
    });
  } else if (emergencyRisk) {
    const efGap = me > 0 ? Math.max(0, Math.round(me * 3 - ef * me)) : 0;
    recommendedPlan.push({
      step: s++, priority: "high",
      action: "Prioritize emergency fund",
      detail: efGap > 0
        ? `You need Rs.${efGap.toLocaleString()} more to reach 3 months. Split savings: 60-70% to emergency fund, 30-40% to this goal.`
        : "Split savings between emergency fund and this goal until EF reaches 3 months."
    });
  }

  if (!hasSavings) {
    recommendedPlan.push({
      step: s++, priority: "high",
      action: "Reduce expenses first",
      detail: "Your expenses equal your income. Identify and cut 15-25% of non-essential spending to free up savings capacity."
    });
  } else if (!isFeasible) {
    const m30 = safeCeil(remaining, mi * 0.30);
    recommendedPlan.push({
      step: s++, priority: "medium",
      action: "Adjust the goal timeline",
      detail: m30
        ? `Extend deadline to ~${m30} months. This makes the goal achievable at a sustainable 30% savings rate.`
        : "Extend the deadline or reduce the goal amount to make it achievable."
    });
  } else if (!onTrack) {
    const lo = Math.round(gap * 0.85);
    const hi = Math.round(gap * 1.15);
    recommendedPlan.push({
      step: s++, priority: "medium",
      action: "Increase monthly savings",
      detail: `Find Rs.${lo.toLocaleString()}-Rs.${hi.toLocaleString()}/month in expense cuts or extra income to stay on track for your ${goal.deadlineMonths}-month deadline.`
    });
  }

  if (onTrack && !emergencyRisk) {
    recommendedPlan.push({ step: s++, priority: "low", action: "Stay consistent", detail: `Keep saving Rs.${Math.round(ms).toLocaleString()}/month. You are on track.` });
    recommendedPlan.push({ step: s++, priority: "low", action: "Review in 3 months", detail: "Check progress and adjust if your income or expenses change." });
  }

  return {
    ...goal.toObject(),
    requiredMonthlySaving: +req.toFixed(2),
    currentMonthlySavings: +ms.toFixed(2),
    gap:                   +gap.toFixed(2),
    progressPct,
    priorityStatus,
    onTrack,
    isFeasible,
    emergencyRisk,
    efCritical,
    insight,
    alternatives,
    recommendedPlan
  };
};

router.post("/", protect, async (req, res) => {
  try {
    const { title, goalAmount, currentSavings, deadlineMonths } = req.body;
    if (!title?.trim())                    return res.status(400).json({ message: "Goal name is required" });
    if (!goalAmount || goalAmount <= 0)    return res.status(400).json({ message: "Goal amount must be positive" });
    if (!deadlineMonths || deadlineMonths <= 0) return res.status(400).json({ message: "Deadline must be at least 1 month" });
    const goal = await Goal.create({
      userId: req.user, title: title.trim(),
      goalAmount:     Number(goalAmount),
      currentSavings: Math.max(0, Number(currentSavings) || 0),
      deadlineMonths: Number(deadlineMonths)
    });
    res.status(201).json(goal);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user;
    const [goals, financials] = await Promise.all([
      Goal.find({ userId }).sort({ createdAt: -1 }),
      getMonthlyFinancials(userId)
    ]);
    if (!goals.length) return res.json([]);
    const enriched = goals
      .map(g => analyzeGoal(g, financials))
      .sort((a, b) => (b.gap || 0) - (a.gap || 0));
    enriched.forEach((g, i) => { g.priority = i + 1; });
    res.json(enriched);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch("/:id", protect, async (req, res) => {
  try {
    const updates = {};
    if (req.body.currentSavings !== undefined) updates.currentSavings = Math.max(0, Number(req.body.currentSavings));
    if (req.body.deadlineMonths !== undefined) updates.deadlineMonths = Math.max(1, Number(req.body.deadlineMonths));
    if (req.body.goalAmount     !== undefined) updates.goalAmount     = Math.max(1, Number(req.body.goalAmount));
    const goal = await Goal.findOneAndUpdate({ _id: req.params.id, userId: req.user }, updates, { new: true });
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    res.json(goal);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: "Goal deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
