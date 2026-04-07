import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

const C = {
  darkGreen: "#0A3323",
  moss: "#839958",
  beige: "#F7F4D5",
  rosy: "#D3968C",
  white: "#FFFFFF",
  muted: "#5a6a5e",
};

// Scroll reveal hook
function useReveal() {
  const ref = useRef();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

export default function AboutPage() {
  const navigate = useNavigate();

  const [r1, v1] = useReveal();
  const [r2, v2] = useReveal();
  const [r3, v3] = useReveal();
  const [r4, v4] = useReveal();
  const [r5, v5] = useReveal();

  return (
    <div style={s.container}>

      {/* Background Glow */}
      <div style={s.bgGlow}></div>

      {/* Top Bar */}
      <div style={s.topBar}>
        <button
          style={s.backBtn}
          onClick={() => navigate("/dashboard")}
          onMouseEnter={(e) => {
            e.target.style.background = C.moss;
            e.target.style.color = C.darkGreen;
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "transparent";
            e.target.style.color = C.moss;
          }}
        >
          Back
        </button>

        <h1 style={s.title}>About Finora</h1>
      </div>

      <div style={s.content}>

        {/* HERO */}
        <section
          ref={r1}
          style={{
            ...s.section,
            opacity: v1 ? 1 : 0,
            transform: v1 ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.7s ease",
          }}
        >
          <h2 style={s.heroTitle}>
            This was built to fix a problem most people ignore
          </h2>
          <p style={s.text}>
            Managing money is not hard. Being honest about your habits is.
            This app shows what your financial behavior actually looks like,
            not what you think it looks like.
          </p>
        </section>

        {/* WHY */}
        <div
          ref={r2}
          style={{
            ...s.cardWrapper,
            opacity: v2 ? 1 : 0,
            transform: v2 ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.7s ease",
          }}
        >
          <section style={s.cardSection}>
            <h2 style={s.headingDark}>Why this exists</h2>
            <p style={s.textDark}>
              Most people know they should save more and spend less.
              But knowing does not change behavior.
            </p>
            <p style={s.textDark}>
              The real problem is clarity. People do not see the full picture,
              and even when they do, they do not get honest feedback.
            </p>
            <p style={s.textDark}>
              Finora exists to remove that gap. It turns your data into
              something you cannot ignore.
            </p>
          </section>
        </div>

        {/* FEATURES */}
        <section
          ref={r3}
          style={{
            ...s.section,
            opacity: v3 ? 1 : 0,
            transform: v3 ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.7s ease",
          }}
        >
          <h2 style={s.heading}>What you can do here</h2>

          <p style={s.text}>
            You start with financial data. Income, expenses, savings, and debt.
            Everything builds on this.
          </p>

          <p style={s.text}>
            Financial health shows where you stand. The affordability checker tells you if a decision is safe.
          </p>

          <p style={s.text}>
            The what if simulator lets you test decisions. Portfolio helps you plan allocation and long-term investing.
          </p>

          <p style={s.text}>
            AI insights convert raw numbers into conclusions you can actually use.
          </p>
        </section>

        {/* DIFFERENTIATOR */}
        <div
          ref={r4}
          style={{
            ...s.cardWrapper,
            opacity: v4 ? 1 : 0,
            transform: v4 ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.7s ease",
          }}
        >
          <section style={s.cardSection}>
            <h2 style={s.headingDark}>What makes this different</h2>

            <p style={s.textDark}>
              Most apps track. Finora analyzes behavior.
            </p>

            <p style={s.textDark}>
              The financial personality feature reflects your habits in a way
              that makes patterns obvious.
            </p>

            <p style={s.textDark}>
              The tarot experience takes it further. It uses your data to generate
              a humorous prediction of your financial future.
            </p>

            <p style={s.textDark}>
              If it makes you laugh and rethink your decisions at the same time,
              it has done its job.
            </p>
          </section>
        </div>

        {/* FINAL */}
        <section
          ref={r5}
          style={{
            ...s.section,
            opacity: v5 ? 1 : 0,
            transform: v5 ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.7s ease",
          }}
        >
          <h2 style={s.heading}>What this is really about</h2>

          <p style={s.text}>
            This is not a tracking tool. It is a decision tool.
          </p>

          <p style={s.text}>
            The goal is not to show numbers. The goal is to help you act on them.
          </p>

          <p style={s.text}>
            If you understand your habits, you can change them.
          </p>
        </section>

      </div>
    </div>
  );
}

const s = {
  container: {
    minHeight: "100vh",
    background: "#0A3323",
    fontFamily: "'Inter', sans-serif",
    color: "#F7F4D5",
    position: "relative",
    overflowX: "hidden",
  },

  bgGlow: {
    position: "fixed",
    top: "-200px",
    left: "-200px",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, #83995833, transparent)",
    filter: "blur(80px)",
    animation: "floatGlow 8s ease-in-out infinite",
    zIndex: 0,
  },

  topBar: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1.5rem 2rem",
    borderBottom: "1px solid #83995833",
    position: "relative",
    zIndex: 2,
  },

  backBtn: {
    padding: "0.5rem 1rem",
    background: "transparent",
    border: "1px solid #839958",
    color: "#839958",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.25s ease",
  },

  title: {
    fontSize: "1.5rem",
    fontWeight: "700",
  },

  content: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "3rem 2rem",
    position: "relative",
    zIndex: 2,
  },

  section: {
    marginBottom: "3rem",
  },

  cardWrapper: {
    marginBottom: "3rem",
    transition: "all 0.3s ease",
  },

  cardSection: {
    padding: "2rem",
    borderRadius: "16px",
    background: "#F7F4D5",
    color: "#0A3323",
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
  },

  heroTitle: {
    fontSize: "2rem",
    fontWeight: "800",
    marginBottom: "1rem",
  },

  heading: {
    fontSize: "1.4rem",
    fontWeight: "700",
    marginBottom: "1rem",
  },

  headingDark: {
    fontSize: "1.4rem",
    fontWeight: "700",
    marginBottom: "1rem",
  },

  text: {
    fontSize: "0.95rem",
    lineHeight: "1.6",
    marginBottom: "0.8rem",
    color: "#F7F4D5cc",
  },

  textDark: {
    fontSize: "0.95rem",
    lineHeight: "1.6",
    marginBottom: "0.8rem",
    color: "#0A3323cc",
  },
};

// Inject keyframes
const style = document.createElement("style");
style.innerHTML = `
@keyframes floatGlow {
  0%,100% { transform: translate(0,0); }
  50% { transform: translate(80px,60px); }
}
`;
document.head.appendChild(style);