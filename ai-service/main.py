from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class FinancialSummary(BaseModel):
    income: float
    expenses: float
    debt: float
    investments: float
    score: float
    status: str


class UserMetrics(BaseModel):
    savings_ratio: float
    spending_stability: float
    debt_to_income: float
    investment_frequency: float


class InsightRequest(BaseModel):
    score: float
    category: str
    biggest_weakness: str = ""
    # All values pre-computed by Node backend — Python must NOT re-derive
    savings_ratio: float
    debt_to_income: float
    emergency_fund_months: float
    investment_ratio: float
    monthly_savings: float = 0
    monthly_income: float = 0
    spending_stability: float = 1.0


class InsightTriggerRequest(BaseModel):
    income: float
    savings_ratio: float
    debt_to_income: float
    emergency_runway: float
    investment_frequency: float
    spending_stability: float
    current_month_expense: float = 0
    previous_month_expense: float = 0
    risk_profile: str = "Moderate"


SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}
INVESTMENT_INCOME_THRESHOLD = 30000


def generate_insights(d: dict) -> list[dict]:
    insights = []
    sr = round(d["savings_ratio"] * 100, 1)
    dti = round(d["debt_to_income"] * 100, 1)
    inv_pct = round(d["investment_frequency"] * 100, 1)

    # Low Savings
    if d["savings_ratio"] < 0.1:
        insights.append({
            "type": "warning",
            "title": "Low Savings",
            "message": f"You are saving only {sr}% of your income, which is too low.",
            "action": "Try to save at least 20% of your income. Start by cutting one non-essential expense this week.",
            "severity": "high"
        })
    elif d["savings_ratio"] < 0.2:
        insights.append({
            "type": "suggestion",
            "title": "Savings Can Be Better",
            "message": f"You are saving {sr}% of your income, which is decent but can be improved.",
            "action": "Aim to increase your savings by 5% next month.",
            "severity": "medium"
        })
    else:
        insights.append({
            "type": "achievement",
            "title": "Great Savings Rate",
            "message": f"You are saving {sr}% of your income. Keep it up!",
            "action": "Consider putting extra savings into an index fund to grow your wealth.",
            "severity": "low"
        })

    # High Debt Risk
    if d["debt_to_income"] > 0.4:
        insights.append({
            "type": "risk_alert",
            "title": "High Debt Risk",
            "message": f"Your debt is {dti}% of your income, which is dangerously high.",
            "action": "Stop taking new loans. Focus on paying off the highest-interest debt first.",
            "severity": "high"
        })
    elif d["debt_to_income"] > 0.2:
        insights.append({
            "type": "warning",
            "title": "Debt Is Getting High",
            "message": f"Your debt is {dti}% of your income. Try to keep it below 20%.",
            "action": "Avoid new debt and try to pay a little extra on existing loans each month.",
            "severity": "medium"
        })

    # Low Emergency Fund
    if d["emergency_runway"] < 3:
        insights.append({
            "type": "risk_alert",
            "title": "No Emergency Fund",
            "message": f"You only have {d['emergency_runway']:.1f} months of expenses saved as emergency funds.",
            "action": "Build an emergency fund of at least 3 months of expenses before investing more.",
            "severity": "high"
        })
    elif d["emergency_runway"] < 6:
        insights.append({
            "type": "suggestion",
            "title": "Emergency Fund Is Low",
            "message": f"You have {d['emergency_runway']:.1f} months of emergency savings. Aim for 6 months.",
            "action": "Set aside a fixed amount each month specifically for your emergency fund.",
            "severity": "medium"
        })

    # Overspending
    if d["previous_month_expense"] > 0 and d["current_month_expense"] > d["previous_month_expense"] * 1.2:
        pct = round((d["current_month_expense"] / d["previous_month_expense"] - 1) * 100, 1)
        insights.append({
            "type": "warning",
            "title": "Overspending This Month",
            "message": f"You spent {pct}% more this month compared to last month.",
            "action": "Review your recent transactions and identify what caused the spike.",
            "severity": "high"
        })

    # Investment Neglect
    if d["investment_frequency"] == 0 and d["income"] > INVESTMENT_INCOME_THRESHOLD:
        insights.append({
            "type": "suggestion",
            "title": "You Are Not Investing",
            "message": "You have a good income but are not investing any of it.",
            "action": "Start with a simple index fund. Even investing 5% of your income monthly can grow significantly over time.",
            "severity": "medium"
        })
    elif d["investment_frequency"] > 0:
        insights.append({
            "type": "achievement",
            "title": "You Are Investing",
            "message": f"You invest {inv_pct}% of your income. Great habit!",
            "action": "Consider diversifying into different asset classes to reduce risk.",
            "severity": "low"
        })

    # Spending Stability
    if d["spending_stability"] < 0.5:
        insights.append({
            "type": "suggestion",
            "title": "Inconsistent Spending",
            "message": "Your spending varies a lot from month to month.",
            "action": "Try creating a monthly budget and sticking to it. Track expenses weekly.",
            "severity": "medium"
        })

    # Sort by severity and return top 5
    insights.sort(key=lambda x: SEVERITY_ORDER.get(x["severity"], 3))
    return insights[:5]


INVESTMENT_THRESHOLD = 0.2


def risk_profile(metrics: dict) -> tuple[str, str]:
    sr = metrics["savings_ratio"]
    dti = metrics["debt_to_income"]
    inv = metrics["investment_frequency"]
    stability = metrics["spending_stability"]

    if sr < 0.1 or dti > 0.4:
        profile = "Conservative"
        explanation = "Your high debt or low savings suggest a conservative risk profile. Focus on reducing debt and building an emergency fund."
    elif inv > INVESTMENT_THRESHOLD and stability >= 0.7:
        profile = "Aggressive"
        explanation = "You invest heavily with stable spending habits, indicating an aggressive risk appetite."
    else:
        profile = "Moderate"
        explanation = "Your spending is balanced between savings, debt management, and investments."

    return profile, explanation


def generate_explanation(
    savings_ratio: float,
    debt_to_income: float,
    emergency_fund_months: float,
    investment_ratio: float,
    monthly_savings: float,
    monthly_income: float,
    score: float,
    category: str,
    biggest_weakness: str = ""
) -> str:
    sr  = round(savings_ratio * 100, 1)
    dti = round(debt_to_income * 100, 1)
    inv = round(investment_ratio * 100, 1)
    ef  = round(emergency_fund_months, 1)

    lines = [f"Your score is {score:.0f}/100 ({category})."]

    # Lead with biggest weakness
    if biggest_weakness:
        lines.append(f"Your biggest financial weakness is: {biggest_weakness}.")

    # Emergency fund — most critical
    if ef < 1:
        lines.append(f"CRITICAL: You have only {ef} months of emergency savings. This is the main reason your score is capped. Build this immediately.")
    elif ef < 3:
        lines.append(f"Your emergency fund covers {ef} months. You need at least 3 months. This is limiting your score.")

    # Savings
    if savings_ratio < 0.05:
        lines.append(f"You are saving only {sr}% of income after expenses and debt — critically low.")
    elif savings_ratio < 0.20:
        shortfall = round((0.20 - savings_ratio) * monthly_income)
        lines.append(f"Savings rate is {sr}%. Save ₹{shortfall:,} more/month to reach the 20% target.")
    else:
        lines.append(f"Savings rate of {sr}% is above the 20% benchmark.")

    # Debt
    if debt_to_income > 0.40:
        lines.append(f"Debt payments are {dti}% of income — dangerously high. Avoid new debt.")
    elif debt_to_income > 0.20:
        lines.append(f"Debt payments are {dti}% of income. Keep below 20%.")

    # Investment
    if investment_ratio == 0:
        lines.append("You are not investing. Start with even 5% of income once emergency fund is built.")
    elif inv < 5:
        lines.append(f"Investment rate is {inv}% — low. Aim for 10%.")

    return " ".join(lines)


@app.get("/")
def root():
    return {"message": "AI Service Running"}


@app.post("/insights")
def insights_endpoint(data: InsightTriggerRequest):
    return {"insights": generate_insights(data.model_dump())}


@app.post("/behavior")
def behavior_risk(data: UserMetrics):
    profile, explanation = risk_profile(data.model_dump())
    return {"risk_profile": profile, "explanation": explanation}


@app.post("/ai-insights")
def ai_insights(data: InsightRequest):
    # Use pre-computed values directly — no re-derivation
    metrics = {
        "savings_ratio":        data.savings_ratio,
        "debt_to_income":       data.debt_to_income,
        "investment_frequency": data.investment_ratio,
        "spending_stability":   data.spending_stability,
        "emergency_runway":     data.emergency_fund_months
    }
    profile, _ = risk_profile(metrics)
    explanation = generate_explanation(
        savings_ratio=data.savings_ratio,
        debt_to_income=data.debt_to_income,
        emergency_fund_months=data.emergency_fund_months,
        investment_ratio=data.investment_ratio,
        monthly_savings=data.monthly_savings,
        monthly_income=data.monthly_income,
        score=data.score,
        category=data.category,
        biggest_weakness=data.biggest_weakness
    )
    return {
        "score":       data.score,
        "category":    data.category,
        "riskProfile": profile,
        "explanation": explanation
    }


class PortfolioSuggestRequest(BaseModel):
    riskProfile: str
    investmentAmount: float
    recommendedAssets: dict
    emergencyFundMonths: float = 0
    debtToIncome: float = 0
    savingsRatio: float = 0
    monthlySavings: float = 0
    monthlyExpenses: float = 0


ASSET_RETURNS = {"equity": 0.12, "debt": 0.07, "gold": 0.08, "cash": 0.04}


def fmt_ef(months: float) -> str:
    """Consistent 1-decimal EF display — never shows 0.0 for real data."""
    if months <= 0:
        return "0.0"
    if months < 0.1:
        return "0.1"
    return f"{months:.1f}"


@app.post("/portfolio/ai-suggest")
def portfolio_ai_suggest(data: PortfolioSuggestRequest):
    profile  = data.riskProfile
    assets   = data.recommendedAssets
    total    = sum(assets.values()) or 1
    ef       = data.emergencyFundMonths   # float, may be 0.0 or very small
    dti      = data.debtToIncome
    sr       = data.savingsRatio
    ms       = data.monthlySavings
    me       = data.monthlyExpenses

    alloc_pct  = {k: round((v / total) * 100, 1) for k, v in assets.items()}
    equity_pct = alloc_pct.get("equity", 0)
    cash_pct   = alloc_pct.get("cash", 0)

    weighted_return     = sum((v / total) * ASSET_RETURNS.get(k, 0.05) for k, v in assets.items())
    expected_return_pct = round(weighted_return * 100, 1)

    next_action       = None
    timeline          = None
    rebalance_trigger = None
    adjustments       = {}

    # ── HARD GATE: EF < 3 months blocks ALL equity/rebalance recommendations
    # This is the most important financial safety rule — no exceptions
    ef_safe = ef >= 3.0

    if not ef_safe:
        # EF is the only priority — do not mention equity at all
        ef_str = fmt_ef(ef)

        if me > 0:
            ef_target  = me * 3
            ef_current = ef * me
            ef_gap     = max(0.0, ef_target - ef_current)

            if ms > 0:
                months_needed = max(1, -(-ef_gap // ms))  # ceiling division without math.ceil
                months_needed = int(months_needed)
                timeline = f"~{months_needed} month{'s' if months_needed != 1 else ''} at ₹{int(ms):,}/month savings"
            else:
                timeline = "Increase your monthly savings to start building this fund"

            next_action = (
                f"Your emergency fund is at {ef_str} months — below the 3-month minimum. "
                f"Target: ₹{int(ef_target):,} (3 × ₹{int(me):,}/month expenses). "
                f"Gap remaining: ₹{int(ef_gap):,}. "
                f"Direct all extra savings here before making any portfolio changes."
            )
        else:
            # No expense data — still block equity advice, give actionable guidance
            timeline = "Add your monthly expense data to get a precise timeline"
            next_action = (
                f"Your emergency fund is at {ef_str} months — below the 3-month minimum. "
                f"Build 3 months of expenses as a cash safety net before adjusting your portfolio. "
                f"Do not increase equity exposure until this is achieved."
            )

        # Rebalance trigger: only tell them WHEN it becomes safe, not HOW to shift
        rebalance_trigger = (
            f"Once your emergency fund reaches 3 months, return here for a rebalance recommendation. "
            f"At that point, the extra cash in your portfolio can be gradually shifted to equity."
        )

    elif dti > 0.30:
        # EF is safe, but debt is high — block equity increase, focus on debt
        excess_pct = round((dti - 0.20) * 100, 1)
        next_action = (
            f"Emergency fund is stable ({fmt_ef(ef)} months). "
            f"Now focus on reducing debt-to-income from {round(dti * 100, 1)}% to below 20%. "
            f"You are paying {excess_pct}% of income above the safe limit. "
            f"Make extra payments on your highest-interest debt."
        )
        timeline = "Ongoing — track monthly until DTI drops below 20%"
        rebalance_trigger = (
            f"Once DTI is below 20%, increase equity from {int(equity_pct)}% "
            f"toward the standard {profile} allocation."
        )

    elif equity_pct < {"Conservative": 20, "Moderate": 55, "Aggressive": 75}.get(profile, 55):
        # EF safe, debt safe — now it is appropriate to suggest equity increase
        base_eq = {"Conservative": 20, "Moderate": 55, "Aggressive": 75}.get(profile, 55)
        gap     = base_eq - int(equity_pct)
        shift   = min(5, gap)
        shift_amount = int(shift / 100 * total)
        adjustments["equity"] = round(assets.get("equity", 0) + (shift / 100) * total, 2)
        adjustments["cash"]   = round(max(0, assets.get("cash", 0) - (shift / 100) * total), 2)
        next_action = (
            f"Your financial foundation is stable (EF: {fmt_ef(ef)} months, DTI: {round(dti * 100, 1)}%). "
            f"Increase equity by {shift}% (from {int(equity_pct)}% toward {base_eq}%) "
            f"to improve long-term growth potential."
        )
        timeline = f"Rebalance now — shift ₹{shift_amount:,} from cash to equity"
        rebalance_trigger = f"Continue increasing equity by 2–3% every 6 months until reaching {base_eq}%."

    else:
        # All metrics healthy — maintain and monitor
        next_action = (
            f"Your {profile} portfolio is well-positioned. "
            f"Emergency fund: {fmt_ef(ef)} months ✓. DTI: {round(dti * 100, 1)}% ✓. "
            f"Weighted expected return: ~{expected_return_pct}% annually. "
            f"No immediate changes needed."
        )
        timeline = "Review in 6–12 months"
        rebalance_trigger = "Rebalance if any asset class drifts more than 5% from its target."

    return {
        "nextAction":             next_action,
        "timeline":               timeline,
        "rebalanceTrigger":       rebalance_trigger,
        "suggestedAdjustment":    adjustments,
        "weightedExpectedReturn": expected_return_pct,
        "allocationPercentages":  alloc_pct,
        "efSafe":                 ef_safe
    }


@app.post("/api/ai/behavior")
def analyze_behavior(data: FinancialSummary):
    if data.status == "Risky":
        advice = "Your financial condition is risky due to high debt. Focus on reducing liabilities."
    elif data.status == "Weak":
        advice = "Start investing to grow your wealth. Savings alone is not enough."
    elif data.status == "Good":
        advice = "You are doing well. Try increasing your investments for long-term growth."
    elif data.status == "Excellent":
        advice = "Excellent financial health. Consider diversifying your investments further."
    else:
        advice = "Balance your savings, debt, and investments to improve financial health."

    return {"advice": advice, "status": data.status, "score": data.score}
