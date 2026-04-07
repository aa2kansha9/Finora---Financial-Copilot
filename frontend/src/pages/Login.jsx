import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AuthLayout, { AuthInput, AuthButton } from "../components/AuthLayout.jsx";

export default function Login() {
  const { login }             = useAuth();
  const navigate              = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.token, { name: data.name, email: data.email, _id: data._id });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
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
        autoComplete="current-password"
      />
      <AuthButton loading={loading}>Sign in</AuthButton>
      <p style={linkStyle}>
        Don't have an account?{" "}
        <Link to="/register" style={linkAnchor}>Create one</Link>
      </p>
    </form>
  );

  return <AuthLayout mode="login" onSubmit={formContent} error={error} />;
}

const linkStyle  = { textAlign: "center", marginTop: "1.25rem", fontSize: "0.85rem", color: "#5a6a5e" };
const linkAnchor = { color: "#0A3323", fontWeight: "600", textDecoration: "none" };
