const express = require("express");
const router  = express.Router();
const protect = require("../middleware/authMiddleware");
const { generatePortfolio, getPortfolioByUser } = require("../services/portfolioService");
const axios   = require("axios");
const Income  = require("../models/Income");
const Expense = require("../models/Expense");
const Debt    = require("../models/Debt");
const Investment = require("../models/Investment");
const User = require("../models/User");
const calculateFinancialScore = require("../utils/financialScore");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// POST /api/portfolio/generate
router.post("/generate", protect, async (req, res) => {
  try {
    const userId = req.user;
    const { riskProfile, investmentAmount } = req.body;
    if (!riskProfile || !investmentAmount)
      return res.status(400).json({ message: "riskProfile and investmentAmount are required" });
    if (investmentAmount <= 0)
      return res.status(400).json({ message: "Investment amount must be greater than 0" });

    const [incomes, expenses, debts, investments, userDoc] = await Promise.all([
      Income.find({ userId }),
      Expense.find({ userId }),
      Debt.find({ userId }),
      Investment.find({ userId }),
      User.findById(userId).select("emergencyFundBalance")
    ]);
    const safe = (v) => Math.max(0, Number(v) || 0);
    const incomeMonthKeys = new Set(
      incomes.map(i => {
        const d = new Date(i.date || i.createdAt);
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) return null;
        return `${d.getFullYear()}-${d.getMonth()}`;
      }).filter(Boolean)
    );
    const monthsOfData = Math.max(1, incomeMonthKeys.size);
    const totalIncome       = incomes.reduce((a, i) => a + safe(i.amount), 0);
    const totalExpenses     = expenses.reduce((a, e) => a + safe(e.amount), 0);
    const totalMonthlyDebt  = debts.reduce((a, d) => a + safe(d.monthlyPayment), 0);
    const totalInvestments  = investments.reduce((a, i) => a + safe(i.amount), 0);
    const monthlyIncome     = totalIncome / monthsOfData;
    const monthlyExpenses   = totalExpenses / monthsOfData;
    const monthlyInvestments = totalInvestments / monthsOfData;

    const scoreData = incomes.length > 0
      ? calculateFinancialScore({
          monthlyIncome,
          monthlyExpenses,
          monthlyDebtPayment: totalMonthlyDebt,
          monthlyInvestments,
          emergencyFundBalance: userDoc?.emergencyFundBalance
        })
      : null;

    const userMetrics = scoreData ? {
      savingsRatio:        scoreData.breakdown.savingsRatio,
      debtToIncome:        scoreData.breakdown.debtToIncome,
      emergencyFundMonths: scoreData.breakdown.emergencyFundMonths,
      monthlySavings:      scoreData.breakdown.monthlySavings,
      monthlyExpenses:     scoreData.breakdown.monthlyExpenses
    } : {};

    const portfolio = await generatePortfolio(userId, riskProfile, investmentAmount, userMetrics);
    res.status(201).json(portfolio);
  } catch (err) {
    res.status(500).json({ message: err.message || "Server Error" });
  }
});

// GET /api/portfolio/me
router.get("/me", protect, async (req, res) => {
  try {
    const portfolio = await getPortfolioByUser(req.user);
    if (!portfolio) return res.status(404).json({ message: "No portfolio found" });
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// GET /api/portfolio/:userId — backward compat (must be AFTER specific routes)
router.get("/:userId", async (req, res) => {
  try {
    const portfolio = await getPortfolioByUser(req.params.userId);
    if (!portfolio) return res.status(404).json({ message: "No portfolio found" });
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// POST /api/portfolio/ai-suggest
router.post("/ai-suggest", protect, async (req, res) => {
  try {
    const userId = req.user;
    const [incomes, expenses, debts, investments, userDoc] = await Promise.all([
      Income.find({ userId }),
      Expense.find({ userId }),
      Debt.find({ userId }),
      Investment.find({ userId }),
      User.findById(userId).select("emergencyFundBalance")
    ]);
    const safe = (v) => Math.max(0, Number(v) || 0);
    const incomeMonthKeys = new Set(
      incomes.map(i => {
        const d = new Date(i.date || i.createdAt);
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) return null;
        return `${d.getFullYear()}-${d.getMonth()}`;
      }).filter(Boolean)
    );
    const monthsOfData = Math.max(1, incomeMonthKeys.size);
    const totalIncome   = incomes.reduce((a, i) => a + safe(i.amount), 0);
    const totalExp      = expenses.reduce((a, e) => a + safe(e.amount), 0);
    const totalDebtPmt  = debts.reduce((a, d) => a + safe(d.monthlyPayment), 0);
    const totalInv      = investments.reduce((a, i) => a + safe(i.amount), 0);
    const monthlyIncome = totalIncome / monthsOfData;
    const monthlyExp    = totalExp / monthsOfData;
    const monthlyInv    = totalInv / monthsOfData;

    const scoreData = incomes.length > 0
      ? calculateFinancialScore({
          monthlyIncome,
          monthlyExpenses: monthlyExp,
          monthlyDebtPayment: totalDebtPmt,
          monthlyInvestments: monthlyInv,
          emergencyFundBalance: userDoc?.emergencyFundBalance
        })
      : null;

    const payload = {
      ...req.body,
      emergencyFundMonths: scoreData?.breakdown?.emergencyFundMonths ?? 0,
      debtToIncome:        scoreData?.breakdown?.debtToIncome        ?? 0,
      savingsRatio:        scoreData?.breakdown?.savingsRatio        ?? 0,
      monthlySavings:      scoreData?.breakdown?.monthlySavings      ?? 0,
      monthlyExpenses:     scoreData?.breakdown?.monthlyExpenses     ?? 0
    };

    const response = await axios.post(`${AI_SERVICE_URL}/portfolio/ai-suggest`, payload);
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ message: "AI service unavailable" });
  }
});

module.exports = router;
