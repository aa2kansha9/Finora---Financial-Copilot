import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const C = {
  darkGreen: "#0A3323",
  moss: "#839958",
  beige: "#F7F4D5",
  textDark: "#0A3323",
  textLight: "#F7F4D5",
};

function useReveal() {
  const ref = useRef();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setShow(true),
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return [ref, show];
}

export default function HelpPage() {
  const navigate = useNavigate();

  const [r1, v1] = useReveal();
  const [r2, v2] = useReveal();
  const [r3, v3] = useReveal();
  const [r4, v4] = useReveal();
  const [r5, v5] = useReveal();

  return (
    <div style={s.container}>
      {/* Top */}
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate("/dashboard")}>
          Back
        </button>
        <h1 style={s.title}>Help Guide</h1>
      </div>

      <div style={s.content}>
        
        {/* Getting Started */}
        <Section title="Getting Started" refHook={[r1, v1]}>
          <Card>
            <p>Add your financial data first. Everything depends on it.</p>
            <p>Check your financial health to understand your position.</p>
            <p>Explore features one by one.</p>
          </Card>
        </Section>

        {/* Core Features */}
        <Section title="Core Features" refHook={[r2, v2]}>
          <Card>
            <p><b>Financial Data</b> Enter once and update when needed. Accuracy matters.</p>
            <p><b>Financial Health</b> Shows your overall financial condition.</p>
            <p><b>Can I Afford</b> Checks if a purchase is safe.</p>
            <p><b>What If Simulator</b> Test decisions before making them.</p>
            <p><b>Portfolio</b> Plan and view asset allocation.</p>
            <p><b>AI Insights</b> Converts your data into useful analysis.</p>
            <p><b>Goals</b> Set clear and realistic targets.</p>
          </Card>
        </Section>

        {/* Special Features */}
        <Section title="Special Features" refHook={[r3, v3]}>
          <Card>
            <p><b>Financial Personality</b> Identifies your behavior pattern.</p>
            <p><b>Tarot Reading</b> A humorous prediction based on your financial habits.</p>
            <p>This is for reflection, not actual prediction.</p>
          </Card>
        </Section>

        {/* Best Practices */}
        <Section title="Best Practices" refHook={[r4, v4]}>
          <Card>
            <p>Keep your data updated</p>
            <p>Use real numbers</p>
            <p>Review weekly</p>
            <p>Use multiple features together</p>
          </Card>
        </Section>

        {/* Mistakes */}
        <Section title="Common Mistakes" refHook={[r5, v5]}>
          <Card>
            <p>Entering incomplete data</p>
            <p>Ignoring spending categories</p>
            <p>Using affordability as permission to spend</p>
            <p>Not building emergency fund</p>
          </Card>
        </Section>

      </div>
    </div>
  );
}

/* SECTION */
function Section({ title, children, refHook }) {
  const [ref, visible] = refHook;

  return (
    <section
      ref={ref}
      style={{
        marginBottom: "2.5rem",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: "all 0.6s ease",
      }}
    >
      <h2 style={s.heading}>{title}</h2>
      {children}
    </section>
  );
}

/* CARD */
function Card({ children }) {
  return (
    <div style={s.card}>
      {children}
    </div>
  );
}

/* STYLES */
const s = {
  container: {
    minHeight: "100vh",
    background: "#0A3323",
    color: "#F7F4D5",
    fontFamily: "Inter, sans-serif",
  },

  topBar: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1.5rem 2rem",
    borderBottom: "1px solid #83995833",
  },

  backBtn: {
    padding: "0.5rem 1rem",
    border: "1px solid #839958",
    background: "transparent",
    color: "#839958",
    borderRadius: "8px",
    cursor: "pointer",
  },

  title: {
    fontSize: "1.5rem",
    fontWeight: "700",
  },

  content: {
    maxWidth: "850px",
    margin: "0 auto",
    padding: "3rem 2rem",
  },

  heading: {
    fontSize: "1.3rem",
    fontWeight: "700",
    marginBottom: "1rem",
  },

  card: {
    background: "#F7F4D5",
    color: "#0A3323",
    padding: "1.5rem",
    borderRadius: "12px",
    lineHeight: "1.6",
    fontSize: "0.95rem",
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  },
};