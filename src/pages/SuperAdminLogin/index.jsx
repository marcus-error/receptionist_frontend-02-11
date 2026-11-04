import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";
import api from "../../services/api.js";
import "../Landing/Landing.css";

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("superadmin@receptionist.ai");
  const [password, setPassword] = useState("SuperAdmin123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      const { access_token, user } = res.data;

      if (user.role !== "super_admin") {
        setError("Access Denied: Account lacks Super Admin permissions.");
        setLoading(false);
        return;
      }

      login(access_token, user);
      navigate("/super-admin/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Invalid Super Admin credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="landing-container"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "24px",
        backgroundColor: "#070809",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Ambient background radial glow */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(2, 132, 199, 0.05) 50%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 0
        }}
      />

      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          background: "rgba(13, 16, 26, 0.88)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "28px",
          padding: "40px 32px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.12)",
          backdropFilter: "blur(24px)",
          position: "relative",
          zIndex: 1
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              marginBottom: "14px",
              boxShadow: "0 0 24px rgba(245, 158, 11, 0.45)"
            }}
          >
            👑
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#ffffff", margin: "4px 0", fontFamily: "var(--lp-font-heading)" }}>
            Super Admin Portal
          </h2>
          <p style={{ color: "#cbd5e1", fontSize: "13.5px", margin: 0 }}>
            Platform Management & Super User Operations
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              color: "#f87171",
              fontSize: "13px",
              marginBottom: "20px"
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#cbd5e1", marginBottom: "8px" }}>
              Super Admin Email
            </label>
            <input
              type="email"
              required
              placeholder="superadmin@receptionist.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "13px 16px",
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                borderRadius: "12px",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none"
              }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1" }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: "none", border: "none", color: "#fbbf24", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "13px 16px",
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                borderRadius: "12px",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "14px",
              marginTop: "8px",
              fontSize: "15px",
              fontWeight: "700",
              color: "#070809",
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              border: "none",
              borderRadius: "999px",
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(245, 158, 11, 0.35)",
              display: "inline-flex",
              alignItems: "center"
            }}
          >
            {loading ? "Authenticating..." : "Sign In as Super Admin →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Link to="/admin/login" style={{ color: "#94a3b8", fontSize: "13px", textDecoration: "none", fontWeight: "500" }}>
            ← Back to Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}

