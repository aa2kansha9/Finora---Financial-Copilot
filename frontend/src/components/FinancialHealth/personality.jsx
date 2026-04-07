import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useDashboard from "../../services/useDashboard";

const C = { darkGreen: "#0A3323", moss: "#839958", beige: "#F7F4D5", rosy: "#D3968C", muted: "#8aab90" };

/** True only when the user saved an emergency fund balance (months are real, not inferred). */
const efKnown = (m) => m.emergencyFundProvided === true && m.emergencyFundMonths != null && Number.isFinite(m.emergencyFundMonths);

// ─────────────────────────────────────────────────────────────────────────────
// A. FINANCIAL PERSONALITY — 12 types, matched by real metric logic
//    Order matters: most specific conditions first, fallback last.
// ─────────────────────────────────────────────────────────────────────────────
const PERSONALITIES = [
  {
    id: "wealth_architect",
    name: "The Wealth Architect",
    desc: "You save more than 30% of your income, carry minimal debt, and invest consistently — a combination fewer than 5% of people actually achieve. Every financial decision you make is deliberate, structured, and pointed toward a long-term outcome. You don't react to money; you direct it. Your emergency fund is solid, your debt-to-income ratio is low, and your investment rate compounds quietly in the background. You've moved past financial survival and into financial construction — building something that will outlast your working years.",
    truth: "Architects who never break ground stay architects forever. At some point, the plan has to become the building.",
    match: ({ savingsRate, debtRatio, investmentRate }) =>
      savingsRate >= 0.3 && debtRatio < 0.2 && investmentRate >= 0.15,
  },
  {
    id: "strategic_investor",
    name: "The Strategic Investor",
    desc: "You allocate 15% or more of your income to investments, maintain a healthy emergency buffer, and keep debt at manageable levels — a profile that reflects genuine financial literacy in action. You understand that idle money loses value and that time in the market matters more than timing it. Your portfolio isn't an accident; it's a decision you revisit and refine. You've built the infrastructure for wealth creation, not just wealth storage. The gap between where you are and where you want to be is narrowing every month.",
    truth: "Strategy without execution is just a theory. Make sure your portfolio reflects your conviction, not just your intentions.",
    match: (m) =>
      m.investmentRate >= 0.15 && efKnown(m) && m.emergencyFundMonths >= 3 && m.debtRatio < 0.4,
  },
  {
    id: "stable_planner",
    name: "The Stable Planner",
    desc: "Your savings rate, debt load, emergency fund, and investment contributions all sit within healthy ranges — a balance that most people spend years trying to find. You don't have a single outstanding metric, but you don't have a glaring weakness either. Your financial life runs like a well-maintained system: no alarms, no crises, no scrambling at month-end. You've built consistency, and consistency is the foundation of every meaningful financial outcome. The next step isn't fixing something — it's accelerating what already works.",
    truth: "Stability is the foundation, not the destination. Don't let 'good enough' become the ceiling.",
    match: (m) =>
      m.savingsRate >= 0.2 && m.debtRatio < 0.35 && efKnown(m) && m.emergencyFundMonths >= 3 && m.investmentRate >= 0.05,
  },
  {
    id: "safety_builder",
    name: "The Safety Builder",
    desc: "You've built an emergency fund that covers five or more months of expenses — something most financial advisors recommend and most people never actually do. Your savings rate is strong, your debt is low, and your financial floor is solid enough to absorb real shocks without panic. You've prioritized security over speculation, and that's not a flaw — it's a foundation. The cushion you've built gives you options: the freedom to take calculated risks, change jobs, or weather unexpected events without financial collapse. Security is your superpower.",
    truth: "A fortress protects you — but it doesn't grow you. The safety net is ready. Now it's time to jump.",
    match: (m) =>
      efKnown(m) && m.emergencyFundMonths >= 5 && m.savingsRate >= 0.2 && m.debtRatio < 0.3,
  },
  {
    id: "silent_builder",
    name: "The Silent Builder",
    desc: "You save over 30% of your income, spend well below your means, and carry almost no debt — not because you're depriving yourself, but because accumulation is simply how you operate. You don't announce financial goals; you execute them. Your spending rate is under 50%, which means more than half of every rupee you earn is working for you in some form. You're not chasing lifestyle upgrades or keeping pace with anyone else's spending. You're building quietly, deliberately, and with a patience that most people can't sustain.",
    truth: "Discipline is rare. Direction is rarer. Make sure you know what you're building toward, not just that you're building.",
    match: ({ savingsRate, spendingRate, debtRatio }) =>
      savingsRate >= 0.3 && spendingRate < 0.5 && debtRatio < 0.25,
  },
  {
    id: "hoarder",
    name: "The Hoarder",
    desc: "You save diligently, maintain a strong emergency fund, and keep debt low — but your investment rate is near zero, which means your money is accumulating without growing. You've mastered the discipline of not spending, but haven't yet made the transition to putting that capital to work. Every month that passes without investing is a month of compounding you'll never recover. Your savings are safe, organized, and losing real value to inflation in slow motion. The hard part — spending less — you've already solved. The next step is simply letting your money do something.",
    truth: "Saving without investing is just slow inflation. Your discipline is real — your returns are not.",
    match: (m) =>
      m.savingsRate >= 0.25 && efKnown(m) && m.emergencyFundMonths >= 4 && m.investmentRate < 0.03,
  },
  {
    id: "lifestyle_inflator",
    name: "The Lifestyle Inflator",
    desc: "Your income is high, but your savings rate tells a different story — because every raise, bonus, or income bump has been absorbed by a proportionally larger lifestyle. Better apartment, better car, better everything — and somehow the savings number barely moves. You're not struggling; you're spending at the ceiling of what you earn, which leaves no margin for wealth creation. The income is there. The discipline to separate income from lifestyle is what's missing. Without that separation, high earnings and low net worth can coexist indefinitely.",
    truth: "Lifestyle inflation is the quietest wealth killer. You earn more every year and somehow save the same.",
    match: ({ income, spendingRate, savingsRate }) =>
      income >= 50000 && spendingRate >= 0.65 && savingsRate < 0.15,
  },
  {
    id: "yolo_investor",
    name: "The YOLO Investor",
    desc: "You invest aggressively — 15% or more of your income — but your emergency fund is under two months and your savings buffer is thin. You're betting on the market while leaving yourself exposed to any disruption that doesn't come with advance notice. A job loss, a medical bill, a broken lease — any of these could force you to liquidate investments at the worst possible time. Your conviction in the market is real, but conviction doesn't pay rent during a bad month. The portfolio is impressive; the foundation beneath it is not.",
    truth: "Conviction is not a safety net. One bad month can unwind years of gains if there's nothing to fall back on.",
    match: (m) =>
      m.investmentRate >= 0.15 && efKnown(m) && m.emergencyFundMonths < 2 && m.savingsRate < 0.15,
  },
  {
    id: "debt_fighter",
    name: "The Debt Fighter",
    desc: "Your debt-to-income ratio is above 50%, which means a significant portion of every rupee you earn is already spoken for before you decide how to spend it. Every month is a negotiation between obligations and intentions — between what you owe and what you want to build. This isn't a character flaw; it's a structural constraint that compounds over time if left unaddressed. The interest you're paying is the most expensive line item in your budget, even if it doesn't feel that way. Every payment reduces the chain. The direction is right — the pace is what matters now.",
    truth: "You're not broke — you're borrowed. The chains are real, but every payment is a link removed.",
    match: ({ debtRatio }) => debtRatio >= 0.5,
  },
  {
    id: "survival_juggler",
    name: "The Survival Juggler",
    desc: "Low income, high debt relative to earnings, and minimal savings — you're managing a financial situation that requires real skill just to keep stable. The plates are spinning, and you're the one keeping them in the air. There's no slack in the system: one unexpected expense can cascade into a crisis because there's no buffer to absorb it. This isn't about discipline or effort — you're working with a margin that doesn't allow for mistakes. The goal right now isn't optimization; it's creating even a small amount of breathing room so the juggling act becomes less fragile.",
    truth: "Survival mode is not a strategy. The juggling act buys time — use it to build one thing that doesn't need juggling.",
    match: ({ income, debtRatio, savingsRate }) =>
      income < 30000 && debtRatio >= 0.4 && savingsRate < 0.1,
  },
  {
    id: "chaos_spender",
    name: "The Chaos Spender",
    desc: "Your savings rate is under 5%, your spending consumes 70% or more of your income, and your emergency fund is essentially empty — which means you're one bad month away from a financial crisis at any given time. Money arrives and disappears without a clear accounting of where it went. There's no system, no buffer, and no margin for error. This isn't about income level — it's about the absence of structure. The spending isn't intentional; it's reactive. And reactive spending always costs more than planned spending. One number — a monthly savings target, however small — is where this changes.",
    truth: "Chaos isn't a personality — it's a pattern. And patterns can be broken. Start with one number: your monthly savings target.",
    match: (m) =>
      m.savingsRate < 0.05 && m.spendingRate >= 0.7 && efKnown(m) && m.emergencyFundMonths < 1,
  },
  {
    id: "starter",
    name: "The Starter",
    desc: "You're early in the financial journey — income is modest, savings are small, and investments haven't meaningfully begun yet. The numbers don't look impressive right now, and that's completely normal for this stage. What matters at this point isn't the size of the balance; it's whether the habits are forming. Every person who has ever built real financial security started from exactly this position. The gap between where you are and where you want to be isn't closed by a single decision — it's closed by a hundred small, consistent ones made over time.",
    truth: "Everyone who's ever built wealth started exactly here. The gap between you and them is not talent — it's time and consistency.",
    match: () => true,
  },
];

export function derivePersonality({ income, expenses, savings, debt, emergencyFundMonths, emergencyFundProvided, investments = 0 }) {
  if (!income || income <= 0) return PERSONALITIES.find(p => p.id === "starter");
  const m = {
    income,
    savingsRate:         savings / income,
    spendingRate:        expenses / income,
    debtRatio:           debt / income,
    investmentRate:      investments / income,
    emergencyFundMonths: emergencyFundProvided === true ? emergencyFundMonths : null,
    emergencyFundProvided: emergencyFundProvided === true,
  };
  return PERSONALITIES.find(p => p.match(m));
}

// ─────────────────────────────────────────────────────────────────────────────
// B. TAROT READING — dynamic, data-driven, humorous prediction
//    Generated from actual metrics. NOT a personality. NOT one of the 12 types.
//    Rules: funny not insulting, slightly dramatic, indirect criticism only.
// ─────────────────────────────────────────────────────────────────────────────
function generateTarotReading({ savingsRate, spendingRate, debtRatio, investmentRate, emergencyFundMonths, emergencyFundProvided, income }) {
  const efOk = emergencyFundProvided === true && emergencyFundMonths != null;
  if (savingsRate >= 0.3 && debtRatio < 0.2 && efOk && emergencyFundMonths >= 4 && investmentRate >= 0.1)
    return "The crystal ball is genuinely confused — it has never seen someone this financially responsible and had to reboot twice. Your savings are strong, your debt is basically a rumour, and your investments are quietly compounding while you sleep. The spirits are impressed. Slightly annoyed, but impressed. Please continue being this person.";

  if (debtRatio >= 0.6 && savingsRate < 0.1)
    return "The cards see debt. A lot of it. They tried to count it but ran out of fingers, then toes, then asked a friend. Your future self is not panicking — but they are sitting very still and breathing very carefully. The good news: every rupee paid back is a link in the chain removed. The bad news: there are quite a few links.";

  if (spendingRate >= 0.75)
    return "The crystal ball watched your money leave your account and genuinely could not keep up. It filed a complaint. Your spending has the energy of someone who believes tomorrow will sort itself out — and to be fair, tomorrow has been very patient so far. The spirits suggest a budget. The spirits have been suggesting a budget for a while now.";

  if (savingsRate < 0.05)
    return "Your future self tried to send a message. It bounced. Insufficient funds. They tried again from a library computer and the message simply read: please. The crystal ball sees potential everywhere — it just also sees it evaporating at the end of every month before it can be captured. One savings target. That is all it takes to start.";

  if (efOk && emergencyFundMonths < 1)
    return "The stars see no emergency fund, and they are sweating on your behalf. You are one unexpected bill, one broken phone, one surprise medical visit away from a very dramatic plot twist. The crystal ball is not saying disaster is coming — it is saying disaster does not make appointments. A small buffer would let everyone, including the stars, breathe a little easier.";

  if (investmentRate === 0 && savingsRate >= 0.2)
    return "You save beautifully and consistently, which is genuinely rare and worth acknowledging. However, your money is currently sitting in an account, aging like milk, quietly losing value to inflation while the market does interesting things without it. The crystal ball sees discipline without direction. The seeds are there. Someone just needs to plant them.";

  if (debtRatio >= 0.5 && savingsRate >= 0.15)
    return "The cards see a tug of war happening in your finances — debt pulling hard on one side, savings pushing back on the other. The crowd is watching. Nobody is winning yet, but the fact that you are saving at all while carrying this much debt means you are not losing either. The outcome depends entirely on which side gets fed more this year.";

  if (income >= 60000 && savingsRate < 0.12)
    return "Good income. Mysteriously disappearing money. The crystal ball has reviewed the evidence and suspects online shopping between 11pm and 2am, but cannot confirm. What it can confirm is that earning well and saving poorly is a very common and very expensive habit. The gap between your income and your savings rate is where wealth was supposed to live.";

  if (efOk && emergencyFundMonths < 2 && investmentRate >= 0.15)
    return "Investing aggressively with almost no safety net — bold, chaotic, and the financial equivalent of texting while skydiving. The portfolio looks great right now, and the crystal ball genuinely respects the conviction. But one bad month, one job hiccup, one surprise expense, and you may be forced to sell at exactly the wrong time. Build the floor before decorating the ceiling.";

  if (savingsRate >= 0.15 && savingsRate < 0.25 && spendingRate < 0.65 && debtRatio < 0.35)
    return "Solid. Steady. Quietly doing the right things without making a fuss about it. The crystal ball gives you a polite nod and a thumbs up — not the dramatic reading you were hoping for, but honestly, boring finances are a flex. You are not in crisis, you are not coasting dangerously, and with a small push you could be genuinely ahead. The wheel is turning. Keep turning it.";

  if (savingsRate >= 0.35 && debtRatio < 0.15)
    return "The cosmos sees a person who has quietly, methodically gotten their financial life together — and it is suspicious. Nobody does this without a plan. Your savings rate is high, your debt is low, and your future is being constructed brick by brick while everyone else is still arguing about the blueprint. The crystal ball tips its hat. Reluctantly. It does not tip its hat often.";

  return "The crystal ball stared into your finances for a long time, went quiet, then asked for a glass of water and a moment to collect itself. The picture is not catastrophic — but it is complicated in ways that deserve attention. There is potential here, genuinely, surrounded by a suspicious number of missed opportunities. The mist is clearing. The next move is yours.";
}

// ─────────────────────────────────────────────────────────────────────────────
// C. ACTIONABLE SUGGESTIONS — 1–2 based on weakest metrics
// ─────────────────────────────────────────────────────────────────────────────
const ALL_ACTIONS = [
  {
    key: "ef",
    label: "Build your emergency fund",
    detail: "Aim for at least 3 months of expenses in a liquid account.",
    test: (m) => efKnown(m) && m.emergencyFundMonths < 3,
    priority: (m) => (efKnown(m) && m.emergencyFundMonths < 1 ? 0 : 1),
  },
  {
    key: "debt",
    label: "Pay down high-interest debt",
    detail: "Debt above 40% of income is a drag on every other financial goal.",
    test: ({ debtRatio }) => debtRatio >= 0.4,
    priority: ({ debtRatio }) => debtRatio >= 0.6 ? 0 : 2,
  },
  {
    key: "spend",
    label: "Reduce discretionary spending",
    detail: "Cutting spending rate below 60% frees up capital for savings and investments.",
    test: ({ spendingRate }) => spendingRate >= 0.65,
    priority: ({ spendingRate }) => spendingRate >= 0.8 ? 1 : 3,
  },
  {
    key: "invest",
    label: "Start investing consistently",
    detail: "Even 5–10% of income invested monthly compounds significantly over time.",
    test: ({ investmentRate }) => investmentRate < 0.05,
    priority: () => 4,
  },
  {
    key: "savings",
    label: "Increase your savings rate",
    detail: "Target 20%+ savings rate. Automate it so it happens before you can spend it.",
    test: ({ savingsRate }) => savingsRate < 0.15,
    priority: ({ savingsRate }) => savingsRate < 0.05 ? 1 : 3,
  },
];

function generateActions(metrics) {
  return ALL_ACTIONS
    .filter(a => a.test(metrics))
    .sort((a, b) => a.priority(metrics) - b.priority(metrics))
    .slice(0, 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Stars — generated once, stable across renders
// ─────────────────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 70 }, (_, i) => ({
  id:    i,
  top:   `${(i * 137.5) % 100}%`,
  left:  `${(i * 97.3)  % 100}%`,
  size:  `${1 + (i % 3) * 0.8}px`,
  delay: `${((i * 0.37) % 4).toFixed(2)}s`,
  dur:   `${(2.5 + (i % 4) * 0.6).toFixed(2)}s`,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Animated loading dots
// ─────────────────────────────────────────────────────────────────────────────
function LoadingDots() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCount(c => (c + 1) % 4), 500);
    return () => clearInterval(t);
  }, []);
  return <span>{"." .repeat(count)}<span style={{ opacity: 0 }}>{"." .repeat(3 - count)}</span></span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TarotScreen — full experience: curtain in → loading → result → curtain out
//
// Phase flow:
//   "curtain-in"  → panels slide FROM edges TO center, meeting in middle (0.6s)
//   "open"        → curtains retract, tarot UI fades in, 5s loading countdown
//   "result"      → prediction + actions animate in
//   "curtain-out" → curtains close again (0.6s), then onExit fires
// ─────────────────────────────────────────────────────────────────────────────
function TarotScreen({ tarotText, actions, onExit }) {
  const [phase, setPhase]         = useState("curtain-in");
  const [retHovered, setRetHovered] = useState(false);

  useEffect(() => {
    if (phase === "curtain-in")  { const t = setTimeout(() => setPhase("open"),   650);  return () => clearTimeout(t); }
    if (phase === "open")        { const t = setTimeout(() => setPhase("result"), 5000); return () => clearTimeout(t); }
    if (phase === "curtain-out") { const t = setTimeout(onExit,                   650);  return () => clearTimeout(t); }
  }, [phase, onExit]);

  // Curtain panels:
  //   curtain-in  → start at edges (translateX ±100%), animate TO center (translateX 0)
  //   open/result → panels hidden off-screen (translateX ±100%), no transition
  //   curtain-out → animate FROM center (translateX 0) BACK to edges (translateX ±100%)
  const leftStyle = {
    ...t.curtainLeft,
    transform:  phase === "open" || phase === "result" ? "translateX(-100%)" : "translateX(0)",
    transition: phase === "open" || phase === "result" ? "none" : "transform 0.6s ease-in-out",
  };
  const rightStyle = {
    ...t.curtainRight,
    transform:  phase === "open" || phase === "result" ? "translateX(100%)" : "translateX(0)",
    transition: phase === "open" || phase === "result" ? "none" : "transform 0.6s ease-in-out",
  };

  return (
    <div style={t.root}>
      <style>{`
        @keyframes starTwinkle  { 0%,100%{opacity:.1}  50%{opacity:.85} }
        @keyframes ballFloat    { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-12px)} }
        @keyframes ballPulse    { 0%,100%{box-shadow:0 0 28px #a78bfa77,0 0 56px #7c3aed33} 50%{box-shadow:0 0 52px #a78bfacc,0 0 96px #7c3aed66} }
        @keyframes ringPulse    { 0%,100%{transform:translate(-50%,-50%) scale(1);   opacity:.5} 50%{transform:translate(-50%,-50%) scale(1.18); opacity:.9} }
        @keyframes ballRotate   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes contentFadeIn{ from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes resultIn     { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes textFade     { 0%,100%{opacity:0.45} 50%{opacity:1} }
      `}</style>

      {/* Dark purple background */}
      <div style={t.bg} />

      {/* Stars */}
      {STARS.map(st => (
        <div key={st.id} style={{
          position: "absolute", borderRadius: "50%", background: "#e9d5ff",
          width: st.size, height: st.size, top: st.top, left: st.left,
          animation: `starTwinkle ${st.dur} ${st.delay} ease-in-out infinite`,
          pointerEvents: "none", zIndex: 1,
        }} />
      ))}

      {/* Content — fades in after curtain opens */}
      {(phase === "open" || phase === "result") && (
        <div style={t.content}>
          {/* Magic ball GIF */}
          <div style={t.imgPlaceholder}>
            <img src="/video-from-rawpixel-id-17069964-gif.gif" alt="Magic Ball" style={t.gifImg}
              onError={e => { e.target.style.display="none"; }}
            />
          </div>

          {/* Loading text with animated dots */}
          {phase === "open" && (
            <p style={t.loadingText}>
              Analyzing your financial future<LoadingDots />
            </p>
          )}

          {/* Result — revealed after 5s */}
          {phase === "result" && (
            <div style={t.resultWrap}>
              <p style={t.resultEyebrow}>Your Financial Fate</p>
              <p style={t.resultText}>{tarotText}</p>

              {actions.length > 0 && (
                <div style={t.actionsBox}>
                  <p style={t.actionsTitle}>Change Your Fate</p>
                  {actions.map(a => (
                    <div key={a.key} style={t.actionRow}>
                      <div style={t.actionDot} />
                      <div>
                        <p style={t.actionLabel}>{a.label}</p>
                        <p style={t.actionDetail}>{a.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                style={{ ...t.returnBtn, ...(retHovered ? t.returnBtnHover : {}) }}
                onMouseEnter={() => setRetHovered(true)}
                onMouseLeave={() => setRetHovered(false)}
                onClick={() => setPhase("curtain-out")}
              >
                Return to Reality
              </button>
            </div>
          )}
        </div>
      )}

      {/* Curtain panels — z-index above content so they cover it during transitions */}
      <div style={leftStyle} />
      <div style={rightStyle} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function PersonalityPage() {
  const { data, loading } = useDashboard();
  const navigate             = useNavigate();
  const [showTarot, setShowTarot]   = useState(false);
  const [tarotText, setTarotText]   = useState("");
  const [actions,   setActions]     = useState([]);
  const [btnHovered,  setBtnHovered]  = useState(false);
  const [backHovered, setBackHovered] = useState(false);

  const m = data?.financialHealth?.metrics || {};

  const metrics = {
    income:              m.monthlyIncome       || 0,
    savingsRate:         m.monthlyIncome ? (m.monthlySavings     || 0) / m.monthlyIncome : 0,
    spendingRate:        m.monthlyIncome ? (m.monthlyExpenses    || 0) / m.monthlyIncome : 0,
    debtRatio:           m.monthlyIncome ? (m.totalDebt          || 0) / m.monthlyIncome : 0,
    investmentRate:      m.monthlyIncome ? (m.monthlyInvestments || 0) / m.monthlyIncome : 0,
    emergencyFundMonths: m.emergencyFundProvided === true ? m.emergencyFundMonths : null,
    emergencyFundProvided: m.emergencyFundProvided === true,
  };

  const personality = derivePersonality({
    income:              m.monthlyIncome       || 0,
    expenses:            m.monthlyExpenses     || 0,
    savings:             m.monthlySavings      || 0,
    debt:                m.totalDebt           || 0,
    emergencyFundMonths: m.emergencyFundMonths,
    emergencyFundProvided: m.emergencyFundProvided === true,
    investments:         m.monthlyInvestments  || 0,
  });

  const handleReveal = () => {
    setTarotText(generateTarotReading(metrics));
    setActions(generateActions(metrics));
    setShowTarot(true);
  };

  const handleExit = () => {
    setShowTarot(false);
    setTarotText("");
    setActions([]);
  };

  if (loading) return <div style={s.page}><div style={s.spinner} /></div>;

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (max-width: 700px) {
          .personality-card { flex-direction: column !important; }
          .personality-name { font-size: 1.4rem !important; text-align: center !important; }
          .personality-type { text-align: center !important; }
          .moss-bar { margin-left: auto !important; margin-right: auto !important; }
          .desc { text-align: center !important; }
          .insight-box { text-align: center !important; }
          .tarot-btn-wrap { display: flex !important; justify-content: center !important; }
        }
      `}</style>

      {/* A: Personality Screen — always static */}
      <div style={s.page}>

        {/* Back button — top-left, router-based */}
        <button
          style={{ ...s.backBtn, ...(backHovered ? s.backBtnHover : {}) }}
          onMouseEnter={() => setBackHovered(true)}
          onMouseLeave={() => setBackHovered(false)}
          onClick={() => navigate("/dashboard")}
        >
          ← Back
        </button>

        <div style={s.wrap} className="personality-wrap">
          <p style={s.pageLabel}>Your Financial Personality</p>

          <div style={s.row} className="personality-card">
            {/* REMOVED Image Placeholder Div - Only the info card remains, centered */}

            {/* Right — info card (now centered full width) */}
            <div style={s.cardFull}>
              <div style={s.cardBody}>
                <p style={s.personalityType} className="personality-type">Financial Type</p>
                <h1 style={s.name} className="personality-name">{personality.name}</h1>
                <div style={s.mossBar} className="moss-bar" />
                <p style={s.desc} className="desc">{personality.desc}</p>
                <div style={s.insightBox} className="insight-box">
                  <span style={s.insightLabel}>Honest Insight</span>
                  <p style={s.insight}>{personality.truth}</p>
                </div>
                <div className="tarot-btn-wrap">
                  <button
                    style={{ ...s.tarotBtn, ...(btnHovered ? s.tarotBtnHover : {}) }}
                    onMouseEnter={() => setBtnHovered(true)}
                    onMouseLeave={() => setBtnHovered(false)}
                    onClick={handleReveal}
                  >
                    Reveal Your Financial Fate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* B: Tarot Screen — fullscreen, mounted only when active, fully self-contained */}
      {showTarot && (
        <TarotScreen tarotText={tarotText} actions={actions} onExit={handleExit} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TarotScreen styles
// ─────────────────────────────────────────────────────────────────────────────
const t = {
  root: {
    position: "fixed", inset: 0, zIndex: 1000, overflow: "hidden",
    fontFamily: "'Inter','Poppins',-apple-system,sans-serif",
  },
  bg: {
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at 50% 40%, #3b1f72 0%, #1e0d4a 35%, #0d0620 70%, #060010 100%)",
    zIndex: 0,
  },
  content: {
    position: "relative", zIndex: 2,
    display: "flex", flexDirection: "column", alignItems: "center",
    height: "100vh", overflowY: "auto",
    padding: "3rem 1.5rem 3rem",
    animation: "contentFadeIn 0.5s ease-in-out both",
  },
  imgPlaceholder: {
    width: "260px", minHeight: "260px", maxHeight: "300px",
    background: "transparent",
    borderRadius: "16px",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  gifImg: {
    width: "320px",
    height: "320px",
    objectFit: "contain",
    animation: "ballFloat 4s ease-in-out infinite",
  },
  imgPlaceholderText: {
    color: "#b388ff55", fontSize: "0.78rem", letterSpacing: "1px",
    textTransform: "uppercase", fontWeight: "600",
  },
  loadingText: {
    marginTop: "2rem",
    color: "#d8b4fe", fontSize: "1rem", letterSpacing: "0.4px",
    animation: "textFade 1.8s ease-in-out infinite",
    margin: "2rem 0 0", textAlign: "center",
  },
  resultWrap: {
    marginTop: "2rem",
    width: "100%", maxWidth: "420px",
    display: "flex", flexDirection: "column", alignItems: "stretch",
    animation: "resultIn 0.6s ease-in-out both",
  },
  resultEyebrow: {
    margin: "0 0 0.75rem",
    fontSize: "0.68rem", fontWeight: "700",
    textTransform: "uppercase", letterSpacing: "2px",
    color: "#a78bfa", textAlign: "center",
  },
  resultText: {
    margin: "0 0 1.75rem",
    color: "#ede9fe", fontSize: "1rem",
    lineHeight: 1.8, textAlign: "center",
    fontStyle: "italic", fontWeight: "500",
  },
  actionsBox: {
    background: "#ffffff0a",
    border: "1px solid #7c3aed33",
    borderLeft: "3px solid #a78bfa",
    borderRadius: "12px",
    padding: "1.25rem 1.5rem",
    marginBottom: "0.5rem",
  },
  actionsTitle: {
    margin: "0 0 1rem",
    fontSize: "0.65rem", fontWeight: "700",
    textTransform: "uppercase", letterSpacing: "1.5px",
    color: "#a78bfa",
  },
  actionRow: {
    display: "flex", alignItems: "flex-start", gap: "0.75rem",
    marginBottom: "0.85rem",
  },
  actionDot: {
    width: "6px", height: "6px",
    borderRadius: "50%", background: "#a78bfa",
    flexShrink: 0, marginTop: "6px",
  },
  actionLabel: {
    margin: "0 0 0.2rem",
    fontSize: "0.88rem", fontWeight: "700",
    color: "#ede9fe",
  },
  actionDetail: {
    margin: 0,
    fontSize: "0.78rem", color: "#c4b5fd",
    lineHeight: 1.6,
  },
  returnBtn: {
    marginTop: "1.5rem",
    padding: "0.8rem 1.75rem",
    background: "transparent",
    color: "#a78bfa",
    border: "1px solid #7c3aed66",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "0.88rem", fontWeight: "600",
    fontFamily: "inherit", letterSpacing: "0.3px",
    transition: "color 0.2s ease-in-out, border-color 0.2s ease-in-out, background 0.2s ease-in-out",
    alignSelf: "center", width: "100%",
  },
  returnBtnHover: {
    color: "#ede9fe",
    borderColor: "#a78bfaaa",
    background: "#7c3aed22",
  },
  curtainLeft: {
    position: "absolute", top: 0, left: 0,
    width: "50%", height: "100%",
    background: "linear-gradient(to right, #0d0620, #1e0d4a)",
    zIndex: 10,
  },
  curtainRight: {
    position: "absolute", top: 0, right: 0,
    width: "50%", height: "100%",
    background: "linear-gradient(to left, #0d0620, #1e0d4a)",
    zIndex: 10,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Personality page styles
// ─────────────────────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100vh",
    background: C.darkGreen,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    fontFamily: "'Inter','Poppins',-apple-system,sans-serif",
    padding: "3rem 1.5rem",
    overflowY: "auto",
    position: "relative",
  },
  backBtn: {
    position:   "fixed",
    top:        "1.1rem",
    left:       "1.25rem",
    zIndex:     10,
    background: "transparent",
    border:     `1px solid ${C.moss}44`,
    color:      `${C.beige}88`,
    padding:    "0.3rem 0.85rem",
    borderRadius: "8px",
    cursor:     "pointer",
    fontSize:   "0.82rem",
    fontFamily: "inherit",
    fontWeight: "600",
    transition: "color 0.18s ease, border-color 0.18s ease, background 0.18s ease",
  },
  backBtnHover: {
    color:        C.beige,
    borderColor:  `${C.moss}99`,
    background:   `${C.moss}18`,
  },
  spinner: {
    width: "36px", height: "36px",
    border: `4px solid ${C.moss}33`, borderTop: `4px solid ${C.moss}`,
    borderRadius: "50%", animation: "spin 0.8s linear infinite",
  },
  wrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "1.25rem", width: "100%", maxWidth: "700px",
  },
  pageLabel: {
    margin: 0,
    fontSize: "0.72rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "2px",
    color: `${C.moss}`,
    textAlign: "center",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: "1.5rem",
    width: "100%",
  },
  cardFull: {
    background: C.beige,
    borderRadius: "20px",
    width: "100%",
    maxWidth: "600px",
    boxShadow: "0 12px 56px rgba(0,0,0,0.4)",
    overflow: "hidden",
    margin: "0 auto",
  },
  cardBody: {
    padding: "2rem 2.5rem",
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    height: "100%",
    boxSizing: "border-box",
  },
  personalityType: {
    margin: "0 0 0.6rem",
    fontSize: "0.68rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    color: C.muted,
  },
  name: {
    fontSize: "1.75rem",
    fontWeight: "800",
    color: C.darkGreen,
    margin: "0 0 1.25rem",
    letterSpacing: "-0.6px",
    lineHeight: 1.2,
  },
  mossBar: {
    width: "40px", height: "3px",
    background: C.moss,
    borderRadius: "999px",
    margin: "0 0 1.5rem",
  },
  desc: {
    fontSize: "0.93rem",
    color: "#3d5244",
    lineHeight: 1.8,
    margin: "0 0 1.75rem",
  },
  insightBox: {
    background: `${C.darkGreen}0d`,
    border: `1px solid ${C.darkGreen}18`,
    borderLeft: `3px solid ${C.moss}`,
    borderRadius: "10px",
    padding: "1rem 1.25rem",
    marginBottom: "1.75rem",
    textAlign: "left",
  },
  insightLabel: {
    fontSize: "0.65rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: C.moss,
    display: "block",
    marginBottom: "0.45rem",
  },
  insight: {
    margin: 0,
    fontSize: "0.88rem",
    color: C.darkGreen,
    lineHeight: 1.7,
    fontWeight: "500",
  },
  tarotBtn: {
    marginTop:    "1.5rem",
    padding:      "0.85rem 1.5rem",
    background:   C.moss,
    color:        C.darkGreen,
    border:       "none",
    borderRadius: "12px",
    cursor:       "pointer",
    fontSize:     "0.9rem",
    fontWeight:   "800",
    fontFamily:   "inherit",
    letterSpacing: "0.3px",
    transition:   "transform 0.18s ease-in-out, box-shadow 0.18s ease-in-out",
    boxShadow:    `0 4px 20px ${C.moss}44`,
    alignSelf:    "flex-start",
  },
  tarotBtnHover: {
    transform:  "scale(1.03)",
    boxShadow:  `0 0 32px ${C.moss}99, 0 6px 28px ${C.moss}55`,
  },
};