const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  addIncome, getIncomes, updateIncome, deleteIncome,
  addExpense, getExpenses, updateExpense, deleteExpense,
  addDebt, getDebts, updateDebt, deleteDebt,
  addInvestment, getInvestments, updateInvestment, deleteInvestment,
  getFinancialSummary
} = require("../controllers/financialController");

router.get("/income", protect, getIncomes);
router.post("/income", protect, addIncome);
router.patch("/income/:id", protect, updateIncome);
router.delete("/income/:id", protect, deleteIncome);

router.get("/expense", protect, getExpenses);
router.post("/expense", protect, addExpense);
router.patch("/expense/:id", protect, updateExpense);
router.delete("/expense/:id", protect, deleteExpense);

router.get("/debt", protect, getDebts);
router.post("/debt", protect, addDebt);
router.patch("/debt/:id", protect, updateDebt);
router.delete("/debt/:id", protect, deleteDebt);

router.get("/investment", protect, getInvestments);
router.post("/investment", protect, addInvestment);
router.patch("/investment/:id", protect, updateInvestment);
router.delete("/investment/:id", protect, deleteInvestment);

router.get("/summary", protect, getFinancialSummary);

module.exports = router;
