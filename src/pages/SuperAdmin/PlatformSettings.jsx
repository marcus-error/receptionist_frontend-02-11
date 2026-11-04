import { useState } from "react";
import Toggle from "../../components/ui/Toggle.jsx";

export default function PlatformSettings() {
  const [form, setForm] = useState({
    default_llm: "gpt-4o",
    temperature: 0.7,
    max_tokens: 150,
    twilio_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    twilio_auth: "••••••••••••••••••••••••••••••••",
    webhook_url: "https://api.receptionist.ai/twilio/webhook",
    smtp_host: "smtp.sendgrid.net",
    smtp_port: 587,
    enforce_2fa: true,
    session_timeout: 60
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    // Mock save logic
    setTimeout(() => {
      setMessage("✅ Global Platform Settings updated successfully.");
      setSaving(false);
    }, 1000);
  };

  return (
    <section id="super-admin-settings" className="page active">
      <div className="header">
        <div>
          <h1 className="title">⚙️ Global Platform Settings</h1>
          <p className="subtitle">Manage infrastructure, integrations, and security across all tenants.</p>
        </div>
        <button className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Global Config"}
        </button>
      </div>

      {message && (
        <div style={{
          padding: "12px 18px",
          marginBottom: "20px",
          borderRadius: "10px",
          fontWeight: "600",
          fontSize: "13.5px",
          background: message.includes("✅") ? "rgba(183, 255, 92, 0.15)" : "rgba(244, 63, 94, 0.15)",
          color: message.includes("✅") ? "#b7ff5c" : "#f87171",
          border: `1px solid ${message.includes("✅") ? "rgba(183, 255, 92, 0.3)" : "rgba(244, 63, 94, 0.3)"}`
        }}>
          {message}
        </div>
      )}

      <div className="grid2" style={{ gap: "24px" }}>
        {/* Core AI Settings */}
        <div className="card">
          <h3 className="card-title" style={{ borderBottom: "1px solid var(--line-light)", paddingBottom: "12px", marginBottom: "20px" }}>🧠 Core AI Engine</h3>
          
          <div className="group" style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--heading)" }}>Default LLM Provider</label>
            <select
              value={form.default_llm}
              onChange={(e) => setForm({ ...form, default_llm: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--line-light)", color: "var(--fg)" }}
            >
              <option value="gpt-4o">OpenAI GPT-4o (Recommended)</option>
              <option value="claude-3-5">Anthropic Claude 3.5 Sonnet</option>
              <option value="llama-3">Meta Llama 3 70B</option>
            </select>
          </div>

          <div className="group" style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--heading)" }}>Temperature ({form.temperature})</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--primary)" }}
            />
            <p className="text-secondary" style={{ fontSize: "11px", marginTop: "4px" }}>Higher values make output more random, lower values more deterministic.</p>
          </div>
        </div>

        {/* Telephony Settings */}
        <div className="card">
          <h3 className="card-title" style={{ borderBottom: "1px solid var(--line-light)", paddingBottom: "12px", marginBottom: "20px" }}>📞 Master Twilio Config</h3>
          
          <div className="group" style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--heading)" }}>Master Account SID</label>
            <input
              type="text"
              value={form.twilio_sid}
              onChange={(e) => setForm({ ...form, twilio_sid: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--line-light)", color: "var(--fg)", fontFamily: "monospace" }}
            />
          </div>

          <div className="group" style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--heading)" }}>Master Auth Token</label>
            <input
              type="password"
              value={form.twilio_auth}
              onChange={(e) => setForm({ ...form, twilio_auth: e.target.value })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--line-light)", color: "var(--fg)", fontFamily: "monospace" }}
            />
          </div>
          
          <div className="group" style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--heading)" }}>Global Webhook Entrypoint</label>
            <input
              type="text"
              value={form.webhook_url}
              readOnly
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "rgba(0,0,0,0.2)", color: "var(--muted)", fontFamily: "monospace", opacity: 0.7 }}
            />
          </div>
        </div>

        {/* Global Security */}
        <div className="card">
          <h3 className="card-title" style={{ borderBottom: "1px solid var(--line-light)", paddingBottom: "12px", marginBottom: "20px" }}>🛡️ Global Security</h3>
          
          <div className="setting" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <strong style={{ fontSize: "13px", color: "var(--heading)" }}>Enforce 2FA for all Admins</strong>
              <p className="text-secondary" style={{ fontSize: "11px", marginTop: "2px" }}>Require multi-factor authentication for every tenant admin.</p>
            </div>
            <Toggle
              defaultOn={form.enforce_2fa}
              onChange={(val) => setForm({ ...form, enforce_2fa: val })}
            />
          </div>

          <div className="group" style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--heading)" }}>Session Timeout (Minutes)</label>
            <input
              type="number"
              value={form.session_timeout}
              onChange={(e) => setForm({ ...form, session_timeout: parseInt(e.target.value) })}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--line-light)", color: "var(--fg)" }}
            />
          </div>
        </div>

        {/* SMTP Details */}
        <div className="card">
          <h3 className="card-title" style={{ borderBottom: "1px solid var(--line-light)", paddingBottom: "12px", marginBottom: "20px" }}>✉️ SMTP Relay (System Emails)</h3>
          
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <div className="group" style={{ flex: 2 }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--heading)" }}>SMTP Host</label>
              <input
                type="text"
                value={form.smtp_host}
                onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--line-light)", color: "var(--fg)" }}
              />
            </div>
            <div className="group" style={{ flex: 1 }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--heading)" }}>Port</label>
              <input
                type="number"
                value={form.smtp_port}
                onChange={(e) => setForm({ ...form, smtp_port: parseInt(e.target.value) })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--line)", background: "var(--line-light)", color: "var(--fg)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
