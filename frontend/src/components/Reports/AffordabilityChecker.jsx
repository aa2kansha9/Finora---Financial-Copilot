import { useState } from "react";
import api from "../../services/api";
import useDashboard from "../../services/useDashboard";
import PageShell, { C, Card, SectionLabel, PrimaryBtn, FInput } from "../Dashboard/PageShell.jsx";

const GRADE = {
  A: { color: C.good, bg: `${C.good}0f`, border: `${C.good}44`, label: "Easily Affordable"  },
  B: { color: C.good, bg: `${C.good}0f`, border: `${C.good}44`, label: "Affordable"          },
  C: { color: C.warn, bg: `${C.warn}0f`, border: `${C.warn}44`, label: "Plan Carefully"      },
  D: { color: C.warn, bg: `${C.warn}0f`, border: `${C.warn}44`, label: "Risky"               },
  F: { color: C.bad,  bg: `${C.bad}0f`,  border: `${C.bad}44`,  label: "Not Recommended"     },
};

const fmtRs = (n) => `₹${Number(n).toLocaleString()}`;

export default function AffordabilityChecker() {
  const { data, loading, error } = useDashboard();
  const [form, setForm]     = useState({ itemName: "", itemCost: "", itemType: "depreciating" });
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const health  = data?.financialHealth;
  const hasData = health?.dataState === "complete";
  const metrics = health?.metrics ?? {};

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!hasData) return;
    setChecking(true); setResult(null);
    try {
      const { data: res } = await api.post("/reports/afford", { itemName: form.itemName, itemCost: Number(form.itemCost), itemType: form.itemType });
      
      const cleanedResult = {
        ...res,
        presentVerdict: res.presentVerdict?.replace(/[^\w\s\d.,!?:;()-]/g, '') || res.presentVerdict,
        futureVerdict: res.futureVerdict?.replace(/[^\w\s\d.,!?:;()-]/g, '') || res.futureVerdict,
        advice: res.advice?.replace(/[^\w\s\d.,!?:;()-]/g, '') || res.advice,
        typeNote: res.typeNote?.replace(/[^\w\s\d.,!?:;()-]/g, '') || res.typeNote,
        safeToSpendNote: res.safeToSpendNote?.replace(/[^\w\s\d.,!?:;()-]/g, '') || res.safeToSpendNote,
      };
      
      setResult(cleanedResult);
    } catch (err) { 
      alert(err.response?.data?.message || "Failed to check affordability."); 
    }
    finally { setChecking(false); }
  };

  if (loading) return <PageShell title="Can I Afford This?"><p style={{ color: C.beige }}>Loading...</p></PageShell>;
  if (error)   return <PageShell title="Can I Afford This?"><Card><p style={{ color: C.bad }}>{error}</p></Card></PageShell>;
  if (!hasData) return (
    <PageShell title="Can I Afford This?">
      <Card style={{ textAlign: "center", padding: "2.5rem" }}>
        <p style={{ color: C.beige }}>{health?.dataState === "partial_data" ? "Income data required. Add your monthly income first." : "No financial data found. Add income and expenses first."}</p>
      </Card>
    </PageShell>
  );

  const cfg = result ? GRADE[result.grade] || GRADE.F : null;
  
  const isOneTimePlanned = result?.financials?.safeToSpend >= (result?.itemCost || 0);
  const usesLiquidSavings = result?.financials?.liquidSavings > 0 && (result?.itemCost || 0) <= result?.financials?.liquidSavings;
  const preservesEmergencyFund = (result?.financials?.emergencyMonthsAfterPurchase || 0) >= 3;

  return (
    <PageShell title="Can I Afford This?" subtitle="Get an honest affordability assessment based on your real financial data.">

      {/* Context bar - just beige text, no extra background */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", padding: "0.85rem 1.1rem", borderRadius: "10px", marginBottom: "1.25rem", border: `1px solid ${C.moss}44` }}>
        {[
          { label: "Income",         value: fmtRs(metrics.monthlyIncome) },
          { label: "Expenses",       value: fmtRs(metrics.monthlyExpenses) },
          { label: "Net savings",    value: fmtRs(metrics.monthlySavings) },
          { label: "Emergency Fund", value: metrics.emergencyFundProvided && metrics.emergencyFundMonths != null ? `${Number(metrics.emergencyFundMonths).toFixed(1)} months` : "No data" },
        ].map(item => (
          <div key={item.label} style={{ whiteSpace: "nowrap" }}>
            <span style={{ color: C.beige, fontSize: "0.8rem", opacity: 0.7 }}>{item.label}: </span>
            <strong style={{ color: C.beige, fontSize: "0.9rem" }}>{item.value}</strong>
          </div>
        ))}
      </div>

      {/* Form */}
      <Card style={{ marginBottom: "1.5rem" }}>
        <form onSubmit={handleCheck} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "2 1 200px" }}>
            <FInput label="Item Name" placeholder="e.g. iPhone 15, Laptop" value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} />
          </div>
          <div style={{ flex: "1 1 140px" }}>
            <FInput label="Cost (₹)" type="number" min="1" placeholder="e.g. 80000" value={form.itemCost} onChange={e => setForm({ ...form, itemCost: e.target.value })} required />
          </div>
          <div style={{ flex: "1 1 160px", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <label style={{ fontSize: "0.72rem", fontWeight: "600", color: C.beige, textTransform: "uppercase", letterSpacing: "0.4px", opacity: 0.7 }}>Type</label>
            <select value={form.itemType} onChange={e => setForm({ ...form, itemType: e.target.value })} style={{ padding: "0.7rem 1rem", borderRadius: "10px", border: `1.5px solid ${C.moss}44`, fontSize: "0.92rem", color: C.darkGreen, background: C.beige, fontFamily: "inherit" }}>
              <option value="depreciating">Depreciating (e.g., electronics, car)</option>
              <option value="asset">Asset (e.g., real estate, investments)</option>
              <option value="experience">Experience (e.g., travel, education)</option>
            </select>
          </div>
          <PrimaryBtn disabled={checking} style={{ flexShrink: 0, alignSelf: "flex-end" }}>{checking ? "Checking..." : "Check"}</PrimaryBtn>
        </form>
      </Card>

      {result && cfg && (
        <>
          {/* Grade card */}
          <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "12px", border: `2px solid ${cfg.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "1.8rem", color: cfg.color, flexShrink: 0 }}>{result.grade}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: "700", fontSize: "1.05rem", color: cfg.color, margin: 0 }}>{result.presentVerdict}</p>
                {result.futureVerdict && (
                  <p style={{ fontWeight: "600", fontSize: "0.9rem", color: cfg.color, margin: "0.3rem 0 0", opacity: 0.9 }}>{result.futureVerdict}</p>
                )}
                <p style={{ color: C.beige, lineHeight: 1.65, margin: "0.45rem 0 0", fontSize: "0.94rem" }}>{result.advice}</p>
              </div>
            </div>
            <p style={{ fontSize: "0.86rem", fontStyle: "italic", margin: 0, paddingTop: "0.75rem", borderTop: `1px solid ${cfg.color}33`, color: C.beige, lineHeight: 1.55, opacity: 0.7 }}>
              {form.itemType === "experience" 
                ? "Note: This is an experience purchase. Our analysis focuses on financial safety, not the intrinsic value."
                : result.typeNote}
            </p>
          </div>

          {/* Financial Snapshot */}
    {/* Financial Snapshot */}
{/* Financial Snapshot */}
<Card>
  <SectionLabel>Financial Snapshot</SectionLabel>
  <p style={{ color: C.darkGreen, fontSize: "0.8rem", margin: "0 0 1rem", opacity: 0.7 }}>
    Based on {result.financials.monthsOfData} month{result.financials.monthsOfData !== 1 ? "s" : ""} of data. 
    Monthly savings: {fmtRs(result.financials.monthlySavings)}
  </p>
  
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
    {[
      { label: "Monthly Income",    value: fmtRs(result.financials.monthlyIncome) },
      { label: "Monthly Expenses",  value: fmtRs(result.financials.monthlyExpenses) },
      { label: "Monthly Savings",   value: fmtRs(result.financials.monthlySavings) },
      { label: "Liquid Savings",    value: fmtRs(result.financials.liquidSavings) },
      { label: "Emergency Fund Target", value: fmtRs(result.financials.emergencyFundNeeded) },
      { label: "Available for Purchase", value: fmtRs(result.financials.safeToSpend) },
      {
        label: "Emergency Fund After Purchase",
        value: result.financials.emergencyMonthsAfterPurchase > 0 
          ? `${result.financials.emergencyMonthsAfterPurchase.toFixed(1)} months` 
          : result.financials.purchaseShortfall > 0 
            ? `Shortfall of ${fmtRs(result.financials.purchaseShortfall)}` 
            : "0 months",
      },
    ].map(s => (
      <div key={s.label} style={{ 
        background: `${C.beige}80`, 
        border: `1px solid ${C.moss}33`, 
        padding: "0.75rem", 
        borderRadius: "8px" 
      }}>
        <p style={{ color: C.darkGreen, fontSize: "0.7rem", margin: 0, textTransform: "uppercase", opacity: 0.6 }}>{s.label}</p>
        <p style={{ fontWeight: "700", fontSize: "0.95rem", margin: "0.25rem 0 0", color: C.darkGreen }}>{s.value}</p>
      </div>
    ))}
  </div>

  {/* Safe-to-spend note */}
  {result.safeToSpendNote && (
    <div style={{ marginTop: "1rem", background: `${C.beige}80`, border: `1px solid ${C.moss}33`, padding: "0.8rem 1rem", borderRadius: "8px", color: C.darkGreen, fontSize: "0.86rem", lineHeight: 1.65 }}>
      {result.safeToSpendNote}
    </div>
  )}

  {/* Months to save guidance */}
  {result.financials.monthsToSave && (
    <div style={{ marginTop: "1rem", background: `${C.beige}80`, border: `1px solid ${C.moss}33`, padding: "0.8rem 1rem", borderRadius: "8px", color: C.darkGreen, fontSize: "0.86rem", lineHeight: 1.55 }}>
      {result.grade === "C" && !isOneTimePlanned
        ? <>💡 Save for <strong style={{ color: C.darkGreen }}>{result.financials.monthsToSave} month{result.financials.monthsToSave > 1 ? "s" : ""}</strong> at {fmtRs(result.financials.monthlySavings)}/month</>
        : result.grade === "C" && isOneTimePlanned
        ? <>✅ You have sufficient savings today. Emergency fund: {result.financials.emergencyMonthsAfterPurchase.toFixed(1)} months</>
        : result.grade === "A" || result.grade === "B"
        ? <>✅ Affordable from monthly cash flow or savings</>
        : <>⚠️ Save for {result.financials.monthsToSave} month{result.financials.monthsToSave > 1 ? "s" : ""} or find cheaper option</>
      }
    </div>
  )}
  
  {/* Warning for borderline cases */}
  {result.grade === "C" && !preservesEmergencyFund && (
    <div style={{ marginTop: "1rem", background: `${C.bad}15`, border: `1px solid ${C.bad}44`, padding: "0.8rem 1rem", borderRadius: "8px", color: C.darkGreen, fontSize: "0.86rem", lineHeight: 1.55 }}>
      ⚠️ This purchase would reduce your emergency fund below 3 months. Consider waiting or a cheaper option.
    </div>
  )}
</Card>
        </>
      )}
    </PageShell>
  );
}