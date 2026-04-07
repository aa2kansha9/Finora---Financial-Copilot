const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const financialRoutes = require("./routes/financialRoutes");
const financialHealthRoutes = require("./routes/financialHealthRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const goalRoutes = require("./routes/goalRoutes");
const reportRoutes = require("./routes/reportRoutes");
const simulatorRoutes = require("./routes/simulatorRoutes");
const contactRoutes   = require("./routes/contactRoutes");
const { generateAIAdvice } = require("./services/aiService");
const { getStructuredInsights } = require("./services/aiService");
const protect = require("./middleware/authMiddleware");
const { getFinancialHealth } = require("./controllers/financialHealthController");
const Portfolio = require("./models/Portfolio");
const User = require("./models/User");


// Load env variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ✅ GLOBAL DEBUG MIDDLEWARE (put it HERE)
app.use((req, res, next) => {
  console.log("API HIT:", req.method, req.url);
  next();
});

// Test route
app.get("/api/test", (req, res) => {
  res.send("API running");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api/finance", financialRoutes);
app.use("/api/financial", financialHealthRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/simulator", simulatorRoutes);
app.use("/api/contact",   contactRoutes);

app.post("/api/ai/behavior", async (req, res) => {
  try {
    const advice = await generateAIAdvice(req.body);
    res.json({ advice });
  } catch (err) {
    res.status(500).json({ message: "AI service error" });
  }
});

// ===== MASTER DASHBOARD ENDPOINT =====
app.get("/api/dashboard", protect, async (req, res) => {
  try {
    const userId = req.user;

    const Income     = require("./models/Income");
    const Expense    = require("./models/Expense");
    const Debt       = require("./models/Debt");
    const Investment = require("./models/Investment");
    const calculateFinancialScore = require("./utils/financialScore");
    const generateInsights        = require("./utils/financialInsights");

    const [user, portfolio, incomes, expensesArr, debtsArr, investmentsArr] = await Promise.all([
      User.findById(userId).select("-password"),
      Portfolio.findOne({ userId }).sort({ createdAt: -1 }),
      Income.find({ userId }),
      Expense.find({ userId }),
      Debt.find({ userId }),
      Investment.find({ userId })
    ]);

    // ── Raw totals
    const totalIncome      = incomes.reduce((a, i) => a + Math.max(0, Number(i.amount) || 0), 0);
    const totalExpenses    = expensesArr.reduce((a, e) => a + Math.max(0, Number(e.amount) || 0), 0);
    const totalDebtPmt     = debtsArr.reduce((a, d) => a + Math.max(0, Number(d.monthlyPayment) || 0), 0);
    const totalInvestments = investmentsArr.reduce((a, i) => a + Math.max(0, Number(i.amount) || 0), 0);

    if (!totalIncome && !totalExpenses) {
      return res.json({
        user: user ? { _id: user._id, name: user.name, email: user.email } : null,
        financialHealth: {
          dataState: "no_data",
          score: 0, category: "No Data", metrics: {},
          insights: ["Add your income and expenses to get started."]
        },
        portfolio: portfolio || null,
        insights: []
      });
    }

    // ── Months of data: count distinct calendar months from income entries
    const incomeMonthKeys = new Set(
      incomes.map(i => {
        const d = new Date(i.date || i.createdAt);
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) return null;
        return `${d.getFullYear()}-${d.getMonth()}`;
      }).filter(Boolean)
    );
    const monthsOfData = Math.max(1, incomeMonthKeys.size);

    // ── Monthly values
    const monthlyIncome      = totalIncome / monthsOfData;
    const monthlyExpenses    = totalExpenses / monthsOfData;
    const monthlyDebtPayment = totalDebtPmt;           // already monthly EMI
    const monthlyInvestments = totalInvestments / monthsOfData;

    // ── Score calculation
    const scoreData = calculateFinancialScore({
      monthlyIncome,
      monthlyExpenses,
      monthlyDebtPayment,
      monthlyInvestments,
      emergencyFundBalance: user.emergencyFundBalance
    });

    // ── Insights from same breakdown
    let insights_local = generateInsights({
      income:      monthlyIncome,
      expenses:    monthlyExpenses,
      debt:        monthlyDebtPayment,
      investments: monthlyInvestments,
      breakdown:   scoreData.breakdown
    });
    if (scoreData.breakdown.incomeZeroWarning) {
      insights_local = [scoreData.breakdown.incomeZeroMessage, ...insights_local];
    }

    const financialHealth = {
      score:           scoreData.score,
      category:        scoreData.status,
      biggestWeakness: scoreData.biggestWeakness,
      metrics:         scoreData.breakdown,
      insights:        insights_local
    };

    // ── AI layer (optional — graceful fallback)
    const { getAIInsights, getStructuredInsights } = require("./services/aiService");
    let aiData   = null;
    let aiInsights = [];

    try {
      aiData = await getAIInsights({
        score:           scoreData.score,
        category:        scoreData.status,
        biggestWeakness: scoreData.biggestWeakness,
        breakdown:       scoreData.breakdown
      });
    } catch (e) {}

    try {
      aiInsights = await getStructuredInsights({
        income:                 scoreData.breakdown.monthlyIncome,
        savings_ratio:          scoreData.breakdown.savingsRatio ?? 0,
        debt_to_income:         scoreData.breakdown.debtToIncome ?? 0,
        emergency_runway:       scoreData.breakdown.emergencyFundMonths ?? 0,
        investment_frequency:   scoreData.breakdown.investmentRatio ?? 0,
        spending_stability:     scoreData.breakdown.spendingRatio != null && scoreData.breakdown.spendingRatio < 0.8 ? 1.0 : 0.5,
        current_month_expense:  0,
        previous_month_expense: 0,
        risk_profile:           aiData?.riskProfile || "Moderate"
      });
    } catch (e) {}

    res.json({
      user: { _id: user._id, name: user.name, email: user.email },
      financialHealth: {
        dataState: "complete",
        ...financialHealth,
        riskProfile: aiData?.riskProfile  || null,
        explanation: aiData?.explanation  || null
      },
      riskProfile: aiData?.riskProfile || null,
      portfolio:   portfolio || null,
      insights:    aiInsights || []
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
