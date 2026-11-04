import { useState, useEffect } from "react";
import "./email.css";
import {
  getEmailConfig,
  updateEmailConfig,
  validateEmailConnection,
  sendTestEmail,
  getRecentEmailLogs,
} from "../../services/email.service.js";
import {
  Mail,
  Zap,
  Send,
  Save,
  RefreshCw,
  User,
  Briefcase,
  Check,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  RotateCcw,
  Lightbulb,
  ExternalLink,
} from "lucide-react";

const DEFAULT_CUSTOMER_TEMPLATE = `Hello {{customer_name}},

Your {{booking_purpose}} has been confirmed with {{organization_name}}.

Booking Details:
  Reference ID: #{{booking_ref}}
  Purpose: {{booking_purpose}}
  Staff / Specialist: {{staff_name}}
  Service / Product: {{service_product}}
  Date: {{date}}
  Time: {{time}}

Location & Contact:
  Organization: {{organization_name}}
  Contact: {{organization_contact}}

Thank you for choosing {{organization_name}}!
If you need to reschedule or cancel, please contact us.`;

const DEFAULT_STAFF_TEMPLATE = `Hello {{staff_name}},

A new {{booking_purpose}} has been booked and assigned to you at {{organization_name}}.

Booking & Customer Details:
  Reference ID: #{{booking_ref}}
  Customer Name: {{customer_name}}
  Customer Phone: {{customer_phone}}
  Customer Email: {{customer_email}}
  Booking Purpose: {{booking_purpose}}
  Service / Product: {{service_product}}
  Date: {{date}}
  Time: {{time}}

Please review your schedule and prepare accordingly.`;

const CUSTOMER_VARIABLES = [
  "customer_name",
  "customer_phone",
  "customer_email",
  "booking_ref",
  "booking_purpose",
  "staff_name",
  "service_product",
  "date",
  "time",
  "organization_name",
  "organization_contact",
];

const STAFF_VARIABLES = [
  "staff_name",
  "customer_name",
  "customer_phone",
  "customer_email",
  "booking_ref",
  "booking_purpose",
  "service_product",
  "date",
  "time",
  "organization_name",
];

export default function Email() {
  const [config, setConfig] = useState({
    provider: "Resend",
    api_key: "",
    from_email: "onboarding@resend.dev",
    smtp_host: "smtp.gmail.com",
    smtp_port: "587",
    email_address: "",
    password: "",
    sender_name: "AI Receptionist",
    encryption: "TLS",
    template: DEFAULT_CUSTOMER_TEMPLATE,
    staff_template: DEFAULT_STAFF_TEMPLATE,
    is_active: false,
    connection_status: "NOT_CONFIGURED",
    missing_fields: [],
  });

  const [activeTab, setActiveTab] = useState("customer"); // "customer" | "staff"
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      // 1. Check local cache
      const cached = localStorage.getItem("receptionist_email_config");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setConfig((prev) => ({ ...prev, ...parsed }));
          if (parsed.email_address) setTestEmail(parsed.email_address);
        } catch (e) {
          console.error("Failed to parse cached email config", e);
        }
      }

      // 2. Fetch fresh config from backend
      try {
        const data = await getEmailConfig();
        if (data) {
          const updated = {
            ...data,
            provider: data.provider || "Resend",
            from_email: data.from_email || "onboarding@resend.dev",
            template: data.template || DEFAULT_CUSTOMER_TEMPLATE,
            staff_template: data.staff_template || DEFAULT_STAFF_TEMPLATE,
          };
          setConfig((prev) => ({ ...prev, ...updated }));
          if (data.email_address) setTestEmail(data.email_address);
          localStorage.setItem("receptionist_email_config", JSON.stringify(updated));
        }
      } catch (err) {
        console.error("Failed to load email config from backend", err);
      }

      // 3. Fetch recent email notification logs
      loadLogs();
    }
    loadConfig();
  }, []);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await getRecentEmailLogs(15);
      if (Array.isArray(logs)) {
        setRecentLogs(logs);
      }
    } catch (err) {
      console.error("Failed to fetch email logs", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleChange = (field) => (e) => {
    setConfig({ ...config, [field]: e.target.value });
  };

  const handleProviderSelect = (prov) => {
    setConfig((prev) => ({
      ...prev,
      provider: prov,
      from_email:
        prov === "Resend"
          ? "onboarding@resend.dev"
          : prov === "SendGrid"
          ? "receptionist@yourdomain.com"
          : prev.email_address || "",
    }));
    setConnResult(null);
  };

  const handleInsertVariable = (varName) => {
    const placeholder = `{{${varName}}}`;
    if (activeTab === "customer") {
      setConfig((prev) => ({
        ...prev,
        template: (prev.template || "") + " " + placeholder,
      }));
    } else {
      setConfig((prev) => ({
        ...prev,
        staff_template: (prev.staff_template || "") + " " + placeholder,
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const updated = await updateEmailConfig(config);
      setConfig((prev) => ({ ...prev, ...updated }));
      localStorage.setItem("receptionist_email_config", JSON.stringify(updated));
      setMessage("Configuration saved successfully!");
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      console.error(err);
      alert("Failed to save configuration: " + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConn(true);
    setConnResult(null);
    try {
      const res = await validateEmailConnection(config);
      setConnResult(res);
      if (res.connected) {
        setConfig((prev) => ({ ...prev, is_active: true, connection_status: "ACTIVE" }));
      }
    } catch (err) {
      console.error(err);
      setConnResult({
        connected: false,
        error:
          err.response?.data?.detail ||
          err.response?.data?.error ||
          err.message ||
          "Connection test failed",
      });
    } finally {
      setTestingConn(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      setTestResult({ sent: false, error: "Please enter a recipient email address" });
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await sendTestEmail({
        to: testEmail,
        subject: `AI Receptionist — Test Verification (${config.provider})`,
        body: `Hello!\n\nThis is a verified test email sent from CallZenza AI Receptionist using ${config.provider}.\n\nIf you received this message, your email provider configuration is working properly.\n\nTime: ${new Date().toLocaleString()}`,
      });
      setTestResult(res);
      // Refresh logs after sending test
      setTimeout(loadLogs, 1000);
    } catch (err) {
      console.error(err);
      setTestResult({
        sent: false,
        error:
          err.response?.data?.detail?.error ||
          err.response?.data?.detail ||
          err.message ||
          "Failed to send test email",
      });
    } finally {
      setSendingTest(false);
    }
  };

  // Determine accurate status pill
  const getStatusDisplay = () => {
    if (testingConn) {
      return (
        <div className="email-status-pill untested">
          <RefreshCw size={13} className="spin" /> VERIFYING...
        </div>
      );
    }
    if (connResult?.connected) {
      return (
        <div className="email-status-pill connected">
          <CheckCircle2 size={14} /> {config.provider.toUpperCase()} VERIFIED & ACTIVE
        </div>
      );
    }
    if (connResult && !connResult.connected) {
      return (
        <div className="email-status-pill error">
          <AlertTriangle size={14} /> CONNECTION FAILED
        </div>
      );
    }
    if (config.connection_status === "ACTIVE" || config.is_active) {
      return (
        <div className="email-status-pill connected">
          <CheckCircle2 size={14} /> {config.provider.toUpperCase()} CONFIGURED
        </div>
      );
    }
    if (config.connection_status === "INCOMPLETE") {
      return (
        <div className="email-status-pill incomplete">
          <AlertTriangle size={14} /> CONFIG INCOMPLETE
        </div>
      );
    }
    return (
      <div className="email-status-pill untested">
        ○ NOT TESTED
      </div>
    );
  };

  return (
    <div className="email-container">
      {/* HEADER */}
      <div className="email-header">
        <div className="email-title-area">
          <h1>
            <span className="email-brand-icon">
              <Mail size={22} />
            </span>
            Email Configuration & Notifications
          </h1>
          <p className="email-subtitle">
            Configure email delivery for automatic customer booking confirmations and assigned staff
            notifications.
          </p>
        </div>
        <div>{getStatusDisplay()}</div>
      </div>

      {/* CLOUD HOSTING NOTICE */}
      <div className="notice-box">
        <div className="notice-box-icon">
          <Lightbulb size={20} />
        </div>
        <div>
          <strong>Deployment Tip:</strong> Resend and SendGrid APIs use secure{" "}
          <strong>HTTPS Port 443</strong>, which is never blocked by cloud platforms, firewalls, or
          residential networks (unlike classic SMTP ports 587/465).
        </div>
      </div>

      {/* CARD 1: PROVIDER SELECTION & CREDENTIALS */}
      <div className="email-card">
        <div className="email-card-title">1. Email Delivery Provider</div>
        <p className="email-card-desc">
          Select the email service to use for sending automated customer confirmations and staff
          booking alerts.
        </p>

        <div className="provider-grid">
          <div
            className={`provider-card ${config.provider === "Resend" ? "active" : ""}`}
            onClick={() => handleProviderSelect("Resend")}
          >
            <div className="provider-icon-badge resend">
              <Zap size={20} />
            </div>
            <div className="provider-info">
              <h4>Resend API</h4>
              <p>Recommended • HTTPS Port 443</p>
            </div>
            {config.provider === "Resend" && (
              <span className="provider-active-check">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>

          <div
            className={`provider-card ${config.provider === "SendGrid" ? "active" : ""}`}
            onClick={() => handleProviderSelect("SendGrid")}
          >
            <div className="provider-icon-badge sendgrid">
              <Send size={20} />
            </div>
            <div className="provider-info">
              <h4>SendGrid API</h4>
              <p>Twilio • HTTPS Port 443</p>
            </div>
            {config.provider === "SendGrid" && (
              <span className="provider-active-check">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>

          <div
            className={`provider-card ${config.provider === "SMTP" ? "active" : ""}`}
            onClick={() => handleProviderSelect("SMTP")}
          >
            <div className="provider-icon-badge smtp">
              <Mail size={20} />
            </div>
            <div className="provider-info">
              <h4>SMTP / Gmail</h4>
              <p>Standard Port 587/465</p>
            </div>
            {config.provider === "SMTP" && (
              <span className="provider-active-check">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </div>
        </div>

        {/* PROVIDER CREDENTIAL FIELDS */}
        <div className="email-form-grid">
          {(config.provider === "Resend" || config.provider === "SendGrid") && (
            <>
              <div className="email-form-group col-span-2">
                <label>
                  <span>{config.provider} API Key</span>
                  <a
                    href={
                      config.provider === "Resend"
                        ? "https://resend.com/api-keys"
                        : "https://app.sendgrid.com/settings/api_keys"
                    }
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: "var(--accent, #0284c7)",
                      fontSize: "12px",
                      textDecoration: "underline",
                      fontWeight: "normal",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    Get API Key <ExternalLink size={11} />
                  </a>
                </label>
                <div className="email-input-wrapper">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={config.api_key || ""}
                    onChange={handleChange("api_key")}
                  />
                  <button
                    type="button"
                    className="email-input-icon-btn"
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? "Hide API key" : "Show API key"}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="email-form-group">
                <label>From Email Address</label>
                <input
                  placeholder={
                    config.provider === "Resend"
                      ? "onboarding@resend.dev"
                      : "receptionist@yourdomain.com"
                  }
                  value={config.from_email || ""}
                  onChange={handleChange("from_email")}
                />
              </div>

              <div className="email-form-group">
                <label>Sender Name</label>
                <input
                  placeholder="AI Receptionist"
                  value={config.sender_name || ""}
                  onChange={handleChange("sender_name")}
                />
              </div>
            </>
          )}

          {config.provider === "SMTP" && (
            <>
              <div className="email-form-group">
                <label>SMTP Host</label>
                <input
                  placeholder="smtp.gmail.com"
                  value={config.smtp_host || ""}
                  onChange={handleChange("smtp_host")}
                />
              </div>

              <div className="email-form-group">
                <label>SMTP Port</label>
                <input
                  placeholder="587"
                  value={config.smtp_port || ""}
                  onChange={handleChange("smtp_port")}
                />
              </div>

              <div className="email-form-group">
                <label>Encryption Protocol</label>
                <select
                  value={config.encryption || "TLS"}
                  onChange={handleChange("encryption")}
                >
                  <option value="TLS">TLS (Recommended - Port 587)</option>
                  <option value="SSL">SSL (Port 465)</option>
                </select>
              </div>

              <div className="email-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="reception@company.com"
                  value={config.email_address || ""}
                  onChange={handleChange("email_address")}
                />
              </div>

              <div className="email-form-group">
                <label>Password / App Password</label>
                <div className="email-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••••••"
                    value={config.password || ""}
                    onChange={handleChange("password")}
                  />
                  <button
                    type="button"
                    className="email-input-icon-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="email-form-group">
                <label>Sender Name</label>
                <input
                  placeholder="AI Receptionist"
                  value={config.sender_name || ""}
                  onChange={handleChange("sender_name")}
                />
              </div>
            </>
          )}
        </div>

        {/* SAVE & TEST CONNECTION BUTTONS */}
        <div className="email-actions">
          <button className="email-btn primary" onClick={handleSave} disabled={saving}>
            <Save size={15} />
            {saving ? "Saving Configuration..." : "Save Configuration"}
          </button>
          <button
            className="email-btn secondary"
            onClick={handleTestConnection}
            disabled={testingConn}
          >
            <RefreshCw size={14} className={testingConn ? "spin" : ""} />
            {testingConn ? "Testing..." : "Test Connection"}
          </button>
          {message && (
            <span style={{ color: "#16a34a", fontSize: "13px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle2 size={14} /> {message}
            </span>
          )}
        </div>

        {/* CONNECTION RESULT FEEDBACK */}
        {connResult && (
          <div className={`email-alert ${connResult.connected ? "success" : "error"}`}>
            <span>{connResult.connected ? "✓" : "✕"}</span>
            <div>
              {connResult.connected ? (
                <div>
                  <strong>Connection Successful!</strong> Connected to {connResult.provider}.{" "}
                  {connResult.note || ""}
                </div>
              ) : (
                <div>
                  <strong>Connection Failed:</strong>{" "}
                  {connResult.error || JSON.stringify(connResult)}
                  {connResult.missing_fields && (
                    <div style={{ marginTop: "4px", fontSize: "12px", opacity: 0.9 }}>
                      Missing required fields: {connResult.missing_fields.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CARD 2: DUAL NOTIFICATION TEMPLATES (CUSTOMER + STAFF) */}
      <div className="email-card">
        <div className="email-card-title">2. Notification Templates</div>
        <p className="email-card-desc">
          Customize the dynamic email templates sent to the customer and the assigned staff member.
          Click any variable pill to insert it into the active template.
        </p>

        {/* TEMPLATE SWITCHER TABS */}
        <div className="template-tabs">
          <button
            type="button"
            className={`template-tab-btn ${activeTab === "customer" ? "active" : ""}`}
            onClick={() => setActiveTab("customer")}
          >
            <User size={15} /> Customer Confirmation Template
          </button>
          <button
            type="button"
            className={`template-tab-btn ${activeTab === "staff" ? "active" : ""}`}
            onClick={() => setActiveTab("staff")}
          >
            <Briefcase size={15} /> Staff Notification Template
          </button>
        </div>

        {/* VARIABLE PILLS */}
        <div style={{ marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "12px", color: "var(--muted, #64748b)", marginRight: "8px", fontWeight: "600" }}>
            Available Placeholders (Click to insert):
          </span>
        </div>
        <div className="var-pill-container">
          {(activeTab === "customer" ? CUSTOMER_VARIABLES : STAFF_VARIABLES).map((v) => (
            <span
              key={v}
              className="var-pill"
              onClick={() => handleInsertVariable(v)}
              title={`Click to insert {{${v}}}`}
            >
              + {`{{${v}}}`}
            </span>
          ))}
        </div>

        {/* TEMPLATE TEXTAREA */}
        <div className="email-form-group full" style={{ marginTop: "0.75rem" }}>
          {activeTab === "customer" ? (
            <textarea
              rows="9"
              value={config.template || ""}
              onChange={handleChange("template")}
              placeholder="Enter customer confirmation email template..."
            />
          ) : (
            <textarea
              rows="9"
              value={config.staff_template || ""}
              onChange={handleChange("staff_template")}
              placeholder="Enter staff assignment notification email template..."
            />
          )}
        </div>

        <div className="email-actions" style={{ marginTop: "1.25rem" }}>
          <button className="email-btn primary" onClick={handleSave} disabled={saving}>
            <Save size={15} />
            {saving ? "Saving Templates..." : "Save Templates"}
          </button>
          <button
            className="email-btn secondary"
            type="button"
            onClick={() => {
              if (activeTab === "customer") {
                setConfig((prev) => ({ ...prev, template: DEFAULT_CUSTOMER_TEMPLATE }));
              } else {
                setConfig((prev) => ({ ...prev, staff_template: DEFAULT_STAFF_TEMPLATE }));
              }
            }}
          >
            <RotateCcw size={14} /> Reset to Default Template
          </button>
        </div>
      </div>

      {/* CARD 3: SEND TEST EMAIL */}
      <div className="email-card">
        <div className="email-card-title">3. Send Test Email</div>
        <p className="email-card-desc">
          Send a real verification email to any inbox to verify that delivery and firewall rules are
          functioning.
        </p>

        <div style={{ display: "flex", gap: "10px", maxWidth: "560px", flexWrap: "wrap" }}>
          <input
            type="email"
            placeholder="Enter destination email (e.g. test@gmail.com)"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="email-test-input"
          />
          <button
            className="email-btn primary"
            onClick={handleSendTestEmail}
            disabled={sendingTest}
          >
            <Send size={15} />
            {sendingTest ? "Sending..." : "Send Test Email"}
          </button>
        </div>

        {testResult && (
          <div className={`email-alert ${testResult.sent ? "success" : "error"}`}>
            <span>{testResult.sent ? "✓" : "✕"}</span>
            <div>
              {testResult.sent ? (
                <div>
                  <strong>Email Sent Successfully!</strong> Verified delivery to <em>{testResult.to}</em>.
                  {testResult.id && ` (Message ID: ${testResult.id})`}
                </div>
              ) : (
                <div>
                  <strong>Delivery Failed:</strong>{" "}
                  {typeof testResult.error === "object"
                    ? JSON.stringify(testResult.error)
                    : testResult.error}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CARD 4: RECENT NOTIFICATION AUDIT */}
      <div className="email-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="email-card-title" style={{ margin: 0 }}>
            4. Real-Time Notification Audit
          </div>
          <button
            className="email-btn secondary"
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
            onClick={loadLogs}
            disabled={loadingLogs}
          >
            <RefreshCw size={13} className={loadingLogs ? "spin" : ""} />
            {loadingLogs ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <p className="email-card-desc">
          Audits real-time email dispatches to both customers and assigned staff members.
        </p>

        {recentLogs && recentLogs.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table className="email-logs-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Contact Email</th>
                  <th>Booking Ref</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className={`recipient-badge ${log.recipient_type || "customer"}`}>
                        {log.recipient_type || "customer"}
                      </span>
                    </td>
                    <td>{log.recipient_contact || "N/A"}</td>
                    <td>#{log.appointment_id || "—"}</td>
                    <td style={{ maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.subject || log.action || "Notification"}
                    </td>
                    <td>
                      <span className={`status-tag ${log.status || "sent"}`}>
                        {log.status === "sent" ? "✓ Sent" : "✕ Failed"}
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: "var(--muted)", fontSize: "0.85rem", padding: "1rem 0" }}>
            No recent email notifications recorded yet. Automated customer and staff booking emails will appear here immediately after each booking.
          </div>
        )}
      </div>
    </div>
  );
}
