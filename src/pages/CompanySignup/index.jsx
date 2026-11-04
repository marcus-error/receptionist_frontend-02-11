import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import "../Landing/Landing.css";

const BUSINESS_TYPES = [
  "Clinic / Dental",
  "Medical Practice",
  "Law Firm",
  "Real Estate Agency",
  "Auto Repair & Dealership",
  "Hospital / Healthcare",
  "Finance & Accounting",
  "IT & Software",
  "Education & Tutoring",
  "Salon & Spa",
  "Other Service Business"
];

export default function CompanySignup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    organization_type: "Clinic / Dental",
    admin_name: "",
    admin_email: "",
    admin_password: "",
    official_email: "",
    contact_person: "",
    gst_number: "",
    full_address: "",
    contact_phone: "",
    tax_id: "",
    pan_number: "",
    city: "",
    state: "",
    postal_code: "",
    identity_proof_type: "GST Certificate",
    identity_proof_number: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/organizations/signup", formData);
      if (res.data?.access_token) {
        localStorage.setItem("token", res.data.access_token);
        alert("Organization created successfully! Welcome to AI Receptionist.");
        navigate("/admin/dashboard");
        window.location.reload();
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      const errorMessage = Array.isArray(detail)
        ? detail.map(d => `${d.loc[d.loc.length - 1] || 'Field'}: ${d.msg}`).join(', ')
        : detail || err.message || "Organization registration failed.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="landing-container"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#070809",
        padding: "36px 24px",
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
          background: "rgba(13, 16, 26, 0.88)",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          padding: "44px 36px",
          borderRadius: "28px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.12)",
          backdropFilter: "blur(24px)",
          maxWidth: "640px",
          width: "100%",
          position: "relative",
          zIndex: 1
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 16px",
              background: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "20px",
              color: "#38bdf8",
              fontSize: "12px",
              fontWeight: "700",
              letterSpacing: "0.8px",
              marginBottom: "14px"
            }}
          >
            ORGANIZATION REGISTRATION
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "0 0 8px 0", color: "#ffffff", fontFamily: "var(--lp-font-heading)" }}>
            Sign Up Your Organization
          </h1>
          <p style={{ color: "#cbd5e1", fontSize: "14px", margin: 0, lineHeight: "1.5" }}>
            Register your business tenant and launch your autonomous AI Receptionist in minutes.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              borderRadius: "12px",
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
              Company / Organization Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Metro Dental Care"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#cbd5e1", marginBottom: "8px" }}>
              Organization Industry Type
            </label>
            <select
              value={formData.organization_type}
              onChange={(e) => setFormData({ ...formData, organization_type: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "#1e293b",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none",
                cursor: "pointer"
              }}
            >
              {BUSINESS_TYPES.map((bt) => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#cbd5e1", marginBottom: "8px" }}>
              Admin Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dr. Sarah Jenkins"
              value={formData.admin_name}
              onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#cbd5e1", marginBottom: "8px" }}>
              Admin Email Address
            </label>
            <input
              type="email"
              required
              placeholder="admin@company.com"
              value={formData.admin_email}
              onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#cbd5e1", marginBottom: "8px" }}>
              Admin Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Create strong password"
              value={formData.admin_password}
              onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                color: "#ffffff",
                fontSize: "14px",
                outline: "none"
              }}
            />
          </div>

          {/* ================= KYC VERIFICATION SECTION ================= */}
          <div
            style={{
              marginTop: "10px",
              padding: "20px",
              background: "rgba(30, 41, 59, 0.4)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              borderRadius: "16px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <span style={{ fontSize: "16px" }}>🛡️</span>
              <strong style={{ fontSize: "14px", color: "#38bdf8" }}>Official Business KYC Verification</strong>
            </div>

            <div className="modal-grid" style={{ gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#cbd5e1", marginBottom: "6px" }}>
                  Official Mail ID *
                </label>
                <input
                  type="email"
                  placeholder="official@company.com"
                  value={formData.official_email || formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, official_email: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#1e293b",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#cbd5e1", marginBottom: "6px" }}>
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formData.contact_person || formData.admin_name}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#1e293b",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#cbd5e1", marginBottom: "6px" }}>
                  GST Number *
                </label>
                <input
                  type="text"
                  placeholder="33AAAAA0000A1Z5"
                  value={formData.gst_number || formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value, tax_id: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#1e293b",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#cbd5e1", marginBottom: "6px" }}>
                  Phone Number *
                </label>
                <input
                  type="text"
                  placeholder="+91 9876543210"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#1e293b",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#cbd5e1", marginBottom: "6px" }}>
                  Full Business Address *
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter complete registered company address with city, state & pincode"
                  value={formData.full_address || formData.address}
                  onChange={(e) => setFormData({ ...formData, full_address: e.target.value, address: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    background: "#1e293b",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    fontSize: "13px",
                    outline: "none",
                    resize: "vertical"
                  }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="pill"
            style={{
              width: "100%",
              padding: "14px",
              marginTop: "10px",
              fontSize: "15px",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            {loading ? "Registering Organization..." : "Register Organization →"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: "700" }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

