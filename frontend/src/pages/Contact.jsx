import { useState } from "react";
import { useNavigate } from "react-router-dom";

const C = { darkGreen: "#0A3323", moss: "#839958", beige: "#F7F4D5", rosy: "#D3968C", muted: "#8aab90" };

export default function ContactPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [errMsg, setErrMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setErrMsg("");
    
    try {
      const res = await fetch("https://finance-backend-ycl6.onrender.com/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || "Failed");
      
      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      console.error("Contact error:", err);
      setErrMsg(err.message);
      setStatus("error");
    }
  };

  return (
    <div style={s.page}>
      <button
        style={s.backBtn}
        onClick={() => navigate("/dashboard")}
      >
        ← Back
      </button>

      <div style={s.wrap}>
        <p style={s.eyebrow}>Get in Touch</p>
        <h1 style={s.heading}>Contact</h1>
        <div style={s.bar} />
        <p style={s.sub}>
          Have a question, a suggestion, or found something broken? Send a message and it will land directly in the inbox.
        </p>

        <form style={s.form} onSubmit={handleSubmit}>
          <div style={s.row}>
            <div style={s.field}>
              <label style={s.label}>Name</label>
              <input
                style={s.input}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input
                style={s.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div style={{ ...s.field, width: "100%" }}>
            <label style={s.label}>Message</label>
            <textarea
              style={s.textarea}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
              required
              rows={6}
            />
          </div>

          {status === "success" && (
            <p style={s.successMsg}>Message sent! I'll get back to you soon.</p>
          )}
          {status === "error" && (
            <p style={s.errorMsg}>{errMsg || "Something went wrong. Please try again."}</p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            style={s.submitBtn}
          >
            {status === "sending" ? "Sending..." : "Send Message"}
          </button>
        </form>

        <p style={s.footer}>Built by Aakansha — feedback welcome</p>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: C.darkGreen,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    fontFamily: "'Inter','Poppins',-apple-system,sans-serif",
    padding: "3rem 1.5rem 4rem",
  },
  backBtn: {
    position: "fixed",
    top: "1.1rem",
    left: "1.25rem",
    zIndex: 10,
    background: "transparent",
    border: `1px solid ${C.moss}44`,
    color: `${C.beige}88`,
    padding: "0.3rem 0.85rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontFamily: "inherit",
    fontWeight: "600",
  },
  wrap: {
    width: "100%",
    maxWidth: "620px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  eyebrow: {
    margin: "0 0 0.5rem",
    fontSize: "0.7rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "2px",
    color: C.moss,
  },
  heading: {
    margin: "0 0 1rem",
    fontSize: "2.2rem",
    fontWeight: "800",
    color: C.beige,
    letterSpacing: "-0.5px",
  },
  bar: {
    width: "40px",
    height: "3px",
    background: C.moss,
    borderRadius: "999px",
    marginBottom: "1.5rem",
  },
  sub: {
    margin: "0 0 2.5rem",
    fontSize: "0.92rem",
    color: `${C.beige}99`,
    lineHeight: 1.8,
    maxWidth: "520px",
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  row: {
    display: "flex",
    gap: "1.25rem",
    width: "100%",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    flex: 1,
  },
  label: {
    fontSize: "0.75rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "1px",
    color: C.muted,
  },
  input: {
    padding: "0.75rem 1rem",
    background: `${C.beige}08`,
    border: `1px solid ${C.moss}33`,
    borderRadius: "10px",
    color: C.beige,
    fontSize: "0.9rem",
    fontFamily: "inherit",
    outline: "none",
  },
  textarea: {
    padding: "0.75rem 1rem",
    background: `${C.beige}08`,
    border: `1px solid ${C.moss}33`,
    borderRadius: "10px",
    color: C.beige,
    fontSize: "0.9rem",
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
    minHeight: "140px",
  },
  submitBtn: {
    alignSelf: "flex-start",
    padding: "0.85rem 2rem",
    background: C.moss,
    color: C.darkGreen,
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "800",
    fontFamily: "inherit",
  },
  successMsg: {
    margin: 0,
    fontSize: "0.88rem",
    color: C.moss,
    fontWeight: "600",
  },
  errorMsg: {
    margin: 0,
    fontSize: "0.88rem",
    color: C.rosy,
    fontWeight: "600",
  },
  footer: {
    marginTop: "3rem",
    fontSize: "0.78rem",
    color: `${C.beige}44`,
    letterSpacing: "0.3px",
  },
};