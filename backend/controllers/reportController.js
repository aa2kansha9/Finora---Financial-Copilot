const Income = require("../models/Income");
const Expense = require("../models/Expense");
const Debt = require("../models/Debt");
const Investment = require("../models/Investment");
const User = require("../models/User");

// ===== AFFORDABILITY CHECKER =====
const checkAffordability = async (req, res) => {
  try {
    const userId = req.user;
    const { itemName, itemCost, itemType = "depreciating" } = req.body;

    if (!itemCost || itemCost <= 0)
      return res.status(400).json({ message: "itemCost is required and must be positive" });

    const [incomes, expenses, debts, investments, userDoc] = await Promise.all([
      Income.find({ userId }),
      Expense.find({ userId }),
      Debt.find({ userId }),
      Investment.find({ userId }),
      User.findById(userId).select("emergencyFundBalance")
    ]);

    if (!incomes.length)
      return res.status(400).json({ message: "Add at least one income entry first (₹0 is allowed)." });

    const validIncomes = incomes.filter(i => {
      const d = new Date(i.date || i.createdAt);
      return !isNaN(d.getTime()) && d.getFullYear() >= 2000 && Number(i.amount) >= 0;
    });

    if (!validIncomes.length)
      return res.status(400).json({ message: "No valid dated income entries found." });

    const incomeMonthKeys = new Set(
      validIncomes.map(i => {
        const d = new Date(i.date || i.createdAt);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })
    );
    const monthsOfData = Math.max(1, incomeMonthKeys.size);
    const safe = (v) => Math.max(0, Number(v) || 0);

    const totalIncome   = validIncomes.reduce((a, i) => a + safe(i.amount), 0);
    const totalExpenses = expenses.reduce((a, e) => a + safe(e.amount), 0);
    const totalDebtPmt  = debts.reduce((a, d) => a + safe(d.monthlyPayment), 0);
    const totalInv      = investments.reduce((a, i) => a + safe(i.amount), 0);

    const monthlyIncome       = totalIncome / monthsOfData;
    const monthlyExpenses     = totalExpenses / monthsOfData;
    const monthlyDebtPayment  = totalDebtPmt;
    const monthlyInvestments  = totalInv / monthsOfData;
    const monthlyNetSavings   = monthlyIncome - monthlyExpenses - monthlyDebtPayment;
    const monthlyFreeCash     = monthlyNetSavings - monthlyInvestments;
    const monthlySavings      = Math.max(0, monthlyNetSavings);

    const efBal = userDoc?.emergencyFundBalance;
    const hasExplicitEF = efBal != null && !Number.isNaN(Number(efBal)) && Number(efBal) >= 0;

    const accumulationMonths = Math.min(monthsOfData, 12);
    const estimatedPool = Math.max(0, monthlyNetSavings) * accumulationMonths;
    const liquidSavings = hasExplicitEF ? Number(efBal) : estimatedPool;
    const liquidSavingsLabel = hasExplicitEF
      ? "emergency fund balance (from your profile)"
      : accumulationMonths > 1
        ? `estimated from net cash flow over ${accumulationMonths} months (add Emergency Fund Balance for accuracy)`
        : `estimated from this month’s net cash flow (add Emergency Fund Balance for accuracy)`;

    const emergencyFundNeeded    = monthlyExpenses * 3;
    const emergencyFundShortfall = Math.max(0, emergencyFundNeeded - liquidSavings);
    const safeToSpend            = Math.max(0, liquidSavings - emergencyFundNeeded);

    // â”€â”€ Precise timelines based on actual gap, not full item cost
    // shortfallToSafe: how much more savings needed to buy without touching EF
    const shortfallToSafe = Math.max(0, itemCost - safeToSpend);
    // monthsToSafe: months to accumulate shortfallToSafe at current savings rate
    const saveRate        = Math.max(0, monthlyNetSavings);
    const monthsToSafe    = saveRate > 0 && shortfallToSafe > 0
      ? Math.max(1, Math.ceil(shortfallToSafe / saveRate))
      : null;
    // shortfallFull: how much more needed beyond all liquid savings (grade F only)
    const shortfallFull   = Math.max(0, itemCost - liquidSavings);
    const monthsToFull    = saveRate > 0 && shortfallFull > 0
      ? Math.max(1, Math.ceil(shortfallFull / saveRate))
      : null;

    // â”€â”€ EF state after purchase
    const liquidAfterPurchase  = liquidSavings - itemCost;
    const efMonthsAfterDisplay = Math.max(0, +(monthlyExpenses > 0 ? liquidAfterPurchase / monthlyExpenses : 0).toFixed(1));
    const purchaseShortfall    = liquidAfterPurchase < 0 ? Math.abs(liquidAfterPurchase) : 0;

    // Current EF months before purchase â€” used to avoid contradictory messaging
    const currentEFMonths = monthlyExpenses > 0 ? liquidSavings / monthlyExpenses : 0;
    const efAlreadyMet    = currentEFMonths >= 3;

    // â”€â”€ Affordability tiers
    const affordableEasy        = itemCost <= saveRate * 0.5;
    const affordableNow         = itemCost <= saveRate;
    const affordableFromSurplus = itemCost <= safeToSpend;
    const affordableWithEFDip   = !affordableFromSurplus && efMonthsAfterDisplay >= 1;

    let grade, presentVerdict, futureVerdict, advice, safeToSpendNote;
    let showTimeBox = false;

    if (affordableEasy) {
      grade = "A";
      presentVerdict = "âœ… Affordable right now";
      futureVerdict  = null;
      advice = `₹${itemCost.toLocaleString()} is less than half your monthly net savings after expenses and debt (₹${Math.round(saveRate).toLocaleString()}/mo). You can buy this without major disruption.`;
      safeToSpendNote = null;

    } else if (affordableNow) {
      grade = "B";
      presentVerdict = "âœ… Affordable this month";
      futureVerdict  = null;
      advice = `₹${itemCost.toLocaleString()} fits within one month of net savings (₹${Math.round(saveRate).toLocaleString()}/mo).`;
      safeToSpendNote = null;

    } else if (affordableFromSurplus) {
      grade = "C";
      presentVerdict = "âŒ Not affordable from this month's cash flow";
      futureVerdict  = "âœ… Affordable from estimated liquid savings â€” emergency fund stays intact";
      advice = `Your estimated liquid savings (â‚¹${Math.round(liquidSavings).toLocaleString()}) cover â‚¹${itemCost.toLocaleString()} and still leave your â‚¹${Math.round(emergencyFundNeeded).toLocaleString()} emergency fund untouched.`;
      safeToSpendNote = null;
      showTimeBox = true; // "if not yet saved, takes N months"

    } else if (affordableWithEFDip) {
      grade = "D";
      presentVerdict = "âŒ Not affordable right now without reducing your emergency buffer";
      const efAfterDesc = efAlreadyMet
        ? `reduces your emergency buffer to ${efMonthsAfterDisplay} months (below the 3-month minimum)`
        : `reduces your already-limited emergency buffer to ${efMonthsAfterDisplay} months`;
      futureVerdict = `âš ï¸ Possible now, but ${efAfterDesc}`;
      // Precise: state exact drop and exact shortfall to reach safe level
      const safeShortfallRs = Math.round(shortfallToSafe);
      advice = efAlreadyMet
        ? `Buying today drops your emergency cover from ${currentEFMonths.toFixed(1)} to ${efMonthsAfterDisplay} months — ₹${Math.round((3 - efMonthsAfterDisplay) * monthlyExpenses).toLocaleString()} below the 3-month minimum. To buy safely, save ₹${safeShortfallRs.toLocaleString()} more${monthsToSafe ? ` (~${monthsToSafe} month${monthsToSafe !== 1 ? "s" : ""} at ₹${Math.round(saveRate).toLocaleString()}/mo net savings)` : ""}.`
        : `Buying today reduces your emergency cover to ${efMonthsAfterDisplay} months (â‚¹${Math.round(efMonthsAfterDisplay * monthlyExpenses).toLocaleString()}). Save â‚¹${safeShortfallRs.toLocaleString()} more${monthsToSafe ? ` (~${monthsToSafe} month${monthsToSafe !== 1 ? "s" : ""})` : ""} to buy without touching your emergency fund.`;
      safeToSpendNote = safeToSpend === 0
        ? emergencyFundShortfall > 0
          ? `â‚¹0 safe to spend: your estimated liquid savings (â‚¹${Math.round(liquidSavings).toLocaleString()}) are â‚¹${Math.round(emergencyFundShortfall).toLocaleString()} short of the 3-month emergency fund (â‚¹${Math.round(emergencyFundNeeded).toLocaleString()}).`
          : `â‚¹0 safe to spend: your entire liquid savings are needed to maintain your emergency fund.`
        : null;
      showTimeBox = false; // timeline already in advice for D

    } else {
      grade = "F";
      presentVerdict = "ðŸš¨ Not affordable right now";
      // Timeline in futureVerdict uses monthsToSafe (gap to safe level), not full cost
      futureVerdict = saveRate > 0 && monthsToSafe
        ? `⏳ Affordable in ~${monthsToSafe} month${monthsToSafe !== 1 ? "s" : ""} — save ₹${Math.round(saveRate).toLocaleString()}/mo net to reach safe purchase level`
        : saveRate > 0
        ? `⏳ Keep saving ₹${Math.round(saveRate).toLocaleString()}/mo net and revisit`
        : null;
      // Precise advice: state exact shortfall, avoid "wipe out" unless EF is truly zeroed
      const efZeroed = efMonthsAfterDisplay === 0;
      if (purchaseShortfall > 0) {
        advice = saveRate > 0
          ? `This costs ₹${Math.round(purchaseShortfall).toLocaleString()} more than your liquid pool (₹${Math.round(liquidSavings).toLocaleString()})${efZeroed ? ", which would leave your buffer at ₹0" : ", which would reduce cover below the 3-month minimum"}. You need ₹${Math.round(shortfallToSafe).toLocaleString()} more to buy safely.`
          : `This costs ₹${Math.round(purchaseShortfall).toLocaleString()} more than your liquid pool. No positive net savings after expenses and debt — reduce expenses or debt first.`;
      } else {
        advice = saveRate > 0
          ? `Your liquid pool covers the cost but would reduce emergency cover below the 3-month minimum. Save ₹${Math.round(shortfallToSafe).toLocaleString()} more to buy safely.`
          : `No net savings capacity after expenses and debt. Reduce outflows before large purchases.`;
      }
      safeToSpendNote = safeToSpend === 0
        ? emergencyFundShortfall > 0
          ? `â‚¹0 safe to spend: your estimated liquid savings (â‚¹${Math.round(liquidSavings).toLocaleString()}) are â‚¹${Math.round(emergencyFundShortfall).toLocaleString()} short of the 3-month emergency fund (â‚¹${Math.round(emergencyFundNeeded).toLocaleString()}).`
          : `â‚¹0 safe to spend: your entire liquid savings are needed to maintain your emergency fund.`
        : `Safe to spend = estimated liquid savings (â‚¹${Math.round(liquidSavings).toLocaleString()}) âˆ’ 3-month emergency fund (â‚¹${Math.round(emergencyFundNeeded).toLocaleString()}) = â‚¹${Math.round(safeToSpend).toLocaleString()}.`;
    }

    // â”€â”€ Type note â€” grade-aware with concrete liquidity risk for assets
    const typeNote = itemType === "asset"
      ? grade === "A" || grade === "B"
        ? `Asset purchase â€” you can afford this comfortably. Assets can retain or grow in value. Ensure it's liquid enough to sell quickly if you need emergency cash.`
        : grade === "C"
        ? `Asset purchase â€” you can cover the cost from savings, but doing so reduces your liquid buffer. If an emergency hits after buying, you may need to sell the asset quickly, possibly at an unfavourable price. Only proceed if you're confident in the asset's liquidity.`
        : `Asset purchase â€” even appreciating assets carry serious risk when your emergency buffer is low. A forced sale during an emergency could mean selling at a loss. Build your emergency fund first.`
      : itemType === "experience"
      ? grade === "A" || grade === "B"
        ? `Experience purchase â€” no net worth impact, but you can afford it without financial stress.`
        : `Experience purchase â€” experiences don't build net worth. With your current savings position, consider a less expensive option or wait until your buffer is stronger.`
      : grade === "A" || grade === "B"
        ? `Depreciating purchase â€” loses value over time, but you can absorb the cost easily.`
        : `Depreciating purchase â€” loses value immediately after purchase. At your current savings level, confirm this is a genuine need, not an impulse.`;

    res.json({
      itemName: itemName || "This item",
      itemCost,
      itemType,
      grade,
      presentVerdict,
      futureVerdict,
      advice,
      typeNote,
      safeToSpendNote,
      financials: {
        monthlyIncome:                +monthlyIncome.toFixed(2),
        monthlyExpenses:              +monthlyExpenses.toFixed(2),
        monthlyDebtPayment:           +monthlyDebtPayment.toFixed(2),
        monthlyInvestments:           +monthlyInvestments.toFixed(2),
        monthlyNetSavings:            +monthlyNetSavings.toFixed(2),
        monthlyFreeCash:              +monthlyFreeCash.toFixed(2),
        monthlySavings:               +monthlySavings.toFixed(2),
        monthsOfData,
        accumulationMonths,
        liquidSavingsLabel,
        liquidSavings:                +liquidSavings.toFixed(2),
        emergencyFundNeeded:          +emergencyFundNeeded.toFixed(2),
        emergencyFundShortfall:       +emergencyFundShortfall.toFixed(2),
        safeToSpend:                  +safeToSpend.toFixed(2),
        emergencyMonthsAfterPurchase: efMonthsAfterDisplay,
        purchaseShortfall:            +purchaseShortfall.toFixed(2),
        monthsToSave:                 showTimeBox ? monthsToSafe : null
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { checkAffordability };
