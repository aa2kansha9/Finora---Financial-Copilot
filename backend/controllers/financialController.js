const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Debt = require("../models/Debt");
const Investment = require("../models/Investment");
const User = require("../models/User");
const calculateFinancialScore = require("../utils/financialScore");
const generateInsights = require("../utils/financialInsights");
const { generateAIAdvice } = require("../services/aiService");

const UNREALISTIC_RS = 50_000_000;

function parseMoney(raw, label, { allowZero = false } = {}) {
  if (raw === undefined || raw === null || raw === "") {
    return { error: `${label} is required` };
  }
  const n = Number(raw);
  if (Number.isNaN(n)) {
    return { error: `${label} must be a valid number` };
  }
  if (n < 0) {
    return { error: `${label} cannot be negative` };
  }
  if (!allowZero && n <= 0) {
    return { error: `${label} must be greater than zero` };
  }
  const warning = n > UNREALISTIC_RS ? `${label} is unusually large — confirm amount and time period (e.g. monthly vs total).` : null;
  return { value: n, warning };
}

function sendCreated(res, doc, warning) {
  const o = doc.toObject ? doc.toObject() : doc;
  if (warning) return res.status(201).json({ ...o, inputWarning: warning });
  res.status(201).json(o);
}

// ================= ADD INCOME =================
const addIncome = async (req, res) => {
  try {
    const { amount, source, date } = req.body;
    const p = parseMoney(amount, "Amount", { allowZero: true });
    if (p.error) return res.status(400).json({ message: p.error });
    if (!source || String(source).trim() === "") return res.status(400).json({ message: "Source is required" });
    const income = await Income.create({ userId: req.user, amount: p.value, source: String(source).trim(), date });
    sendCreated(res, income, p.warning);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getIncomes = async (req, res) => {
  try {
    const incomes = await Income.find({ userId: req.user }).sort({ date: -1 });
    res.json(incomes);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateIncome = async (req, res) => {
  try {
    const patch = { ...req.body };
    if (patch.amount !== undefined) {
      const p = parseMoney(patch.amount, "Amount", { allowZero: true });
      if (p.error) return res.status(400).json({ message: p.error });
      patch.amount = p.value;
    }
    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, userId: req.user },
      patch,
      { new: true }
    );
    if (!income) return res.status(404).json({ message: "Not found" });
    res.json(income);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteIncome = async (req, res) => {
  try {
    await Income.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: "Deleted" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ================= ADD EXPENSE =================
const addExpense = async (req, res) => {
  try {
    const { amount, category, date } = req.body;
    const p = parseMoney(amount, "Amount");
    if (p.error) return res.status(400).json({ message: p.error });
    if (!category || String(category).trim() === "") return res.status(400).json({ message: "Category is required" });
    const expense = await Expense.create({ userId: req.user, amount: p.value, category: String(category).trim(), date });
    sendCreated(res, expense, p.warning);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateExpense = async (req, res) => {
  try {
    const patch = { ...req.body };
    if (patch.amount !== undefined) {
      const p = parseMoney(patch.amount, "Amount");
      if (p.error) return res.status(400).json({ message: p.error });
      patch.amount = p.value;
    }
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user },
      patch,
      { new: true }
    );
    if (!expense) return res.status(404).json({ message: "Not found" });
    res.json(expense);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteExpense = async (req, res) => {
  try {
    await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: "Deleted" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ================= ADD DEBT =================
const addDebt = async (req, res) => {
  try {
    const { type, totalDebt, monthlyPayment, interestRate } = req.body;
    if (!type || String(type).trim() === "") return res.status(400).json({ message: "Debt type required" });
    const td = parseMoney(totalDebt, "Total debt");
    if (td.error) return res.status(400).json({ message: td.error });
    const mp = parseMoney(monthlyPayment, "Monthly payment");
    if (mp.error) return res.status(400).json({ message: mp.error });
    const irRaw = interestRate === undefined || interestRate === null || interestRate === "" ? 0 : Number(interestRate);
    if (Number.isNaN(irRaw) || irRaw < 0) {
      return res.status(400).json({ message: "Interest rate must be a number ≥ 0" });
    }
    const debt = await Debt.create({
      userId: req.user,
      type: String(type).trim(),
      totalDebt: td.value,
      monthlyPayment: mp.value,
      interestRate: irRaw
    });
    const warn = [td.warning, mp.warning].filter(Boolean).join(" ") || null;
    sendCreated(res, debt, warn);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getDebts = async (req, res) => {
  try {
    const debts = await Debt.find({ userId: req.user }).sort({ createdAt: -1 });
    res.json(debts);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateDebt = async (req, res) => {
  try {
    const patch = { ...req.body };
    if (patch.totalDebt !== undefined) {
      const p = parseMoney(patch.totalDebt, "Total debt");
      if (p.error) return res.status(400).json({ message: p.error });
      patch.totalDebt = p.value;
    }
    if (patch.monthlyPayment !== undefined) {
      const p = parseMoney(patch.monthlyPayment, "Monthly payment");
      if (p.error) return res.status(400).json({ message: p.error });
      patch.monthlyPayment = p.value;
    }
    if (patch.interestRate !== undefined) {
      const ir = Number(patch.interestRate);
      if (Number.isNaN(ir) || ir < 0) {
        return res.status(400).json({ message: "Interest rate must be a number ≥ 0" });
      }
      patch.interestRate = ir;
    }
    const debt = await Debt.findOneAndUpdate(
      { _id: req.params.id, userId: req.user },
      patch,
      { new: true }
    );
    if (!debt) return res.status(404).json({ message: "Not found" });
    res.json(debt);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteDebt = async (req, res) => {
  try {
    await Debt.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: "Deleted" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ================= ADD INVESTMENT =================
const addInvestment = async (req, res) => {
  try {
    const { assetType, amount, date } = req.body;
    if (!assetType || String(assetType).trim() === "") return res.status(400).json({ message: "Asset type required" });
    const p = parseMoney(amount, "Amount");
    if (p.error) return res.status(400).json({ message: p.error });
    const investment = await Investment.create({
      userId: req.user,
      assetType: String(assetType).trim(),
      amount: p.value,
      date
    });
    sendCreated(res, investment, p.warning);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({ userId: req.user }).sort({ date: -1 });
    res.json(investments);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateInvestment = async (req, res) => {
  try {
    const patch = { ...req.body };
    if (patch.amount !== undefined) {
      const p = parseMoney(patch.amount, "Amount");
      if (p.error) return res.status(400).json({ message: p.error });
      patch.amount = p.value;
    }
    const investment = await Investment.findOneAndUpdate(
      { _id: req.params.id, userId: req.user },
      patch,
      { new: true }
    );
    if (!investment) return res.status(404).json({ message: "Not found" });
    res.json(investment);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteInvestment = async (req, res) => {
  try {
    await Investment.findOneAndDelete({ _id: req.params.id, userId: req.user });
    res.json({ message: "Deleted" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ================= FINANCIAL SUMMARY =================
const getFinancialSummary = async (req, res) => {
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
    const validIncomes = incomes.filter(i => {
      const d = new Date(i.date || i.createdAt);
      return !isNaN(d.getTime()) && d.getFullYear() >= 2000 && safe(i.amount) >= 0;
    });
    const incomeMonthKeys = new Set(
      validIncomes.map(i => {
        const d = new Date(i.date || i.createdAt);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    );
    const monthsOfData = Math.max(1, incomeMonthKeys.size);
    const totalIncome = validIncomes.reduce((acc, item) => acc + safe(item.amount), 0);
    const expensesTotal = expenses.reduce((acc, item) => acc + safe(item.amount), 0);
    const debtPmt = debts.reduce((acc, item) => acc + safe(item.monthlyPayment), 0);
    const investmentsTotal = investments.reduce((acc, item) => acc + safe(item.amount), 0);
    const monthlyIncome = totalIncome / monthsOfData;
    const monthlyExpenses = expensesTotal / monthsOfData;
    const monthlyInvestments = investmentsTotal / monthsOfData;
    const scoreData = calculateFinancialScore({
      monthlyIncome,
      monthlyExpenses,
      monthlyDebtPayment: debtPmt,
      monthlyInvestments,
      emergencyFundBalance: userDoc?.emergencyFundBalance
    });
    const insights = generateInsights({
      income: monthlyIncome,
      expenses: monthlyExpenses,
      debt: debtPmt,
      investments: monthlyInvestments,
      breakdown: scoreData.breakdown
    });
    let aiAdvice = "AI service unavailable";
    try {
      aiAdvice = await generateAIAdvice({
        income: monthlyIncome,
        expenses: monthlyExpenses,
        debt: debtPmt,
        investments: monthlyInvestments,
        score: scoreData.score,
        status: scoreData.status
      });
    } catch (e) {}
    res.status(200).json({
      income: monthlyIncome,
      expenses: monthlyExpenses,
      debt: debtPmt,
      investments: monthlyInvestments,
      ...scoreData,
      insights,
      aiAdvice
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = {
  addIncome, getIncomes, updateIncome, deleteIncome,
  addExpense, getExpenses, updateExpense, deleteExpense,
  addDebt, getDebts, updateDebt, deleteDebt,
  addInvestment, getInvestments, updateInvestment, deleteInvestment,
  getFinancialSummary
};