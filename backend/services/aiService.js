const axios = require("axios");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

const generateAIAdvice = async (data) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/api/ai/behavior`, data);
    return response.data.advice;
  } catch (err) {
    return "AI service unavailable";
  }
};

// Passes pre-computed backend values — Python must NOT re-derive metrics
const getAIInsights = async ({ score, category, biggestWeakness, breakdown }) => {
  try {
    const payload = {
      score,
      category,
      biggest_weakness: biggestWeakness || "",
      savings_ratio:         breakdown.savingsRatio        || 0,
      debt_to_income:        breakdown.debtToIncome        || 0,
      emergency_fund_months: breakdown.emergencyFundMonths || 0,
      investment_ratio:      breakdown.investmentRatio     || 0,
      monthly_savings:       breakdown.monthlySavings      || 0,
      monthly_income:        breakdown.monthlyIncome       || 0,
      spending_stability:    breakdown.spendingRatio != null
        ? (breakdown.spendingRatio < 0.8 ? 1.0 : 0.5)
        : 1.0
    };
    const response = await axios.post(`${AI_SERVICE_URL}/ai-insights`, payload, { timeout: 3000 });
    return response.data;
  } catch (err) {
    console.error("AI insights error:", err.message);
    return null;
  }
};

const getStructuredInsights = async (payload) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/insights`, payload, { timeout: 3000 });
    return response.data.insights;
  } catch (err) {
    console.error("Structured insights error:", err.message);
    return [];
  }
};

module.exports = { generateAIAdvice, getAIInsights, getStructuredInsights };
