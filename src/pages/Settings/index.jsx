import { useEffect, useState } from "react";
import Toggle from "../../components/ui/Toggle.jsx";
import settingsService from "../../services/settings.service.js";

const SETTING_KEYS = [
  { key: "ai_inbound_calling", title: "AI Inbound Calling", desc: "Automatically answer incoming calls" },
  { key: "rag_responses", title: "RAG Responses", desc: "Use company knowledge base while answering" },
  { key: "appointment_booking", title: "Appointment Booking", desc: "Allow AI to create appointments" },
  { key: "human_escalation", title: "Human Escalation", desc: "Transfer difficult calls to staff" },
  { key: "call_recording", title: "Call Recording", desc: "Store call recordings and transcripts" }
];

export default function Settings() {
  const [form, setForm] = useState({
    receptionist_name: "Ava",
    default_greeting: "Hello! Welcome to our company. I'm Ava, your AI receptionist. How may I help you today?",
    after_hours_message: "Our office is currently closed. I can still help you with general questions or schedule an appointment for the next available time.",
    ai_inbound_calling: true,
    rag_responses: true,
    appointment_booking: true,
    human_escalation: true,
    call_recording: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await settingsService.get();
        if (data) {
          setForm(data);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleToggle = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");
      const updated = await settingsService.update(form);
      setForm(updated);
      setMessage("Settings saved successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setMessage("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="settings" className="page active">
      <div className="header">
        <div>
          <h1 className="title">AI Receptionist Settings</h1>
          <p className="subtitle">Configure the behaviour of your AI receptionist</p>
        </div>

        <button className="btn primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {message && (
        <div style={{
          padding: "12px 18px",
          marginBottom: "20px",
          borderRadius: "10px",
          fontWeight: "600",
          fontSize: "13.5px",
          background: message.includes("success") ? "rgba(183, 255, 92, 0.15)" : "rgba(244, 63, 94, 0.15)",
          color: message.includes("success") ? "#b7ff5c" : "#f87171",
          border: `1px solid ${message.includes("success") ? "rgba(183, 255, 92, 0.3)" : "rgba(244, 63, 94, 0.3)"}`
        }}>
          {message.includes("success") ? `✓ ${message}` : `✕ ${message}`}
        </div>
      )}

      <div className="card">
        {loading ? (
          <p style={{ padding: "20px", textAlign: "center" }}>Loading settings...</p>
        ) : (
          <>
            {SETTING_KEYS.map((s) => (
              <div className="setting" key={s.key}>
                <div>
                  <strong>{s.title}</strong>
                  <p style={{ fontSize: "11px", color: "#7a8495" }}>{s.desc}</p>
                </div>

                <Toggle
                  key={`${s.key}-${form[s.key]}`}
                  defaultOn={Boolean(form[s.key])}
                  onChange={(val) => handleToggle(s.key, val)}
                />
              </div>
            ))}

            <div className="group" style={{ marginTop: "25px" }}>
              <label>AI Receptionist Name</label>
              <input
                value={form.receptionist_name || ""}
                onChange={(e) => setForm({ ...form, receptionist_name: e.target.value })}
              />
            </div>

            <div className="group">
              <label>Default Greeting</label>
              <textarea
                value={form.default_greeting || ""}
                onChange={(e) => setForm({ ...form, default_greeting: e.target.value })}
                rows={3}
              />
            </div>

            <div className="group">
              <label>After Hours Message</label>
              <textarea
                value={form.after_hours_message || ""}
                onChange={(e) => setForm({ ...form, after_hours_message: e.target.value })}
                rows={3}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
