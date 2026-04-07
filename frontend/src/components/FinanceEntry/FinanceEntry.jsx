import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const C = {
  darkGreen: "#0A3323",
  moss:      "#839958",
  beige:     "#F7F4D5",
  rosy:      "#D3968C",
  white:     "#FFFFFF",
  muted:     "#8aab90",
};

const TABS = ["Income", "Expenses", "Debts", "Investments"];

const TAB_META = {
  Income:      { icon: "💰", color: "#4caf7d", endpoint: "/finance/income"     },
  Expenses:    { icon: "🧾", color: C.rosy,    endpoint: "/finance/expense"    },
  Debts:       { icon: "💳", color: "#d4a843", endpoint: "/finance/debt"       },
  Investments: { icon: "📈", color: C.moss,    endpoint: "/finance/investment" },
};

const emptyForms = {
  Income:      { amount: "", source: "", date: "" },
  Expenses:    { amount: "", category: "", date: "" },
  Debts:       { type: "", totalDebt: "", monthlyPayment: "", interestRate: "" },
  Investments: { assetType: "", amount: "", date: "" },
};

function FInput({ label, type = "text", placeholder, value, onChange, required, min, step }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      {label && <label style={fi.label}>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        step={step}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...fi.input,
          borderColor: focused ? C.moss : "rgba(131,153,88,0.25)",
          boxShadow:   focused ? `0 0 0 3px ${C.moss}28` : "none",
          outline:     "none",
        }}
      />
    </div>
  );
}

const fi = {
  label: { fontSize: "0.72rem", fontWeight: "600", color: C.muted, letterSpacing: "0.4px", textTransform: "uppercase" },
  input: { padding: "0.7rem 1rem", borderRadius: "10px", border: "1.5px solid rgba(131,153,88,0.25)", fontSize: "0.92rem", color: C.darkGreen, background: "rgba(247,244,213,0.65)", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box", fontFamily: "inherit", width: "100%" },
};

function ListItem({ item, tab, isEditing, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);

  const main = () => {
    if (tab === "Income")      return `₹${Number(item.amount).toLocaleString()} · ${item.source}`;
    if (tab === "Expenses")    return `₹${Number(item.amount).toLocaleString()} · ${item.category}`;
    if (tab === "Debts")       return `${item.type} · ₹${Number(item.totalDebt).toLocaleString()} total`;
    if (tab === "Investments") return `₹${Number(item.amount).toLocaleString()} · ${item.assetType}`;
  };
  const sub = () => {
    if (tab === "Debts") return `₹${Number(item.monthlyPayment).toLocaleString()}/mo · ${item.interestRate}% p.a.`;
    return item.date ? new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...li.row,
        background:  isEditing ? `${C.moss}22` : hovered ? "rgba(247,244,213,0.12)" : "rgba(247,244,213,0.06)",
        borderColor: isEditing ? C.moss : hovered ? `${C.moss}44` : "rgba(131,153,88,0.15)",
        transform:   hovered ? "translateX(3px)" : "none",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={li.main}>{main()}</p>
        <p style={li.sub}>{sub()}</p>
      </div>
      <div style={{ ...li.actions, opacity: hovered || isEditing ? 1 : 0.35 }}>
        <button onClick={onEdit}   style={li.editBtn}>✏️</button>
        <button onClick={onDelete} style={li.delBtn}>🗑️</button>
      </div>
    </div>
  );
}

const li = {
  row:     { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem", borderRadius: "10px", border: "1px solid rgba(131,153,88,0.15)", marginBottom: "0.5rem", transition: "background 0.2s, border-color 0.2s, transform 0.15s", cursor: "default" },
  main:    { fontWeight: "600", color: C.beige, fontSize: "0.88rem", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  sub:     { color: `${C.beige}66`, fontSize: "0.75rem", margin: "0.15rem 0 0" },
  actions: { display: "flex", gap: "0.4rem", flexShrink: 0, transition: "opacity 0.2s" },
  editBtn: { padding: "0.3rem 0.55rem", background: `${C.moss}22`, border: `1px solid ${C.moss}44`, color: C.moss, borderRadius: "7px", cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit" },
  delBtn:  { padding: "0.3rem 0.55rem", background: `${C.rosy}18`, border: `1px solid ${C.rosy}44`, color: C.rosy, borderRadius: "7px", cursor: "pointer", fontSize: "0.8rem", fontFamily: "inherit" },
};

export default function FinanceEntry() {
  const navigate = useNavigate();
  const [tab, setTab]         = useState("Income");
  const [data, setData]       = useState({ Income: [], Expenses: [], Debts: [], Investments: [] });
  const [form, setForm]       = useState(emptyForms["Income"]);
  const [editId, setEditId]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [efBalance, setEfBalance]   = useState("");
  const [efSaving, setEfSaving]     = useState(false);
  const [efMsg, setEfMsg]           = useState("");

  const fetchTab = async (t) => {
    try { const r = await api.get(TAB_META[t].endpoint); setData(p => ({ ...p, [t]: r.data })); } catch {}
  };

  useEffect(() => { TABS.forEach(fetchTab); }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/profile");
        if (data.emergencyFundBalance != null) setEfBalance(String(data.emergencyFundBalance));
        else setEfBalance("");
      } catch { /* ignore */ }
    })();
  }, []);

  const saveEmergencyFund = async () => {
    const raw = efBalance.trim();
    if (raw === "") {
      setEfSaving(true);
      setEfMsg("");
      try {
        await api.patch("/profile", { emergencyFundBalance: null });
        setEfMsg("Cleared.");
      } catch (e) { alert(e.response?.data?.message || "Could not save"); }
      finally { setEfSaving(false); setTimeout(() => setEfMsg(""), 2000); }
      return;
    }
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) {
      alert("Enter a valid number ≥ 0, or leave empty to clear.");
      return;
    }
    setEfSaving(true);
    setEfMsg("");
    try {
      await api.patch("/profile", { emergencyFundBalance: n });
      setEfMsg("Saved.");
    } catch (e) { alert(e.response?.data?.message || "Could not save"); }
    finally { setEfSaving(false); setTimeout(() => setEfMsg(""), 2500); }
  };

  const switchTab = (t) => { setTab(t); setForm(emptyForms[t]); setEditId(null); };

  const parseNonNeg = (raw, label) => {
    const n = Number(String(raw).trim());
    if (raw === "" || raw == null || Number.isNaN(n)) {
      alert(`Enter a valid number for ${label}.`);
      return null;
    }
    if (n < 0) {
      alert(`${label} cannot be negative.`);
      return null;
    }
    return n;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let payload = { ...form };

    if (tab === "Income") {
      const amt = parseNonNeg(form.amount, "Amount");
      if (amt === null) return;
      payload = { ...form, amount: amt };
    }
    if (tab === "Expenses") {
      const amt = parseNonNeg(form.amount, "Amount");
      if (amt === null) return;
      payload = { ...form, amount: amt };
    }
    if (tab === "Investments") {
      const amt = parseNonNeg(form.amount, "Amount");
      if (amt === null) return;
      payload = { ...form, amount: amt };
    }
    if (tab === "Debts") {
      const td = parseNonNeg(form.totalDebt, "Total debt");
      const mp = parseNonNeg(form.monthlyPayment, "Monthly payment");
      const ir = parseNonNeg(form.interestRate, "Interest rate");
      if (td === null || mp === null || ir === null) return;
      payload = { ...form, totalDebt: td, monthlyPayment: mp, interestRate: ir };
    }

    setSaving(true);
    try {
      let successMs = 2500;
      if (editId) {
        await api.patch(`${TAB_META[tab].endpoint}/${editId}`, payload);
        setSuccessMsg("Updated!");
      } else {
        const { data: created } = await api.post(TAB_META[tab].endpoint, payload);
        const note = created?.inputWarning ? ` ${created.inputWarning}` : "";
        if (created?.inputWarning) successMs = 6500;
        setSuccessMsg(`Added!${note}`);
      }
      setForm(emptyForms[tab]); setEditId(null); await fetchTab(tab);
      setTimeout(() => setSuccessMsg(""), successMs);
    } catch (err) { alert(err.response?.data?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    setEditId(item._id);
    if (tab === "Income")      setForm({ amount: item.amount, source: item.source, date: item.date?.slice(0,10) || "" });
    if (tab === "Expenses")    setForm({ amount: item.amount, category: item.category, date: item.date?.slice(0,10) || "" });
    if (tab === "Debts")       setForm({ type: item.type, totalDebt: item.totalDebt, monthlyPayment: item.monthlyPayment, interestRate: item.interestRate });
    if (tab === "Investments") setForm({ assetType: item.assetType, amount: item.amount, date: item.date?.slice(0,10) || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    await api.delete(`${TAB_META[tab].endpoint}/${id}`); await fetchTab(tab);
  };

  const f = (k, l, t = "text", p = "", extra = {}) => {
    const { min, step, digitsOnly } = extra;
    const onChange = (e) => {
      let v = e.target.value;
      if (digitsOnly) {
        if (v === "") { setForm({ ...form, [k]: "" }); return; }
        if (!/^\d+$/.test(v)) return;
      }
      setForm({ ...form, [k]: v });
    };
    return (
      <FInput
        key={k}
        label={l}
        type={t}
        placeholder={p}
        value={form[k] ?? ""}
        onChange={onChange}
        required={t !== "date"}
        min={min}
        step={step}
      />
    );
  };

  const renderForm = () => {
    if (tab === "Income")      return <>{f("amount","Amount","number","e.g. 50000 or 0", { min: "0", step: "1", digitsOnly: true })}{f("source","Source","text","e.g. Salary, Freelance")}{f("date","Date","date")}</>;
    if (tab === "Expenses")    return <>{f("amount","Amount","number","e.g. 8000", { min: "0", step: "1", digitsOnly: true })}{f("category","Category","text","e.g. Food, Rent")}{f("date","Date","date")}</>;
    if (tab === "Debts")       return <>{f("type","Debt Type","text","e.g. Home Loan")}{f("totalDebt","Total Debt","number","e.g. 500000", { min: "0", step: "1", digitsOnly: true })}{f("monthlyPayment","Monthly EMI","number","e.g. 12000", { min: "0", step: "1", digitsOnly: true })}{f("interestRate","Interest Rate %","number","e.g. 8.5", { min: "0", step: "0.01" })}</>;
    if (tab === "Investments") return <>{f("assetType","Asset Type","text","e.g. Mutual Fund")}{f("amount","Amount","number","e.g. 10000", { min: "0", step: "1", digitsOnly: true })}{f("date","Date","date")}</>;
  };

  const totals = {
    Income:      data.Income.reduce((a, i) => a + Number(i.amount), 0),
    Expenses:    data.Expenses.reduce((a, e) => a + Number(e.amount), 0),
    Debts:       data.Debts.reduce((a, d) => a + Number(d.totalDebt), 0),
    Investments: data.Investments.reduce((a, i) => a + Number(i.amount), 0),
  };

  const meta = TAB_META[tab];

  return (
    <div style={s.root}>

      {/* Top bar */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <button type="button" style={s.backBtn} onClick={() => navigate("/dashboard")}>Back</button>
          <div style={s.divider} />
          <div style={s.logo}>
            <div style={s.logoMark}>F</div>
            <span style={s.logoText}>Finora</span>
          </div>
        </div>
      </div>

      {/* Page header */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>My Financial Data</h1>
          <p style={s.pageSub}>Manage income, expenses, debts and investments. Health score updates automatically.</p>
        </div>
        <div style={s.pills}>
          {TABS.map(t => (
            <div key={t} style={s.pill}>
              <span>{TAB_META[t].icon}</span>
              <div>
                <p style={s.pillLabel}>{t}</p>
                <p style={{ ...s.pillValue, color: TAB_META[t].color }}>₹{totals[t].toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={s.content}>

        {/* Tabs */}
        <div style={s.tabBar}>
          {TABS.map(t => {
            const active = tab === t;
            return (
              <button key={t} onClick={() => switchTab(t)} style={{
                ...s.tabBtn,
                background:  active ? C.moss : "rgba(247,244,213,0.07)",
                color:       active ? C.darkGreen : `${C.beige}88`,
                borderColor: active ? C.moss : "rgba(131,153,88,0.2)",
                boxShadow:   active ? `0 4px 16px ${C.moss}44` : "none",
                transform:   active ? "translateY(-1px)" : "none",
                fontWeight:  active ? "700" : "500",
              }}>
                <span>{TAB_META[t].icon}</span>
                <span>{t}</span>
                <span style={{ ...s.tabCount, background: active ? `${C.darkGreen}33` : `${C.beige}15`, color: active ? C.darkGreen : `${C.beige}77` }}>
                  {data[t].length}
                </span>
              </button>
            );
          })}
        </div>

        <div style={s.efCard}>
          <div style={s.efHead}>
            <span style={{ fontSize: "1.25rem" }}>🛡️</span>
            <div>
              <p style={s.efTitle}>Emergency Fund Balance (₹)</p>
              <p style={s.efSub}>Used for emergency months on your dashboard. Leave empty if you prefer not to share — we will not estimate it.</p>
            </div>
          </div>
          <div style={s.efRow}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 150000 or leave empty"
              value={efBalance}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") { setEfBalance(""); return; }
                if (!/^\d+$/.test(v)) return;
                setEfBalance(v);
              }}
              style={s.efInput}
            />
            <button type="button" disabled={efSaving} onClick={saveEmergencyFund} style={{ ...s.efSaveBtn, opacity: efSaving ? 0.65 : 1, cursor: efSaving ? "wait" : "pointer" }}>
              {efSaving ? "Saving…" : "Save"}
            </button>
          </div>
          {efMsg && <p style={s.efMsg}>{efMsg}</p>}
        </div>

        {/* Two-column */}
        <div style={s.twoCol}>

          {/* Form */}
          <div style={s.formCard}>
            <div style={s.formHead}>
              <span style={{ fontSize: "1.3rem" }}>{meta.icon}</span>
              <div>
                <p style={s.formTitle}>{editId ? `Edit ${tab.slice(0,-1)}` : `Add ${tab.slice(0,-1)}`}</p>
                <p style={s.formSub}>{editId ? "Update the entry below" : `Record a new ${tab.toLowerCase().slice(0,-1)}`}</p>
              </div>
            </div>

            {successMsg && (
              <div style={s.success}>✅ {successMsg}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {renderForm()}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                <button type="submit" disabled={saving} style={s.submitBtn}>
                  {saving ? "Saving…" : editId ? "Update Entry" : `Add ${tab.slice(0,-1)}`}
                </button>
                {editId && (
                  <button type="button" onClick={() => { setEditId(null); setForm(emptyForms[tab]); }} style={s.cancelBtn}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List */}
          <div>
            <div style={s.listHead}>
              <span>{meta.icon} {tab}</span>
              <span style={s.listCount}>{data[tab].length} {data[tab].length === 1 ? "entry" : "entries"}</span>
            </div>

            {data[tab].length === 0 ? (
              <div style={s.empty}>
                <p style={{ fontSize: "2.2rem", margin: "0 0 0.5rem" }}>{meta.icon}</p>
                <p style={{ color: `${C.beige}66`, fontSize: "0.88rem" }}>No {tab.toLowerCase()} yet.</p>
                <p style={{ color: `${C.beige}44`, fontSize: "0.78rem", marginTop: "0.2rem" }}>Use the form to add your first entry.</p>
              </div>
            ) : (
              data[tab].map(item => (
                <ListItem
                  key={item._id}
                  item={item}
                  tab={tab}
                  isEditing={editId === item._id}
                  onEdit={() => handleEdit(item)}
                  onDelete={() => handleDelete(item._id)}
                />
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

const s = {
  root:       { minHeight: "100vh", background: C.darkGreen, fontFamily: "'Inter','Poppins',-apple-system,sans-serif", display: "flex", flexDirection: "column" },
  topBar:     { display: "flex", justifyContent: "flex-start", alignItems: "center", padding: "0 2.5rem", height: "56px", flexShrink: 0, borderBottom: `1px solid ${C.moss}22`, background: `${C.darkGreen}f0`, backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 50 },
  topLeft:    { display: "flex", alignItems: "center", gap: "1rem" },
  backBtn:    { background: "none", border: `1px solid ${C.moss}66`, color: `${C.beige}e8`, padding: "0.35rem 0.9rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.84rem", fontWeight: "600", fontFamily: "inherit" },
  divider:    { width: "1px", height: "20px", background: `${C.moss}44` },
  logo:       { display: "flex", alignItems: "center", gap: "0.5rem" },
  logoMark:   { width: "26px", height: "26px", borderRadius: "7px", background: C.moss, color: C.darkGreen, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.88rem" },
  logoText:   { fontSize: "1rem", fontWeight: "700", color: C.beige, letterSpacing: "-0.3px" },
  pageHeader: { padding: "2rem 2.5rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem", borderBottom: `1px solid ${C.moss}18` },
  pageTitle:  { fontSize: "1.8rem", fontWeight: "800", color: C.beige, margin: 0, letterSpacing: "-0.5px" },
  pageSub:    { fontSize: "0.84rem", color: `${C.beige}55`, marginTop: "0.3rem" },
  pills:      { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  pill:       { display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(247,244,213,0.06)", border: `1px solid ${C.moss}22`, borderRadius: "12px", padding: "0.6rem 1rem" },
  pillLabel:  { fontSize: "0.68rem", color: `${C.beige}55`, margin: 0, fontWeight: "500" },
  pillValue:  { fontSize: "0.92rem", fontWeight: "700", margin: 0 },
  content:    { padding: "1.5rem 2.5rem 3rem", flex: 1 },
  tabBar:     { display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  tabBtn:     { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 1.1rem", borderRadius: "10px", border: "1.5px solid", cursor: "pointer", fontSize: "0.88rem", fontFamily: "inherit", transition: "all 0.2s ease" },
  tabCount:   { padding: "0.1rem 0.45rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: "700" },
  efCard:     { marginBottom: "1.5rem", padding: "1.1rem 1.25rem", borderRadius: "14px", border: `1px solid ${C.moss}33`, background: "rgba(247,244,213,0.05)" },
  efHead:     { display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.85rem" },
  efTitle:    { margin: 0, fontSize: "0.95rem", fontWeight: "700", color: C.beige },
  efSub:      { margin: "0.25rem 0 0", fontSize: "0.72rem", color: `${C.beige}55`, lineHeight: 1.45 },
  efRow:      { display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" },
  efInput:    { flex: "1 1 200px", padding: "0.65rem 0.9rem", borderRadius: "10px", border: `1px solid ${C.moss}33`, background: "rgba(247,244,213,0.08)", color: C.beige, fontSize: "0.9rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  efSaveBtn:  { padding: "0.65rem 1.1rem", borderRadius: "10px", border: "none", background: C.moss, color: C.darkGreen, fontWeight: "700", fontFamily: "inherit", fontSize: "0.86rem" },
  efMsg:      { margin: "0.5rem 0 0", fontSize: "0.78rem", color: C.moss },
  twoCol:     { display: "grid", gridTemplateColumns: "380px 1fr", gap: "1.5rem", alignItems: "start" },
  formCard:   { background: "rgba(247,244,213,0.06)", border: `1px solid ${C.moss}22`, borderRadius: "16px", padding: "1.5rem", backdropFilter: "blur(4px)" },
  formHead:   { display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "1.25rem", paddingBottom: "1rem", borderBottom: `1px solid ${C.moss}18` },
  formTitle:  { fontSize: "1rem", fontWeight: "700", color: C.beige, margin: 0 },
  formSub:    { fontSize: "0.74rem", color: `${C.beige}44`, margin: "0.15rem 0 0" },
  success:    { display: "flex", alignItems: "center", gap: "0.5rem", background: `${C.moss}22`, border: `1px solid ${C.moss}44`, color: C.moss, padding: "0.6rem 0.9rem", borderRadius: "8px", marginBottom: "0.75rem", fontSize: "0.85rem" },
  submitBtn:  { flex: 1, padding: "0.75rem", background: C.moss, color: C.darkGreen, border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "0.92rem", fontWeight: "700", fontFamily: "inherit", transition: "background 0.2s" },
  cancelBtn:  { padding: "0.75rem 1rem", background: "rgba(247,244,213,0.08)", color: `${C.beige}77`, border: `1px solid ${C.moss}22`, borderRadius: "10px", cursor: "pointer", fontSize: "0.88rem", fontFamily: "inherit" },
  listHead:   { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: "700", color: `${C.beige}88`, marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.5px" },
  listCount:  { background: `${C.moss}22`, color: C.moss, padding: "0.1rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: "700" },
  empty:      { textAlign: "center", padding: "3rem 1rem", border: `1px dashed ${C.moss}2a`, borderRadius: "12px" },
};
