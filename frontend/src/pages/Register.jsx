import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import AuthLayout, { AuthInput, AuthButton } from "../components/AuthLayout.jsx";

export default function Register() {
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ name: "", email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
      <AuthInput
        type="text"
        placeholder="Full name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        autoComplete="name"
      />
      <AuthInput
        type="email"
        placeholder="Email address"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        autoComplete="email"
      />
      <AuthInput
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        autoComplete="new-password"
      />
      <AuthButton loading={loading}>Create account</AuthButton>
      <p style={linkStyle}>
        Already have an account?{" "}
        <Link to="/login" style={linkAnchor}>Sign in</Link>
      </p>
    </form>
  );

  return <AuthLayout mode="register" onSubmit={formContent} error={error} />;
}

const linkStyle  = { textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "#5a6a5e" };
const linkAnchor = { color: "#0A3323", fontWeight: "600", textDecoration: "none" };
