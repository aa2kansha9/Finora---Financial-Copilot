const calculateFinancialScore = require("../utils/financialScore");
const generateInsights = require("../utils/financialInsights");
const { getAIInsights } = require("../services/aiService");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Debt = require("../models/Debt");
const Investment = require("../models/Investment");
const User = require("../models/User");

const getFinancialHealth = async (req, res) => {
  try {
    const userId = req.user || req.query.userId;

    if (!userId) {
      return res.status(200).json({
        dataState: "no_data",
        score: 0,
        category: "No Data",
        metrics: {},
        insights: ["Please log in to view your financial health."]
      });
    }

    const [incomes, expensesArr, debtsArr, investmentsArr, userDoc] = await Promise.all([
      Income.find({ userId }),
      Expense.find({ userId }),
      Debt.find({ userId }),
      Investment.find({ userId }),
      User.findById(userId).select("emergencyFundBalance")
    ]);

    const emergencyFundBalanceUser = userDoc?.emergencyFundBalance;

    const totalIncome      = incomes.reduce((a, i) => a + Math.max(0, Number(i.amount) || 0), 0);
    const totalExpenses    = expensesArr.reduce((a, e) => a + Math.max(0, Number(e.amount) || 0), 0);
    const totalDebtPmt     = debtsArr.reduce((a, d) => a + Math.max(0, Number(d.monthlyPayment) || 0), 0);
    const totalInvestments = investmentsArr.reduce((a, i) => a + Math.max(0, Number(i.amount) || 0), 0);

    const hasAnyData = incomes.length > 0 || expensesArr.length > 0 ||
                       debtsArr.length > 0 || investmentsArr.length > 0;

    // ── State 1: Truly no data — nothing in any collection
    if (!hasAnyData) {
      return res.status(200).json({
        dataState: "no_data",
        score: 0,
        category: "No Data",
        metrics: {},
        insights: ["No financial data found. Go to 📝 My Financial Data to add your income, expenses, debts, and investments."]
      });
    }

    // ── State 2: Partial data — no income entries at all (cannot derive monthly income)
    if (incomes.length === 0) {
      const partialSummary = [];
      if (expensesArr.length > 0) partialSummary.push(`${expensesArr.length} expense entr${expensesArr.length > 1 ? "ies" : "y"} (₹${totalExpenses.toLocaleString()} total)`);
      if (debtsArr.length > 0)    partialSummary.push(`${debtsArr.length} debt entr${debtsArr.length > 1 ? "ies" : "y"} (₹${totalDebtPmt.toLocaleString()}/month payments)`);
      if (investmentsArr.length > 0) partialSummary.push(`${investmentsArr.length} investment entr${investmentsArr.length > 1 ? "ies" : "y"} (₹${totalInvestments.toLocaleString()} total)`);

      return res.status(200).json({
        dataState: "partial_data",
        score: 0,
        category: "Incomplete",
        metrics: {
          totalExpenses,
          totalDebtPayment: totalDebtPmt,
          totalInvestments
        },
        partialSummary,
        insights: [
          "Add at least one income entry (₹0 is allowed) to calculate your financial health score.",
          "Ratios like savings rate, debt-to-income, and emergency fund months use your monthly income as the base.",
          partialSummary.length > 0
            ? `We found: ${partialSummary.join(", ")}. Add your income to unlock your full financial health analysis.`
            : "Add your monthly income to get started."
        ]
      });
    }

    // ── State 3: Has income entries (including ₹0 total), proceed with calculation
    const incomeMonthKeys = new Set(
      incomes.map(i => {
        const d = new Date(i.date || i.createdAt);
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) return null;
        return `${d.getFullYear()}-${d.getMonth()}`;
      }).filter(Boolean)
    );
    const monthsOfData = Math.max(1, incomeMonthKeys.size);

    const monthlyIncome      = totalIncome / monthsOfData;
    const monthlyExpenses    = totalExpenses / monthsOfData;
    const monthlyDebtPayment = totalDebtPmt;
    const monthlyInvestments = totalInvestments / monthsOfData;

    const scoreData = calculateFinancialScore({
      monthlyIncome,
      monthlyExpenses,
      monthlyDebtPayment,
      monthlyInvestments,
      emergencyFundBalance: emergencyFundBalanceUser
    });

    const now = new Date();
    const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentMonthExpenses = expensesArr
      .filter(e => new Date(e.date || e.createdAt) >= startOfMonth)
      .reduce((a, e) => a + e.amount, 0);
    const lastMonthExpenses = expensesArr
      .filter(e => {
        const d = new Date(e.date || e.createdAt);
        return d >= startOfLastMonth && d < startOfMonth;
      })
      .reduce((a, e) => a + e.amount, 0);

    let insights = generateInsights({
      income:      monthlyIncome,
      expenses:    monthlyExpenses,
      debt:        monthlyDebtPayment,
      investments: monthlyInvestments,
      breakdown:   scoreData.breakdown
    });
    if (scoreData.breakdown.incomeZeroWarning) {
      insights = [scoreData.breakdown.incomeZeroMessage, ...insights];
    }
    if (scoreData.breakdown.extremeSpendingWarning) {
      insights = [scoreData.breakdown.extremeSpendingWarning, ...insights];
    }
    if (Array.isArray(scoreData.breakdown.behavioralWarnings) && scoreData.breakdown.behavioralWarnings.length > 0) {
      insights = [...scoreData.breakdown.behavioralWarnings, ...insights];
    }

    const metrics = {
      ...scoreData.breakdown,
      currentMonthExpenses,
      lastMonthExpenses
    };

    const baseResponse = {
      dataState:             "complete",
      score:                 scoreData.score,
      category:              scoreData.status,
      biggestWeakness:       scoreData.biggestWeakness,
      biggestWeaknessDetail: scoreData.biggestWeaknessDetail,
      metrics,
      insights,
      rawData: {
        totalIncome,
        totalExpenses,
        totalDebt:        debtsArr.reduce((a, d) => a + (Number(d.totalDebt) || 0), 0),
        totalInvestments,
        monthlyDebtPayment,
        monthsOfData
      }
    };

    let aiData = null;
    try {
      aiData = await Promise.race([
        getAIInsights({ score: scoreData.score, category: scoreData.status, biggestWeakness: scoreData.biggestWeakness, breakdown: scoreData.breakdown }),
        new Promise(resolve => setTimeout(() => resolve(null), 4000))
      ]);
    } catch (e) { console.error("AI insights error:", e.message); }

    const response = aiData
      ? { ...baseResponse, riskProfile: aiData.riskProfile, explanation: aiData.explanation }
      : baseResponse;

    res.status(200).json(response);
  } catch (error) {
    console.error("getFinancialHealth error:", error.message, error.stack);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};

module.exports = { getFinancialHealth };
