const express = require("express");
const router = express.Router();
const { getFinancialHealth } = require("../controllers/financialHealthController");
const { getAIInsights, getStructuredInsights } = require("../services/aiService");
const InsightLog = require("../models/InsightLog");
const protect = require("../middleware/authMiddleware");

router.get("/health", protect, getFinancialHealth);

router.post("/ai-insights", async (req, res) => {
  try {
    const data = await getAIInsights(req.body);
    if (!data) return res.status(503).json({ message: "AI service unavailable" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

router.post("/insights", async (req, res) => {
  try {
    const insights = await getStructuredInsights(req.body);
    res.json({ insights });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

// GET /api/financial/ai/insights — full flow: collect metrics → Python → save → return
router.get("/ai/insights", protect, async (req, res) => {
  try {
    const userId = req.user;

    const payload = {
      income:                 Number(req.query.income) || 1,
      savings_ratio:          Number(req.query.savings_ratio) || 0,
      debt_to_income:         Number(req.query.debt_to_income) || 0,
      emergency_runway:       Number(req.query.emergency_runway) || 0,
      investment_frequency:   Number(req.query.investment_frequency) || 0,
      spending_stability:     req.query.spending_stability === "Stable" ? 1.0 : 0.5,
      current_month_expense:  Number(req.query.current_month_expense) || 0,
      previous_month_expense: Number(req.query.previous_month_expense) || 0,
      risk_profile:           req.query.risk_profile || "Moderate"
    };

    const insights = await getStructuredInsights(payload);

    await InsightLog.create({
      userId,
      insights,
      riskProfile: payload.risk_profile,
      score: Number(req.query.score) || 0
    });

    res.json({ insights });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// GET /api/financial/ai/insights/history — fetch past insight logs with improvement status
router.get("/ai/insights/history", protect, async (req, res) => {
  try {
    const logs = await InsightLog.find({ userId: req.user })
      .sort({ generatedAt: -1 })
      .limit(10);

    // Enrich with status by comparing consecutive scores
    const enriched = logs.map((log, i) => {
      const next = logs[i + 1]; // older entry
      let status = "same";
      if (next) {
        if (log.score > next.score + 2) status = "improved";
        else if (log.score < next.score - 2) status = "worse";
      }
      return { ...log.toObject(), status };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;