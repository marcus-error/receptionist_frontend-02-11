import { Link } from "react-router-dom";
import "../Landing/Landing.css";

export default function RoleSelect() {
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
      {/* Ambient background glow */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(2, 132, 199, 0.05) 50%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 0
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(183, 255, 92, 0.1) 0%, transparent 70%)",
          top: "20%",
          left: "30%",
          pointerEvents: "none",
          zIndex: 0
        }}
      />

      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "rgba(13, 16, 26, 0.88)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          borderRadius: "28px",
          padding: "44px 36px",
          textAlign: "center",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.12)",
          backdropFilter: "blur(24px)",
          position: "relative",
          zIndex: 1
        }}
      >
        <Link to="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              boxShadow: "0 0 20px rgba(56, 189, 248, 0.4)"
            }}
          >
            🎙️
          </div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#ffffff", fontFamily: "var(--lp-font-heading)", letterSpacing: "-0.02em" }}>
            AI <span style={{ color: "#38bdf8" }}>Receptionist</span>
          </div>
        </Link>

        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff", marginBottom: "8px", fontFamily: "var(--lp-font-heading)" }}>
          Welcome Back
        </h2>
        <p style={{ color: "#cbd5e1", fontSize: "14px", marginBottom: "32px", lineHeight: "1.5" }}>
          Choose your portal below to sign in or set up your organization workspace.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Link
            to="/admin/login"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 22px",
              background: "linear-gradient(135deg, rgba(2, 132, 199, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: "16px",
              color: "#ffffff",
              fontSize: "15.5px",
              fontWeight: "700",
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(2, 132, 199, 0.25)",
              transition: "all 0.25s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "22px" }}>🏢</span>
              <span>Organization Admin Portal</span>
            </div>
            <span style={{ color: "#38bdf8", fontSize: "18px", fontWeight: "bold" }}>→</span>
          </Link>

          <Link
            to="/super-admin/login"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "18px 22px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "16px",
              color: "#ffffff",
              fontSize: "15.5px",
              fontWeight: "700",
              textDecoration: "none",
              transition: "all 0.25s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span style={{ fontSize: "22px" }}>👑</span>
              <span>Super Admin Platform</span>
            </div>
            <span style={{ color: "#94a3b8", fontSize: "18px", fontWeight: "bold" }}>→</span>
          </Link>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "22px", borderTop: "1px solid rgba(255, 255, 255, 0.1)", fontSize: "14px", color: "#94a3b8" }}>
          Need an account for your business?{" "}
          <Link to="/signup/company" style={{ color: "#38bdf8", fontWeight: "700", textDecoration: "none" }}>
            Register Organization
          </Link>
        </div>
      </div>
    </div>
  );
}

