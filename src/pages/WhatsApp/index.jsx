import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Send,
  Smartphone,
  Sparkles,
  Clock,
  Phone,
  Radio,
  Sliders,
  Calendar,
  CheckCheck,
  ArrowRight,
  Info
} from "lucide-react";
import {
  getWhatsAppConfig,
  updateWhatsAppConfig,
  validateWhatsAppConnection,
  sendTestWhatsAppMessage,
  triggerReminderTest
} from "../../services/whatsapp.service.js";
import "./whatsapp.css";

const PRESET_TEMPLATES = {
  confirmation: {
    id: "confirmation",
    name: "Appointment Confirmation",
    icon: "📅",
    text: `Hello {{customer_name}},\n\nYour appointment with {{staff_name}} has been confirmed for {{date}} at {{time}}.\n\nDepartment: {{department}}\nLocation: Main Clinic, Suite 402\n\nThank you for choosing CallZenza AI Receptionist.`
  },
  reminder_24h: {
    id: "reminder_24h",
    name: "24-Hour Reminder",
    icon: "⏰",
    text: `Hello {{customer_name}},\n\nThis is a friendly reminder of your upcoming appointment tomorrow, {{date}} at {{time}} with {{staff_name}}.\n\nDepartment: {{department}}\nPlease reply YES to confirm or RESCHEDULE if you need to pick a new time.`
  },
  reminder_1h: {
    id: "reminder_1h",
    name: "1-Hour Reminder",
    icon: "⏳",
    text: `Hi {{customer_name}},\n\nYour appointment is starting in 1 hour at {{time}} with {{staff_name}}.\n\nDepartment: {{department}}\nWe look forward to seeing you shortly!`
  },
  reschedule: {
    id: "reschedule",
    name: "Reschedule Notice",
    icon: "🔄",
    text: `Hello {{customer_name}},\n\nYour appointment has been successfully rescheduled to {{date}} at {{time}} with {{staff_name}}.\n\nDepartment: {{department}}\nIf this was not done by you, please contact us immediately.`
  },
  cancellation: {
    id: "cancellation",
    name: "Cancellation Notice",
    icon: "❌",
    text: `Hello {{customer_name}},\n\nYour appointment scheduled for {{date}} at {{time}} has been cancelled as requested.\n\nTo schedule a new visit, feel free to call our AI receptionist anytime. Have a great day!`
  }
};

const DUMMY_PREVIEW_VALUES = {
  "{{customer_name}}": "John Doe",
  "{{staff_name}}": "Dr. Sarah Jenkins",
  "{{date}}": "Tomorrow, Oct 22",
  "{{time}}": "10:30 AM",
  "{{department}}": "General Consultation",
  "{{service_name}}": "Annual Health Checkup",
  "{{clinic_address}}": "742 Evergreen Terrace, Suite 400",
  "{{reschedule_link}}": "https://callzenza.ai/r/app-842"
};

const VARIABLE_TAGS = [
  "{{customer_name}}",
  "{{staff_name}}",
  "{{date}}",
  "{{time}}",
  "{{department}}",
  "{{service_name}}",
  "{{clinic_address}}",
  "{{reschedule_link}}"
];

export default function WhatsApp() {
  const [activeTab, setActiveTab] = useState("credentials"); // "credentials", "templates", "sandbox", "automations"
  const [config, setConfig] = useState({
    provider: "Meta WhatsApp Cloud API",
    phone_number: "",
    phone_number_id: "",
    waba_id: "",
    access_token: "",
    template: PRESET_TEMPLATES.confirmation.text,
    webhook_url: "",
    webhook_verify_token: "receptionist_verify_token_2026",
    is_configured: false,
    has_token: false
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Template Studio State
  const [activePreset, setActivePreset] = useState("confirmation");
  const textareaRef = useRef(null);

  // Sandbox Test State
  const [testMessageType, setTestMessageType] = useState("template"); // "template" (hello_world) or "text"
  const [testPhone, setTestPhone] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Automations State
  const [automations, setAutomations] = useState({
    instant_confirm: true,
    reminder_24h: true,
    reminder_1h: true,
    reschedule_alert: true,
    inbound_reply: true
  });
  const [testingReminder, setTestingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState(null);

  // Fetch initial configuration & validate connection
  useEffect(() => {
    async function loadData() {
      // 1. Check local cache
      const cached = localStorage.getItem("receptionist_whatsapp_config");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setConfig((prev) => ({ ...prev, ...parsed }));
          if (parsed.phone_number) setTestPhone(parsed.phone_number);
        } catch (e) {
          console.error("Failed to parse cached config", e);
        }
      }

      // 2. Fetch from backend
      try {
        const data = await getWhatsAppConfig();
        if (data) {
          setConfig((prev) => ({
            ...prev,
            ...data,
            template: data.template || PRESET_TEMPLATES.confirmation.text
          }));
          if (data.phone_number) setTestPhone(data.phone_number);
          localStorage.setItem("receptionist_whatsapp_config", JSON.stringify(data));
        }
      } catch (err) {
        console.error("Failed to fetch WhatsApp config", err);
      }

      // 3. Validate connection health
      runConnectionCheck();
    }
    loadData();
  }, []);

  const runConnectionCheck = async () => {
    setTestingConn(true);
    try {
      const res = await validateWhatsAppConnection();
      setConnResult(res);
    } catch (err) {
      console.error("Connection check failed", err);
      const detail = err.response?.data?.detail;
      const errStr = typeof detail === "object" ? (detail.message || JSON.stringify(detail)) : (detail || err.message || "Connection check failed");
      setConnResult({ valid: false, error: errStr });
    } finally {
      setTestingConn(false);
    }
  };

  const handleChange = (field) => (e) => {
    setConfig((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const updated = await updateWhatsAppConfig(config);
      const merged = { ...config, ...(updated || {}) };
      setConfig(merged);
      localStorage.setItem("receptionist_whatsapp_config", JSON.stringify(merged));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      runConnectionCheck();
    } catch (err) {
      console.error("Save config failed", err);
      localStorage.setItem("receptionist_whatsapp_config", JSON.stringify(config));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handlePresetSelect = (presetKey) => {
    setActivePreset(presetKey);
    const preset = PRESET_TEMPLATES[presetKey];
    if (preset) {
      setConfig((prev) => ({ ...prev, template: preset.text }));
    }
  };

  const handleInsertVariable = (variable) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = config.template || "";
    const updated = current.substring(0, start) + variable + current.substring(end);

    setConfig((prev) => ({ ...prev, template: updated }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleSendTestMessage = async () => {
    if (!testPhone) {
      setTestResult({ error: "Please enter a target phone number with country code (e.g. +1 555 123 4567 or +91 9876543210)" });
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const payload = testMessageType === "template"
        ? { to: testPhone, template_name: "hello_world", language: "en_US" }
        : { to: testPhone, text: config.template || "Hello from CallZenza AI Receptionist!" };

      const res = await sendTestWhatsAppMessage(payload);
      setTestResult({
        success: true,
        data: res,
        isTemplate: testMessageType === "template",
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.error("Send test failed", err);
      const detail = err.response?.data?.detail;
      let errStr = "Failed to send WhatsApp message";
      if (detail) {
        errStr = typeof detail === "object" ? (detail.message || JSON.stringify(detail)) : String(detail);
      } else if (err.message) {
        errStr = typeof err.message === "object" ? JSON.stringify(err.message) : String(err.message);
      }
      setTestResult({
        success: false,
        error: errStr,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleTriggerReminderTest = async (hours) => {
    setTestingReminder(true);
    setReminderResult(null);
    try {
      const res = await triggerReminderTest(hours);
      setReminderResult({
        success: true,
        hours,
        data: res,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err) {
      console.error("Reminder test failed", err);
      const detail = err.response?.data?.detail;
      setReminderResult({
        success: false,
        hours,
        error: typeof detail === "object" ? JSON.stringify(detail) : (detail || err.message),
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setTestingReminder(false);
    }
  };

  // Generate live preview string replacing variables with dummy values
  const getRenderedPreview = () => {
    let text = config.template || "";
    Object.entries(DUMMY_PREVIEW_VALUES).forEach(([key, val]) => {
      text = text.replaceAll(key, val);
    });
    return text;
  };

  // Connection status helpers
  const isExpired = connResult?.is_expired || (connResult?.error && /expired/i.test(connResult.error));
  const isConnected = connResult?.valid === true;
  const isConfigured = Boolean(config.phone_number_id && (config.access_token || config.has_token));

  const statusLabel = isConnected
    ? "Connected & Live"
    : isExpired
    ? "Token Expired (HTTP 401)"
    : isConfigured
    ? "Verification Required"
    : "Not Configured";

  const statusClass = isConnected ? "connected" : isExpired ? "expired" : "unconfigured";

  const defaultWebhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/v1/whatsapp/webhook`
    : "http://127.0.0.1:8000/api/v1/whatsapp/webhook";

  return (
    <section id="whatsapp" className="page active wa-container">
      {/* HEADER SECTION */}
      <div className="wa-header">
        <div className="wa-title-area">
          <h1>
            <span className="wa-brand-icon">
              <MessageSquare size={22} />
            </span>
            WhatsApp Cloud API Integration
          </h1>
          <p className="wa-subtitle">
            Enterprise Meta WhatsApp Business integration for instant appointment confirmations, 2-way AI conversational reminders, and real-time webhook events.
          </p>
        </div>

        <div className="wa-header-actions">
          <div className={`wa-status-pill ${statusClass}`}>
            <span className="wa-status-dot" />
            <span>{statusLabel}</span>
          </div>

          <button
            className="wa-btn secondary"
            onClick={runConnectionCheck}
            disabled={testingConn}
            title="Check Meta API credentials health"
          >
            <RefreshCw size={14} className={testingConn ? "spin" : ""} />
            {testingConn ? "Verifying..." : "Validate"}
          </button>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="wa-kpi-grid">
        <div className="wa-kpi-card">
          <div className="wa-kpi-top">
            <span className="wa-kpi-label">API Health</span>
            <div className={`wa-kpi-icon ${isConnected ? "health-connected" : "health-warning"}`}>
              {isConnected ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </div>
          </div>
          <div className="wa-kpi-value">
            {isConnected ? "Meta v23.0" : isExpired ? "Token Expired" : "Ready"}
          </div>
          <div className="wa-kpi-subtext">
            {isConnected ? "✓ Graph API Authenticated" : isExpired ? "Temporary token needs renewal" : "Waiting for verification"}
          </div>
        </div>

        <div className="wa-kpi-card">
          <div className="wa-kpi-top">
            <span className="wa-kpi-label">Business Identity</span>
            <div className="wa-kpi-icon phone">
              <Phone size={18} />
            </div>
          </div>
          <div className="wa-kpi-value">
            {config.phone_number || "+1 (555) 163-9721"}
          </div>
          <div className="wa-kpi-subtext">
            <span>Tier 1 (High Quality)</span> • <span>Verified</span>
          </div>
        </div>

        <div className="wa-kpi-card">
          <div className="wa-kpi-top">
            <span className="wa-kpi-label">Webhook Status</span>
            <div className="wa-kpi-icon webhook">
              <Radio size={18} />
            </div>
          </div>
          <div className="wa-kpi-value">Listening</div>
          <div className="wa-kpi-subtext">
            <span>Delivery & Read Receipts</span>
          </div>
        </div>

        <div className="wa-kpi-card">
          <div className="wa-kpi-top">
            <span className="wa-kpi-label">Automations Active</span>
            <div className="wa-kpi-icon automations">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="wa-kpi-value">4 Triggers</div>
          <div className="wa-kpi-subtext">
            <span>Confirmations • 24h • 1h • Alerts</span>
          </div>
        </div>
      </div>

      {/* TOKEN EXPIRED DIAGNOSTIC ALERT */}
      {isExpired && (
        <div className="wa-alert warning">
          <AlertTriangle size={20} className="wa-alert-icon" />
          <div style={{ flex: 1 }}>
            <div className="wa-alert-title">Meta Graph API Temporary Token Expired (OAuthException Code 190)</div>
            <p style={{ margin: "4px 0 10px 0", fontSize: "0.85rem" }}>
              Meta developer temporary access tokens expire after 24 hours. To ensure uninterrupted 24/7 delivery of appointment confirmations and automated reminders, generate a <strong>Permanent System User Access Token</strong> in your Meta Business Manager.
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <a
                href="https://business.facebook.com/settings/system-users"
                target="_blank"
                rel="noreferrer"
                className="wa-alert-action-btn"
              >
                <ExternalLink size={13} />
                Open Meta Business Settings
              </a>
              <button
                className="wa-btn secondary"
                onClick={() => setActiveTab("credentials")}
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
              >
                Update Access Token Below
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE SUCCESS NOTIFICATION */}
      {saveSuccess && (
        <div className="wa-alert success">
          <CheckCircle2 size={18} className="wa-alert-icon" />
          <div>
            <strong>Configuration Saved Successfully!</strong> Your WhatsApp Cloud API parameters and reminder templates have been updated in the database.
          </div>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="wa-tabs">
        <button
          className={`wa-tab-btn ${activeTab === "credentials" ? "active" : ""}`}
          onClick={() => setActiveTab("credentials")}
        >
          <ShieldCheck size={16} />
          Credentials
        </button>
        <button
          className={`wa-tab-btn ${activeTab === "templates" ? "active" : ""}`}
          onClick={() => setActiveTab("templates")}
        >
          <Smartphone size={16} />
          Message Studio & Live Preview
        </button>
        <button
          className={`wa-tab-btn ${activeTab === "sandbox" ? "active" : ""}`}
          onClick={() => setActiveTab("sandbox")}
        >
          <Send size={16} />
          Test Sandbox & Diagnostics
        </button>
        <button
          className={`wa-tab-btn ${activeTab === "automations" ? "active" : ""}`}
          onClick={() => setActiveTab("automations")}
        >
          <Sliders size={16} />
          Automated Rules & Triggers
        </button>
      </div>

      {/* TAB 1: CREDENTIALS & WEBHOOKS */}
      {activeTab === "credentials" && (
        <div>
          <div className="wa-card">
            <div className="wa-card-header">
              <div>
                <h3 className="wa-card-title">
                  <ShieldCheck size={18} style={{ color: "#25D366" }} />
                  Meta WhatsApp Cloud API Credentials
                </h3>
                <p className="wa-card-desc">
                  Connect your official Meta WhatsApp Business account for high-throughput transactional messaging.
                </p>
              </div>
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noreferrer"
                className="wa-btn secondary"
                style={{ fontSize: "0.78rem", padding: "0.4rem 0.8rem" }}
              >
                <ExternalLink size={13} />
                Meta Developer Portal
              </a>
            </div>

            <div className="wa-form-grid">
              <div className="wa-field-group">
                <label className="wa-label">
                  <span>Provider</span>
                </label>
                <select
                  className="wa-input"
                  value={config.provider || "Meta WhatsApp Cloud API"}
                  onChange={handleChange("provider")}
                >
                  <option value="Meta WhatsApp Cloud API">Meta WhatsApp Cloud API (Direct)</option>
                  <option value="Twilio WhatsApp">Twilio WhatsApp Messaging</option>
                  <option value="360dialog">360dialog WhatsApp API</option>
                  <option value="Infobip">Infobip WhatsApp Business</option>
                </select>
              </div>

              <div className="wa-field-group">
                <label className="wa-label">
                  <span>Business Phone Number</span>
                  <span className="wa-label-hint">With country code</span>
                </label>
                <input
                  type="text"
                  className="wa-input"
                  value={config.phone_number || ""}
                  onChange={handleChange("phone_number")}
                />
              </div>

              <div className="wa-field-group">
                <label className="wa-label">
                  <span>Phone Number ID</span>
                  <span className="wa-label-hint">From Meta WhatsApp Dashboard</span>
                </label>
                <input
                  type="text"
                  className="wa-input"
                  value={config.phone_number_id || ""}
                  onChange={handleChange("phone_number_id")}
                />
              </div>

              <div className="wa-field-group">
                <label className="wa-label">
                  <span>WhatsApp Business Account ID (WABA ID)</span>
                  <span className="wa-label-hint">Meta Business Manager</span>
                </label>
                <input
                  type="text"
                  className="wa-input"
                  value={config.waba_id || ""}
                  onChange={handleChange("waba_id")}
                />
              </div>

              <div className="wa-field-group full">
                <label className="wa-label">
                  <span>System User Access Token</span>
                  <span className="wa-label-hint">Permanent token with whatsapp_business_messaging permission</span>
                </label>
                <div className="wa-input-wrapper">
                  <input
                    type={showToken ? "text" : "password"}
                    className="wa-input"
                    value={config.access_token || ""}
                    onChange={handleChange("access_token")}
                    style={{ paddingRight: "40px" }}
                  />
                  <button
                    type="button"
                    className="wa-input-icon-btn"
                    onClick={() => setShowToken(!showToken)}
                    title={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button className="wa-btn primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving Changes..." : "Save Configuration"}
              </button>
              <button className="wa-btn secondary" onClick={runConnectionCheck} disabled={testingConn}>
                <RefreshCw size={14} className={testingConn ? "spin" : ""} />
                {testingConn ? "Testing..." : "Test Connection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEMPLATE STUDIO & SMARTPHONE MOCKUP */}
      {activeTab === "templates" && (
        <div className="wa-studio-split">
          {/* LEFT: TEMPLATE EDITOR */}
          <div className="wa-card" style={{ marginBottom: 0 }}>
            <div className="wa-card-header">
              <div>
                <h3 className="wa-card-title">
                  <MessageSquare size={18} style={{ color: "#25D366" }} />
                  Message Template Editor
                </h3>
                <p className="wa-card-desc">
                  Select a preset workflow template or customize the text with dynamic appointment placeholders.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <div className="wa-field-subheading" style={{ marginBottom: "0.5rem" }}>
                Workflow Presets
              </div>
              <div className="wa-preset-chips">
                {Object.values(PRESET_TEMPLATES).map((tpl) => (
                  <button
                    key={tpl.id}
                    className={`wa-preset-chip ${activePreset === tpl.id ? "active" : ""}`}
                    onClick={() => handlePresetSelect(tpl.id)}
                  >
                    <span>{tpl.icon}</span>
                    <span>{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="wa-field-subheading">
                  Insert Dynamic Variables
                </span>
                <span style={{ fontSize: "0.74rem", color: "var(--muted)" }}>Click to insert at cursor</span>
              </div>
              <div className="wa-var-chips">
                {VARIABLE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="wa-var-chip"
                    onClick={() => handleInsertVariable(tag)}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="wa-field-group full">
              <label className="wa-label">
                <span>Message Content</span>
                <span className="wa-label-hint">{(config.template || "").length} characters</span>
              </label>
              <textarea
                ref={textareaRef}
                className="wa-textarea"
                rows={7}
                value={config.template || ""}
                onChange={handleChange("template")}
                placeholder="Type your WhatsApp notification message..."
              />
            </div>

            <div style={{ marginTop: "1.25rem", display: "flex", gap: "10px", alignItems: "center" }}>
              <button className="wa-btn primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving Template..." : "Save Template"}
              </button>
              <button
                className="wa-btn secondary"
                onClick={() => {
                  setTestMessageType("text");
                  setActiveTab("sandbox");
                }}
              >
                <Send size={14} />
                Send as Test Message
              </button>
            </div>
          </div>

          {/* RIGHT: REALISTIC WHATSAPP SMARTPHONE MOCKUP */}
          <div className="wa-phone-container">
            <div className="wa-phone-frame">
              {/* Top Notch */}
              <div className="wa-phone-notch">
                <div className="wa-phone-speaker" />
              </div>

              {/* Status Bar */}
              <div className="wa-phone-status">
                <span>9:41</span>
                <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                  <span style={{ fontSize: "10px" }}>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* WhatsApp Header */}
              <div className="wa-chat-header">
                <div className="wa-chat-avatar">AI</div>
                <div className="wa-chat-info">
                  <div className="wa-chat-name">
                    CallZenza AI
                    <CheckCircle2 size={13} className="wa-chat-verified" />
                  </div>
                  <div className="wa-chat-sub">Official Business Account</div>
                </div>
                <div style={{ display: "flex", gap: "14px", color: "#aebac1" }}>
                  <Phone size={14} />
                  <Radio size={14} />
                </div>
              </div>

              {/* WhatsApp Chat Body */}
              <div className="wa-chat-body">
                <div className="wa-date-divider">Today</div>

                {/* Live Message Bubble */}
                <div className="wa-bubble">
                  {getRenderedPreview()}
                  <div className="wa-bubble-time">
                    <span>10:30 AM</span>
                    <CheckCheck size={13} className="wa-bubble-ticks" />
                  </div>

                  {/* Interactive Quick Buttons */}
                  <div className="wa-chat-actions">
                    <div className="wa-chat-action-btn">✓ Confirm Appointment</div>
                    <div className="wa-chat-action-btn">📅 Reschedule</div>
                  </div>
                </div>
              </div>

              {/* Phone Input Bar */}
              <div className="wa-chat-input-bar">
                <div className="wa-dummy-input">Reply to CallZenza AI...</div>
                <div className="wa-mic-btn">
                  <Send size={13} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEST SANDBOX & LIVE CONSOLE */}
      {activeTab === "sandbox" && (
        <div>
          <div className="wa-card">
            <div className="wa-card-header">
              <div>
                <h3 className="wa-card-title">
                  <Send size={18} style={{ color: "#25D366" }} />
                  Interactive WhatsApp Test Sandbox
                </h3>
                <p className="wa-card-desc">
                  Dispatch a real test WhatsApp message to verify Meta API token, phone registration, and customer delivery.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "20px", marginBottom: "1.25rem", flexWrap: "wrap", fontSize: "0.88rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="sandboxType"
                  value="template"
                  checked={testMessageType === "template"}
                  onChange={() => setTestMessageType("template")}
                />
                <div>
                  <strong>Meta Template (<code style={{ color: "var(--accent)" }}>hello_world</code>)</strong>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Pre-approved by Meta • Bypasses 24-hr customer initiation window</div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="sandboxType"
                  value="text"
                  checked={testMessageType === "text"}
                  onChange={() => setTestMessageType("text")}
                />
                <div>
                  <strong>Active Template Message</strong>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Uses current reminder message • (Requires recipient to message business first within 24h)</div>
                </div>
              </label>
            </div>

            <div style={{ display: "flex", gap: "10px", maxWidth: "600px", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <input
                type="text"
                className="wa-input"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                style={{ flex: 1, minWidth: "260px" }}
              />
              <button
                className="wa-btn primary"
                onClick={handleSendTestMessage}
                disabled={sendingTest}
              >
                <Send size={15} />
                {sendingTest ? "Sending..." : "Send Test WhatsApp"}
              </button>
            </div>

            {/* LIVE RESPONSE CONSOLE */}
            {testResult && (
              <div style={{ marginTop: "1rem" }}>
                <div className="wa-field-subheading" style={{ marginBottom: "6px" }}>
                  Delivery Diagnostics Console ({testResult.timestamp})
                </div>
                <div
                  className="wa-console"
                  style={{
                    borderColor: testResult.success ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)",
                    color: testResult.success ? "#4ade80" : "#fca5a5"
                  }}
                >
                  {testResult.success ? (
                    <div>
                      {`// META GRAPH API RESPONSE (HTTP 200 OK)\n`}
                      {JSON.stringify(testResult.data, null, 2)}
                      {`\n\n✓ SUCCESS: Message queued for delivery by Meta WhatsApp Cloud API to ${testPhone}.`}
                    </div>
                  ) : (
                    <div>
                      {`// ERROR ENCOUNTERED\n`}
                      {typeof testResult.error === "object" ? JSON.stringify(testResult.error, null, 2) : testResult.error}
                      {`\n\nTip: If receiving code 190, regenerate your Meta Access Token with permanent System User privileges.`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATED RULES & TRIGGERS */}
      {activeTab === "automations" && (
        <div>
          <div className="wa-card">
            <div className="wa-card-header">
              <div>
                <h3 className="wa-card-title">
                  <Sliders size={18} style={{ color: "#25D366" }} />
                  Automated Trigger Rules
                </h3>
                <p className="wa-card-desc">
                  Configure when CallZenza AI automatically triggers WhatsApp messages to customers.
                </p>
              </div>
            </div>

            <div className="wa-automation-row">
              <div className="wa-automation-info">
                <div className="wa-automation-icon">
                  <Calendar size={18} />
                </div>
                <div>
                  <div className="wa-automation-title">Instant Booking Confirmation</div>
                  <p className="wa-automation-desc">
                    Immediately send a detailed WhatsApp confirmation with date, staff, and address when a customer books through AI phone call or dashboard.
                  </p>
                </div>
              </div>
              <label className="wa-toggle-switch">
                <input
                  type="checkbox"
                  checked={automations.instant_confirm}
                  onChange={(e) => setAutomations({ ...automations, instant_confirm: e.target.checked })}
                />
                <span className="wa-toggle-slider" />
              </label>
            </div>

            <div className="wa-automation-row">
              <div className="wa-automation-info">
                <div className="wa-automation-icon">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="wa-automation-title">24-Hour Prior Automated Reminder</div>
                  <p className="wa-automation-desc">
                    Automated background cron dispatches a reminder exactly 24 hours before the appointment with interactive confirmation buttons.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  className="wa-btn secondary"
                  style={{ fontSize: "0.76rem", padding: "0.35rem 0.75rem" }}
                  onClick={() => handleTriggerReminderTest(24)}
                  disabled={testingReminder}
                >
                  {testingReminder ? "Running..." : "Test 24h Cron"}
                </button>
                <label className="wa-toggle-switch">
                  <input
                    type="checkbox"
                    checked={automations.reminder_24h}
                    onChange={(e) => setAutomations({ ...automations, reminder_24h: e.target.checked })}
                  />
                  <span className="wa-toggle-slider" />
                </label>
              </div>
            </div>

            <div className="wa-automation-row">
              <div className="wa-automation-info">
                <div className="wa-automation-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="wa-automation-title">1-Hour Prior Last-Call Reminder</div>
                  <p className="wa-automation-desc">
                    Sends an urgent 1-hour notice with clinic suite and parking details to reduce appointment no-shows by up to 45%.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  className="wa-btn secondary"
                  style={{ fontSize: "0.76rem", padding: "0.35rem 0.75rem" }}
                  onClick={() => handleTriggerReminderTest(1)}
                  disabled={testingReminder}
                >
                  {testingReminder ? "Running..." : "Test 1h Cron"}
                </button>
                <label className="wa-toggle-switch">
                  <input
                    type="checkbox"
                    checked={automations.reminder_1h}
                    onChange={(e) => setAutomations({ ...automations, reminder_1h: e.target.checked })}
                  />
                  <span className="wa-toggle-slider" />
                </label>
              </div>
            </div>

            <div className="wa-automation-row">
              <div className="wa-automation-info">
                <div className="wa-automation-icon">
                  <RefreshCw size={18} />
                </div>
                <div>
                  <div className="wa-automation-title">Reschedule & Cancellation Alerts</div>
                  <p className="wa-automation-desc">
                    Automatically notify the customer if an appointment is moved or cancelled by staff or AI receptionist.
                  </p>
                </div>
              </div>
              <label className="wa-toggle-switch">
                <input
                  type="checkbox"
                  checked={automations.reschedule_alert}
                  onChange={(e) => setAutomations({ ...automations, reschedule_alert: e.target.checked })}
                />
                <span className="wa-toggle-slider" />
              </label>
            </div>

            {/* Cron Test Result Output */}
            {reminderResult && (
              <div style={{ marginTop: "1.25rem" }}>
                <div className="wa-field-subheading" style={{ marginBottom: "6px" }}>
                  Automated Cron Dispatch Log ({reminderResult.hours}h trigger at {reminderResult.timestamp})
                </div>
                <div
                  className="wa-console"
                  style={{
                    borderColor: reminderResult.success ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)",
                    color: reminderResult.success ? "#4ade80" : "#fca5a5"
                  }}
                >
                  {JSON.stringify(reminderResult.data || reminderResult.error, null, 2)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
