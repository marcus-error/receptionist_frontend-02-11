import { useState, useEffect, useCallback } from "react";
import telephonyService from "../../services/telephony.service";
import "./sipTelephony.css";

// Public backend base for webhook URLs (falls back to localhost:8000 for dev)
const BACKEND_BASE = "https://vrapi.aminoid.in";

const REG_STATUS_LABELS = {
  registered:   { text: "REGISTERED",    color: "var(--badge-green-fg)",  dot: "green" },
  registering:  { text: "REGISTERING…",  color: "var(--warning, #f59e0b)", dot: "yellow" },
  unregistered: { text: "UNREGISTERED",  color: "var(--danger)",           dot: "red" },
  error:        { text: "ERROR",          color: "var(--danger)",           dot: "red" },
};

const emptyForm = {
  account_name: "",
  sip_server: "",
  sip_proxy: "",
  sip_username: "",
  domain: "",
  login: "",
  sip_password: "",
  display_name: "",
  voicemail_number: "",
  dialing_prefix: "",
  dial_plan: "",
  hide_caller_id: "Disabled",
  media_encryption: "Disabled",
  transport: "UDP",
  public_address: "Auto",
  register_refresh: 300,
  keep_alive: 15,
  publish_presence: false,
  allow_ip_rewrite: false,
  ice: false,
  disable_session_timers: false,
  sip_host: "",
  sip_port: 5060,
  did_number: "",
};

export default function Telephony() {
  const [form, setForm] = useState(emptyForm);
  const [configs, setConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [activatingId, setActivatingId] = useState(null);
  const [deactivatingId, setDeactivatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Network probe status
  const [status, setStatus] = useState("disconnected");
  const [latencyMs, setLatencyMs] = useState(null);
  const [connectionDetail, setConnectionDetail] = useState(null);
  const [lastConnectedAt, setLastConnectedAt] = useState(null);
  const [liveStats, setLiveStats] = useState({ total_calls: 0, active_calls: 0, last_call_at: null });

  // SIP UA Registration status
  const [regStatus, setRegStatus] = useState("unregistered");
  const [regDetail, setRegDetail]   = useState("Not yet registered");
  const [regRegisteredAt, setRegRegisteredAt] = useState(null);
  const [regErrorMsg, setRegErrorMsg] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [unregistering, setUnregistering] = useState(false);

  // UI flags
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [e2eTesting, setE2eTesting] = useState(false);
  const [e2eResults, setE2eResults] = useState(null);
  const [feedback, setFeedback]   = useState(null);
  const [copied, setCopied]       = useState({ inbound: false, audio: false, hangup: false });

  // ── Populate Form from Config Record ──────────────────────────────────────
  const populateFormWith = (data) => {
    if (!data) return;
    setForm({
      account_name:           data.account_name || "",
      sip_server:             data.sip_server || "",
      sip_proxy:              data.sip_proxy || "",
      sip_username:           data.sip_username || "",
      domain:                 data.domain || "",
      login:                  data.login || "",
      sip_password:           "",
      display_name:           data.display_name || "",
      voicemail_number:       data.voicemail_number || "",
      dialing_prefix:         data.dialing_prefix || "",
      dial_plan:              data.dial_plan || "",
      hide_caller_id:         data.hide_caller_id || "Disabled",
      media_encryption:       data.media_encryption || "Disabled",
      transport:              data.transport || "UDP",
      public_address:         data.public_address || "Auto",
      register_refresh:       data.register_refresh ?? 300,
      keep_alive:             data.keep_alive ?? 15,
      publish_presence:       Boolean(data.publish_presence),
      allow_ip_rewrite:       Boolean(data.allow_ip_rewrite),
      ice:                    Boolean(data.ice),
      disable_session_timers: Boolean(data.disable_session_timers),
      sip_host:               data.sip_host || "",
      sip_port:               data.sip_port || 5060,
      did_number:             data.did_number || "",
    });
    setHasExistingPassword(Boolean(data.has_password));
    setStatus(data.status || "disconnected");
    setLatencyMs(data.latency_ms || null);
    setConnectionDetail(data.connection_detail || null);
    setLastConnectedAt(data.last_connected_at || null);
    setLiveStats({
      total_calls:  data.total_calls  || 0,
      active_calls: data.active_calls || 0,
      last_call_at: data.last_call_at || null,
    });
    if (data.registration_status) {
      setRegStatus(data.registration_status);
      setRegDetail(data.registration_detail || "");
      setRegRegisteredAt(data.last_registered_at || null);
    }
  };

  // ── Load All Configurations from DB ───────────────────────────────────────
  const loadAllConfigs = useCallback(async (preferredId = null) => {
    try {
      setLoading(true);
      const list = await telephonyService.listSipConfigs();
      const safeList = Array.isArray(list) ? list : [];
      setConfigs(safeList);

      let target = null;
      if (preferredId) {
        target = safeList.find((c) => c.id === preferredId);
      }
      if (!target) {
        // Prefer currently active configuration
        target = safeList.find((c) => c.is_active);
      }
      if (!target && safeList.length > 0) {
        target = safeList[0];
      }

      if (target) {
        setSelectedConfigId(target.id);
        setIsCreatingNew(false);
        populateFormWith(target);
      } else {
        setSelectedConfigId(null);
        setIsCreatingNew(true);
        setForm(emptyForm);
        setHasExistingPassword(false);
      }
    } catch (err) {
      console.error("Failed to load SIP configurations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load Registration Status (live poll) ───────────────────────────────────
  const loadRegStatus = useCallback(async () => {
    try {
      const data = await telephonyService.getRegistrationStatus();
      setRegStatus(data.status || "unregistered");
      setRegDetail(data.detail || "");
      setRegRegisteredAt(data.registered_at || null);
      setRegErrorMsg(data.error_message || null);
      setLiveStats(prev => ({ ...prev, active_calls: data.active_calls ?? prev.active_calls }));
    } catch (err) {
      // silent — might be loading
    }
  }, []);

  useEffect(() => {
    loadAllConfigs();
  }, [loadAllConfigs]);

  // Poll registration status every 5 s while registering
  useEffect(() => {
    if (regStatus !== "registering") return;
    const interval = setInterval(() => loadRegStatus(), 5000);
    return () => clearInterval(interval);
  }, [regStatus, loadRegStatus]);

  const handleChange = (field) => (e) => {
    const val = e.target.type === "checkbox"
      ? e.target.checked
      : e.target.type === "number"
      ? (e.target.value === "" ? "" : Number(e.target.value))
      : e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
    if (feedback) setFeedback(null);
  };

  // ── Save SIP Configuration (Does NOT Activate) ────────────────────────────
  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const payload = {
        account_name:           form.account_name,
        sip_server:             form.sip_server,
        sip_proxy:              form.sip_proxy,
        sip_username:           form.sip_username,
        domain:                 form.domain,
        login:                  form.login,
        display_name:           form.display_name,
        voicemail_number:       form.voicemail_number,
        dialing_prefix:         form.dialing_prefix,
        dial_plan:              form.dial_plan,
        hide_caller_id:         form.hide_caller_id,
        media_encryption:       form.media_encryption,
        transport:              form.transport,
        public_address:         form.public_address,
        register_refresh:       Number(form.register_refresh || 300),
        keep_alive:             Number(form.keep_alive || 15),
        publish_presence:       form.publish_presence,
        allow_ip_rewrite:       form.allow_ip_rewrite,
        ice:                    form.ice,
        disable_session_timers: form.disable_session_timers,
        sip_host:               form.domain || form.sip_proxy || form.sip_server || form.sip_host,
        sip_port:               form.sip_port ? Number(form.sip_port) : 5060,
        did_number:             form.did_number || undefined,
      };
      if (form.sip_password) payload.sip_password = form.sip_password;

      let res;
      if (isCreatingNew || !selectedConfigId) {
        res = await telephonyService.createSipConfig(payload);
        setIsCreatingNew(false);
        setSelectedConfigId(res.id);
      } else {
        res = await telephonyService.updateSipConfigById(selectedConfigId, payload);
      }

      populateFormWith(res);
      await loadAllConfigs(res.id);

      if (res.is_active) {
        setFeedback({
          type: "success",
          message: `SIP configuration updated & synchronized (Active Trunk).`,
        });
      } else {
        setFeedback({
          type: "success",
          message: `SIP configuration saved! Note: Status is INACTIVE. Click "Activate" whenever you want this configuration to handle calls.`,
        });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.detail || err.message || "Failed to save configuration.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Explicit Activate SIP Configuration ───────────────────────────────────
  const handleActivateConfig = async (cfgId) => {
    const id = cfgId || selectedConfigId;
    if (!id) return;
    setActivatingId(id);
    setFeedback(null);
    try {
      const res = await telephonyService.activateSipConfig(id);
      populateFormWith(res);
      await loadAllConfigs(id);
      setFeedback({
        type: "success",
        message: `SIP Configuration #${id} successfully ACTIVATED! Trunk is now live for phone calls.`,
      });
      setTimeout(() => loadRegStatus(), 3000);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.detail || err.message || "Failed to activate SIP configuration.",
      });
    } finally {
      setActivatingId(null);
    }
  };

  // ── Explicit Deactivate SIP Configuration ─────────────────────────────────
  const handleDeactivateConfig = async (cfgId) => {
    const id = cfgId || selectedConfigId;
    setDeactivatingId(id || "current");
    setFeedback(null);
    try {
      const res = await telephonyService.deactivateSipConfig(id);
      populateFormWith(res);
      await loadAllConfigs(id);
      setFeedback({
        type: "success",
        message: `SIP Configuration deactivated successfully. SIP Trunk unregistered.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.detail || err.message || "Failed to deactivate SIP configuration.",
      });
    } finally {
      setDeactivatingId(null);
    }
  };

  // ── Delete SIP Configuration ──────────────────────────────────────────────
  const handleDeleteConfig = async (cfgId) => {
    const id = cfgId || selectedConfigId;
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete SIP configuration #${id}?`)) {
      return;
    }
    setDeletingId(id);
    setFeedback(null);
    try {
      await telephonyService.deleteSipConfig(id);
      setFeedback({
        type: "success",
        message: `SIP configuration #${id} deleted successfully.`,
      });
      await loadAllConfigs();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.detail || err.message || "Failed to delete configuration.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // ── Test Connection ────────────────────────────────────────────────────────
  const handleTestConnection = async () => {
    const targetHost = form.domain || form.sip_proxy || form.sip_server || form.sip_host;
    if (!targetHost) {
      setFeedback({ type: "error", message: "Please enter a Domain or SIP Proxy / Server first." });
      return;
    }
    setTesting(true);
    setFeedback(null);
    try {
      const res = await telephonyService.testSipConnection({
        sip_host:     targetHost,
        domain:       form.domain,
        sip_proxy:    form.sip_proxy,
        sip_server:   form.sip_server,
        sip_username: form.sip_username || form.login,
        sip_port:     form.sip_port ? Number(form.sip_port) : 5060,
        sip_password: form.sip_password || undefined,
      });
      setStatus(res.status || "disconnected");
      setLatencyMs(res.latency_ms || null);
      setConnectionDetail(res.connection_detail || null);
      setFeedback({
        type: res.success ? "success" : "error",
        message: res.message || (res.success ? "Connected." : "Unreachable."),
      });
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.detail || err.message || "Test failed." });
    } finally {
      setTesting(false);
    }
  };

  // ── SIP REGISTER / Quick Activate ─────────────────────────────────────────
  const handleRegister = async () => {
    if (selectedConfigId) {
      await handleActivateConfig(selectedConfigId);
    } else {
      setFeedback({ type: "error", message: "Please save or select a SIP configuration first." });
    }
  };

  // ── SIP UNREGISTER / Quick Deactivate ─────────────────────────────────────
  const handleUnregister = async () => {
    await handleDeactivateConfig(selectedConfigId);
  };

  // ── E2E Test ───────────────────────────────────────────────────────────────
  const handleRunE2ETest = async (simulateCall = true) => {
    setE2eTesting(true);
    setE2eResults(null);
    try {
      const targetHost = form.domain || form.sip_proxy || form.sip_server || form.sip_host;
      const res = await telephonyService.runE2ETest({
        sip_host:     targetHost || undefined,
        sip_username: form.sip_username || form.login || undefined,
        sip_port:     form.sip_port ? Number(form.sip_port) : 5060,
        simulate_call: simulateCall,
      });
      setE2eResults(res);
      loadSipConfig(false);
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to run E2E test." });
    } finally {
      setE2eTesting(false);
    }
  };

  // ── Clipboard helpers ──────────────────────────────────────────────────────
  const copyText = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [key]: false })), 2200);
  };

  const inboundWebhookUrl  = `${BACKEND_BASE}/api/v1/telephony/sip/inbound`;
  const audioChunkUrl      = `${BACKEND_BASE}/api/v1/telephony/sip/inbound/audio`;
  const hangupWebhookUrl   = `${BACKEND_BASE}/api/v1/telephony/sip/inbound/hangup`;

  const isConnected  = status === "connected";
  const isRegistered = regStatus === "registered";
  const regLabel     = REG_STATUS_LABELS[regStatus] || REG_STATUS_LABELS.unregistered;

  const primaryHostDisplay = form.domain || form.sip_proxy || form.sip_server || form.sip_host;

  return (
    <div className="sip-page-container">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="sip-header">
        <div className="sip-header-info">
          <h1>SIP Trunk & Account Configuration</h1>
          <p>Live credentials and real-time network + registration status for AI Receptionist calling.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className={`sip-status-pill ${isConnected ? "connected" : "disconnected"}`}>
            <span className="status-dot" />
            <span>{isConnected ? `Network OK ${latencyMs ? `(${latencyMs}ms)` : ""}` : "Network Unreachable"}</span>
          </div>
          <div className={`sip-status-pill ${isRegistered ? "connected" : "disconnected"}`}
               style={{ borderColor: regLabel.color, color: regLabel.color }}>
            <span className="status-dot" style={{ background: regLabel.dot === "green" ? "var(--badge-green-fg)" : regLabel.dot === "yellow" ? "#f59e0b" : "var(--danger)" }} />
            <span>SIP {regLabel.text}</span>
          </div>
        </div>
      </div>

      {/* ── Live Metrics ───────────────────────────────────────────────────── */}
      <div className="sip-metrics-grid">
        <div className="sip-metric-card">
          <div className="sip-metric-icon accent">📞</div>
          <div className="sip-metric-content">
            <span className="sip-metric-label">Network Probe</span>
            <span className="sip-metric-value" style={{ color: isConnected ? "var(--badge-green-fg)" : "var(--danger)" }}>
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            <span className="sip-metric-sub">
              {primaryHostDisplay ? `${primaryHostDisplay}:${form.sip_port || 5060}` : "No server configured"}
            </span>
          </div>
        </div>

        <div className="sip-metric-card">
          <div className="sip-metric-icon" style={{ color: regLabel.color }}>🔐</div>
          <div className="sip-metric-content">
            <span className="sip-metric-label">SIP Registration</span>
            <span className="sip-metric-value" style={{ color: regLabel.color }}>{regLabel.text}</span>
            <span className="sip-metric-sub">
              {regRegisteredAt
                ? `Registered: ${new Date(regRegisteredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : regDetail || "Not registered"}
            </span>
          </div>
        </div>

        <div className="sip-metric-card">
          <div className="sip-metric-icon blue">⚡</div>
          <div className="sip-metric-content">
            <span className="sip-metric-label">Active Calls</span>
            <span className="sip-metric-value">{liveStats.active_calls}</span>
            <span className="sip-metric-sub">Live SIP sessions</span>
          </div>
        </div>

        <div className="sip-metric-card">
          <div className="sip-metric-icon purple">📊</div>
          <div className="sip-metric-content">
            <span className="sip-metric-label">Total Calls Logged</span>
            <span className="sip-metric-value">{liveStats.total_calls}</span>
            <span className="sip-metric-sub">
              {liveStats.last_call_at
                ? `Last: ${new Date(liveStats.last_call_at).toLocaleDateString()}`
                : "Database records"}
            </span>
          </div>
        </div>
      </div>

      {/* ── No Active SIP Configuration Banner ────────────────────────────── */}
      {!configs.some((c) => c.is_active) && (
        <div
          className="sip-alert warning"
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: "var(--radius-lg, 12px)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "4px",
          }}
        >
          <span style={{ fontSize: "24px" }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: "15px", color: "var(--danger, #ef4444)", display: "block" }}>
              No active SIP configuration. Please activate a SIP configuration.
            </strong>
            <span style={{ fontSize: "13px", color: "var(--muted)", marginTop: "2px", display: "block" }}>
              Incoming and outbound calls are paused until an authorized SIP Trunk configuration is explicitly activated below.
            </span>
          </div>
        </div>
      )}

      {/* ── Saved SIP Configurations List ───────────────────────────────────── */}
      <div className="sip-card">
        <div className="sip-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>📋</span> Saved SIP Configurations ({configs.length})
            </h2>
            <p>Manage, test, and activate SIP provider trunk configurations for this organization.</p>
          </div>
          <button
            type="button"
            className="sip-btn-primary"
            onClick={() => {
              setIsCreatingNew(true);
              setSelectedConfigId(null);
              setForm(emptyForm);
              setHasExistingPassword(false);
              setFeedback(null);
            }}
            style={{ padding: "8px 16px", fontSize: "13px" }}
          >
            + Add SIP Configuration
          </button>
        </div>

        {configs.length === 0 ? (
          <div style={{ padding: "28px", textAlign: "center", color: "var(--muted)", fontSize: "14px" }}>
            No SIP configurations found. Click <strong>+ Add SIP Configuration</strong> above to set up your first SIP trunk.
          </div>
        ) : (
          <div className="sip-config-list-grid">
            {configs.map((cfg) => {
              const isSelected = selectedConfigId === cfg.id && !isCreatingNew;
              const host = cfg.sip_host || cfg.domain || cfg.sip_proxy || cfg.sip_server || "No Host";
              const user = cfg.sip_username || cfg.login || "—";
              return (
                <div
                  key={cfg.id}
                  className={`sip-config-card ${isSelected ? "selected" : ""} ${cfg.is_active ? "active" : ""}`}
                  onClick={() => {
                    setIsCreatingNew(false);
                    setSelectedConfigId(cfg.id);
                    populateFormWith(cfg);
                  }}
                >
                  <div className="sip-config-card-header">
                    <div>
                      <h4 style={{ margin: "0 0 2px 0", fontSize: "15px", color: "var(--heading)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{cfg.account_name || `SIP Trunk #${cfg.id}`}</span>
                      </h4>
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                        User: <strong style={{ color: "var(--fg)" }}>{user}</strong> • Host: <strong style={{ color: "var(--fg)" }}>{host}:{cfg.sip_port || 5060}</strong>
                      </span>
                    </div>
                    <div>
                      {cfg.is_active ? (
                        <span className="sip-badge-active">● ACTIVE</span>
                      ) : (
                        <span className="sip-badge-inactive">○ INACTIVE</span>
                      )}
                    </div>
                  </div>

                  <div className="sip-config-card-body" style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px" }}>
                    <span style={{ color: "var(--muted)" }}>
                      DID: <strong style={{ color: "var(--fg)" }}>{cfg.did_number || "None"}</strong>
                    </span>

                    <div className="sip-config-card-actions" onClick={(e) => e.stopPropagation()}>
                      {cfg.is_active ? (
                        <button
                          type="button"
                          className="sip-card-action-btn deactivate"
                          onClick={() => handleDeactivateConfig(cfg.id)}
                          disabled={deactivatingId === cfg.id}
                          title="Deactivate this trunk"
                        >
                          {deactivatingId === cfg.id ? "…" : "Deactivate"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="sip-card-action-btn activate"
                          onClick={() => handleActivateConfig(cfg.id)}
                          disabled={activatingId === cfg.id}
                          title="Activate this trunk for live calls"
                        >
                          {activatingId === cfg.id ? "Activating…" : "Activate"}
                        </button>
                      )}

                      <button
                        type="button"
                        className="sip-card-action-btn edit"
                        onClick={() => {
                          setIsCreatingNew(false);
                          setSelectedConfigId(cfg.id);
                          populateFormWith(cfg);
                        }}
                        title="Edit configuration"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="sip-card-action-btn delete"
                        onClick={() => handleDeleteConfig(cfg.id)}
                        disabled={deletingId === cfg.id}
                        title="Delete configuration"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SIP Account Reference Form Card ─────────────────────────────────── */}
      <div className="sip-card">
        <div className="sip-card-header">
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{isCreatingNew ? "➕ Add New SIP Configuration" : `✏️ Edit: ${form.account_name || `Trunk #${selectedConfigId}`}`}</span>
              {!isCreatingNew && (
                configs.find((c) => c.id === selectedConfigId)?.is_active ? (
                  <span className="sip-badge-active" style={{ fontSize: "11px" }}>● ACTIVE TRUNK</span>
                ) : (
                  <span className="sip-badge-inactive" style={{ fontSize: "11px" }}>○ INACTIVE</span>
                )
              )}
            </h2>
            <p>
              {isCreatingNew
                ? "Enter your SIP account credentials. Newly created configurations remain INACTIVE until explicitly activated."
                : "Edit configuration credentials. Saving updates the record without auto-activating."}
            </p>
          </div>
          {lastConnectedAt && (
            <div className="sip-sync-tag">
              Last probe: {new Date(lastConnectedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="sip-form">
          {/* Account Name */}
          <div className="sip-form-group">
            <label htmlFor="account-name">
              <span>Account Name</span>
            </label>
            <input
              id="account-name"
              type="text"
              className="sip-input"
              value={form.account_name}
              onChange={handleChange("account_name")}
              disabled={loading || saving}
            />
          </div>

          {/* SIP Server & SIP Proxy */}
          <div className="sip-input-row">
            <div className="sip-form-group">
              <label htmlFor="sip-server"><span>SIP Server</span></label>
              <input
                id="sip-server"
                type="text"
                className="sip-input"
                value={form.sip_server}
                onChange={handleChange("sip_server")}
                disabled={loading || saving}
              />
            </div>
            <div className="sip-form-group">
              <label htmlFor="sip-proxy"><span>SIP Proxy</span></label>
              <input
                id="sip-proxy"
                type="text"
                className="sip-input"
                value={form.sip_proxy}
                onChange={handleChange("sip_proxy")}
                disabled={loading || saving}
              />
            </div>
          </div>

          {/* Username* & Domain* */}
          <div className="sip-input-row">
            <div className="sip-form-group">
              <label htmlFor="sip-username">
                <span>Username <span className="required">*</span></span>
              </label>
              <input
                id="sip-username"
                type="text"
                className="sip-input"
                value={form.sip_username}
                onChange={handleChange("sip_username")}
                disabled={loading || saving}
                required
              />
            </div>
            <div className="sip-form-group">
              <label htmlFor="sip-domain">
                <span>Domain <span className="required">*</span></span>
              </label>
              <input
                id="sip-domain"
                type="text"
                className="sip-input"
                value={form.domain}
                onChange={handleChange("domain")}
                disabled={loading || saving}
                required
              />
            </div>
          </div>

          {/* Login & Password */}
          <div className="sip-input-row">
            <div className="sip-form-group">
              <label htmlFor="sip-login"><span>Login</span></label>
              <input
                id="sip-login"
                type="text"
                className="sip-input"
                value={form.login}
                onChange={handleChange("login")}
                disabled={loading || saving}
              />
            </div>
            <div className="sip-form-group">
              <label htmlFor="sip-password">
                <span>Password</span>
                {hasExistingPassword && (
                  <span style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "normal" }}> (Encrypted in DB)</span>
                )}
              </label>
              <div className="sip-password-wrapper">
                <input
                  id="sip-password"
                  type={showPassword ? "text" : "password"}
                  className="sip-input"
                  value={form.sip_password}
                  onChange={handleChange("sip_password")}
                  disabled={loading || saving}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="sip-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>
          </div>

          {/* Display Name & Voicemail Number */}
          <div className="sip-input-row">
            <div className="sip-form-group">
              <label htmlFor="display-name"><span>Display Name</span></label>
              <input
                id="display-name"
                type="text"
                className="sip-input"
                value={form.display_name}
                onChange={handleChange("display_name")}
                disabled={loading || saving}
              />
            </div>
            <div className="sip-form-group">
              <label htmlFor="voicemail-number"><span>Voicemail Number</span></label>
              <input
                id="voicemail-number"
                type="text"
                className="sip-input"
                value={form.voicemail_number}
                onChange={handleChange("voicemail_number")}
                disabled={loading || saving}
              />
            </div>
          </div>

          {/* Dialing Prefix & Dial Plan */}
          <div className="sip-input-row">
            <div className="sip-form-group">
              <label htmlFor="dialing-prefix"><span>Dialing Prefix</span></label>
              <input
                id="dialing-prefix"
                type="text"
                className="sip-input"
                value={form.dialing_prefix}
                onChange={handleChange("dialing_prefix")}
                disabled={loading || saving}
              />
            </div>
            <div className="sip-form-group">
              <label htmlFor="dial-plan"><span>Dial Plan</span></label>
              <input
                id="dial-plan"
                type="text"
                className="sip-input"
                value={form.dial_plan}
                onChange={handleChange("dial_plan")}
                disabled={loading || saving}
              />
            </div>
          </div>

          {/* Select Dropdowns Row 1: Hide Caller ID & Media Encryption */}
          <div className="sip-input-row">
            <div className="sip-form-group">
              <label htmlFor="hide-caller-id"><span>Hide Caller ID</span></label>
              <select
                id="hide-caller-id"
                className="sip-input"
                value={form.hide_caller_id}
                onChange={handleChange("hide_caller_id")}
                disabled={loading || saving}
              >
                <option value="Disabled">Disabled</option>
                <option value="Enabled">Enabled</option>
              </select>
            </div>
            <div className="sip-form-group">
              <label htmlFor="media-encryption"><span>Media Encryption</span></label>
              <select
                id="media-encryption"
                className="sip-input"
                value={form.media_encryption}
                onChange={handleChange("media_encryption")}
                disabled={loading || saving}
              >
                <option value="Disabled">Disabled</option>
                <option value="Optional">Optional</option>
                <option value="Mandatory">Mandatory</option>
                <option value="SRTP">SRTP</option>
              </select>
            </div>
          </div>

          {/* Select Dropdowns Row 2: Transport & Public Address */}
          <div className="sip-input-row">
            <div className="sip-form-group">
              <label htmlFor="transport"><span>Transport</span></label>
              <select
                id="transport"
                className="sip-input"
                value={form.transport}
                onChange={handleChange("transport")}
                disabled={loading || saving}
              >
                <option value="UDP">UDP</option>
                <option value="TCP">TCP</option>
                <option value="TLS">TLS</option>
              </select>
            </div>
            <div className="sip-form-group">
              <label htmlFor="public-address"><span>Public Address</span></label>
              <select
                id="public-address"
                className="sip-input"
                value={form.public_address}
                onChange={handleChange("public_address")}
                disabled={loading || saving}
              >
                <option value="Auto">Auto</option>
                <option value="STUN">STUN</option>
                <option value="Disabled">Disabled</option>
              </select>
            </div>
          </div>

          {/* Refresh & Keep-Alive numbers */}
          <div className="sip-input-row">
            <div className="sip-form-group">
              <label htmlFor="register-refresh"><span>Register Refresh (sec)</span></label>
              <input
                id="register-refresh"
                type="number"
                className="sip-input"
                value={form.register_refresh}
                onChange={handleChange("register_refresh")}
                disabled={loading || saving}
              />
            </div>
            <div className="sip-form-group">
              <label htmlFor="keep-alive"><span>Keep-Alive (sec)</span></label>
              <input
                id="keep-alive"
                type="number"
                className="sip-input"
                value={form.keep_alive}
                onChange={handleChange("keep_alive")}
                disabled={loading || saving}
              />
            </div>
          </div>

          {/* Additional DID & Port */}
          <div className="sip-input-row">
            <div className="sip-form-group">
              <label htmlFor="sip-did"><span>Business DID / Phone Number</span></label>
              <input
                id="sip-did"
                type="text"
                className="sip-input"
                value={form.did_number}
                onChange={handleChange("did_number")}
                disabled={loading || saving}
              />
            </div>
            <div className="sip-form-group">
              <label htmlFor="sip-port"><span>SIP Port</span></label>
              <input
                id="sip-port"
                type="number"
                className="sip-input"
                value={form.sip_port}
                onChange={handleChange("sip_port")}
                disabled={loading || saving}
              />
            </div>
          </div>

          {/* Reference Checkboxes Grid */}
          <div className="sip-checkbox-grid">
            <label className="sip-checkbox-label">
              <input
                type="checkbox"
                checked={form.publish_presence}
                onChange={handleChange("publish_presence")}
                disabled={loading || saving}
              />
              <span>Publish Presence</span>
            </label>

            <label className="sip-checkbox-label">
              <input
                type="checkbox"
                checked={form.allow_ip_rewrite}
                onChange={handleChange("allow_ip_rewrite")}
                disabled={loading || saving}
              />
              <span>Allow IP Rewrite</span>
            </label>

            <label className="sip-checkbox-label">
              <input
                type="checkbox"
                checked={form.ice}
                onChange={handleChange("ice")}
                disabled={loading || saving}
              />
              <span>ICE</span>
            </label>

            <label className="sip-checkbox-label">
              <input
                type="checkbox"
                checked={form.disable_session_timers}
                onChange={handleChange("disable_session_timers")}
                disabled={loading || saving}
              />
              <span>Disable Session Timers</span>
            </label>
          </div>

          {/* Network probe diagnostic */}
          {connectionDetail && (
            <div className={`sip-alert ${isConnected ? "success" : "error"}`}>
              <span>{isConnected ? "✓" : "⚠"}</span>
              <div>
                <strong>Network Probe: </strong>
                <span>{connectionDetail}</span>
              </div>
            </div>
          )}

          {/* Registration diagnostic */}
          {regDetail && regStatus !== "unregistered" && (
            <div className={`sip-alert ${isRegistered ? "success" : regStatus === "registering" ? "info" : "error"}`}
                 style={{ borderLeftColor: regLabel.color }}>
              <span>{isRegistered ? "✓" : regStatus === "registering" ? "⏳" : "⚠"}</span>
              <div>
                <strong>SIP UA: </strong>
                <span>{regDetail}</span>
                {regErrorMsg && <div style={{ marginTop: 4, color: "var(--danger)", fontSize: "12px" }}>{regErrorMsg}</div>}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="sip-form-actions" style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <button type="submit" className="sip-btn-primary" disabled={saving || loading || (!form.domain && !form.sip_host && !form.sip_server)}>
              {saving ? "Saving…" : (isCreatingNew ? "Save Configuration" : "Save Changes")}
            </button>
            <button type="button" className="sip-btn-secondary" onClick={handleTestConnection}
                    disabled={testing || saving || loading || (!form.domain && !form.sip_host && !form.sip_server)}>
              {testing ? "Probing…" : "Test Network"}
            </button>

            {!isCreatingNew && selectedConfigId && (
              configs.find((c) => c.id === selectedConfigId)?.is_active ? (
                <button
                  type="button"
                  className="sip-btn-secondary"
                  onClick={() => handleDeactivateConfig(selectedConfigId)}
                  disabled={deactivatingId === selectedConfigId}
                  style={{ borderColor: "#ef4444", color: "#ef4444" }}
                >
                  {deactivatingId === selectedConfigId ? "Deactivating…" : "⏸ Deactivate Configuration"}
                </button>
              ) : (
                <button
                  type="button"
                  className="sip-btn-primary"
                  onClick={() => handleActivateConfig(selectedConfigId)}
                  disabled={activatingId === selectedConfigId}
                  style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                >
                  {activatingId === selectedConfigId ? "Activating Trunk…" : "▶ Activate This Configuration"}
                </button>
              )
            )}

            {!isCreatingNew && selectedConfigId && (
              <button
                type="button"
                className="sip-btn-secondary"
                onClick={() => handleDeleteConfig(selectedConfigId)}
                disabled={deletingId === selectedConfigId}
                style={{ borderColor: "rgba(239, 68, 68, 0.4)", color: "#ef4444" }}
              >
                Delete Configuration
              </button>
            )}

            {isCreatingNew && configs.length > 0 && (
              <button
                type="button"
                className="sip-btn-secondary"
                onClick={() => {
                  setIsCreatingNew(false);
                  const first = configs.find((c) => c.is_active) || configs[0];
                  if (first) {
                    setSelectedConfigId(first.id);
                    populateFormWith(first);
                  }
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {feedback && (
          <div className={`sip-alert ${feedback.type}`}>
            <span>{feedback.type === "success" ? "✓" : "⚠"}</span>
            <span>{feedback.message}</span>
          </div>
        )}
      </div>


      {/* Important Guidance Callout for Connecting External SIP Calls */}
      <div style={{
        background: "rgba(2, 132, 199, 0.08)",
        border: "1px solid rgba(2, 132, 199, 0.25)",
        borderRadius: "var(--radius-lg)",
        padding: "18px 22px",
        marginBottom: "20px",
        color: "var(--fg)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", fontWeight: "700", fontSize: "15px", color: "var(--heading)" }}>
          <span style={{ fontSize: "18px" }}>💡</span> How to Connect Live Inbound Phone Calls
        </div>
        <p style={{ fontSize: "13.5px", color: "var(--muted)", margin: "0 0 12px 0", lineHeight: "1.5" }}>
          External SIP / Telecom providers (e.g. <code>{primaryHostDisplay || "your-sip-provider.com"}</code>, Jio, Airtel, Twilio, Exotel) cannot reach <code>localhost:8000</code> directly from the internet. To connect real mobile / landline phone calls to the AI Receptionist:
        </p>
        
        <ol style={{ fontSize: "13px", color: "var(--fg)", margin: 0, paddingLeft: "20px", lineHeight: "1.6" }}>
          <li>
            <strong>Expose Local Backend with ngrok:</strong> Run <code>ngrok http 8000</code> in your terminal to get a public HTTPS URL (e.g. <code>https://xxxx.ngrok-free.app</code>).
          </li>
          <li>
            <strong>Set Provider Webhook:</strong> In your SIP provider / PBX dashboard under <em>Inbound Call Webhook / Trunk Routing</em>, paste your public URL: <code>https://xxxx.ngrok-free.app/api/v1/telephony/sip/inbound</code>.
          </li>
          <li>
            <strong>Test in Browser Immediately:</strong> You can also test real AI voice receptionist conversations instantly right now on the <a href="/admin/voice" style={{ color: "var(--accent)", fontWeight: "700", textDecoration: "underline" }}>Voice &amp; Persona</a> page without setting up phone routing.
          </li>
        </ol>
      </div>



      {/* ── SIP Registration Card ──────────────────────────────────────────── */}
      <div className="sip-card" style={{ borderTop: `3px solid ${regLabel.color}` }}>
        <div className="sip-card-header">
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>🔐</span> SIP UA Registration
              <span style={{
                fontSize: "12px",
                padding: "2px 10px",
                borderRadius: "20px",
                background: isRegistered ? "rgba(34,197,94,.15)" : "rgba(239,68,68,.12)",
                color: regLabel.color,
                fontWeight: 600,
                letterSpacing: ".5px",
              }}>{regLabel.text}</span>
            </h2>
            <p>Register the AI Receptionist as a SIP endpoint with your FreeSWITCH or Asterisk server.
               When registered, all inbound calls to your DID number are automatically answered and handled by the AI.</p>

          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", padding: "0 0 8px" }}>
          <button
            id="sip-register-btn"
            type="button"
            className="sip-btn-primary"
            onClick={handleRegister}
            disabled={registering || (!form.domain && !form.sip_host && !form.sip_server) || !form.sip_username}
            style={{ minWidth: 160, background: isRegistered ? undefined : "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
          >
            {registering ? "⏳ Activating…" : isRegistered ? "🔄 Re-Register" : "▶ Activate SIP Trunk"}
          </button>

          <button
            id="sip-unregister-btn"
            type="button"
            className="sip-btn-secondary"
            onClick={handleUnregister}
            disabled={unregistering}
            style={{ minWidth: 160, borderColor: "rgba(239,68,68,0.5)", color: "#ef4444" }}
          >
            {unregistering ? "Deactivating…" : "⏸ Deactivate SIP Trunk"}
          </button>

          <button
            type="button"
            className="sip-btn-secondary"
            onClick={loadRegStatus}
            style={{ minWidth: 120 }}
          >
            🔄 Refresh Status
          </button>
        </div>

        {/* Flow diagram */}
        <div style={{
          margin: "16px 0 4px",
          padding: "14px 18px",
          background: "rgba(255,255,255,.04)",
          borderRadius: "10px",
          fontSize: "13px",
          color: "var(--muted)",
          lineHeight: 1.7,
        }}>
          <strong style={{ color: "var(--heading)", display: "block", marginBottom: 6 }}>Inbound Call Flow</strong>
          <span style={{ color: "var(--badge-green-fg)" }}>Customer Calls DID</span>
          {" → "}FreeSWITCH / Asterisk PBX
          {" → "}SIP INVITE → AI Receptionist
          {" → "}Auto-Answer + RTP
          {" → "}STT → LLM / RAG → TTS
          {" → "}AI Voice Response
          {" → "}Call Log + Transcript + Dashboard
        </div>
      </div>

      {/* ── E2E Testing Panel ─────────────────────────────────────────────── */}
      <div className="sip-e2e-card">
        <div className="sip-e2e-header">
          <div>
            <h2 style={{ fontSize: "19px", fontWeight: 700, color: "var(--heading)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🧪</span> Complete End-to-End SIP Integration Test
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "13.5px", marginTop: "4px" }}>
              Verify network reachability, inbound webhook routing, AI engine readiness, and real-time call logging.
            </p>
          </div>
          <div className="sip-e2e-actions">
            <button type="button" className="sip-btn-e2e" onClick={() => handleRunE2ETest(true)} disabled={e2eTesting}>
              {e2eTesting ? "Running Diagnostics…" : "⚡ Run Complete E2E Test"}
            </button>
          </div>
        </div>

        {e2eResults && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className={`sip-alert ${e2eResults.overall_success ? "success" : "error"}`}>
              <span>{e2eResults.overall_success ? "✓" : "⚠"}</span>
              <div>
                <strong>{e2eResults.overall_success ? "PASSED" : "ISSUES DETECTED"}: </strong>
                <span>{e2eResults.message}</span>
              </div>
            </div>
            <div className="sip-e2e-steps">
              {e2eResults.steps.map((stepItem, idx) => (
                <div key={idx} className={`sip-e2e-step-item ${stepItem.passed ? "passed" : "failed"}`}>
                  <div className="sip-e2e-step-icon">{stepItem.passed ? "✓" : "✕"}</div>
                  <div className="sip-e2e-step-content">
                    <div className="sip-e2e-step-title">
                      <span>Step {stepItem.step}: {stepItem.name}</span>
                      {stepItem.latency_ms != null && (
                        <span className="sip-e2e-latency-tag">{stepItem.latency_ms} ms</span>
                      )}
                    </div>
                    <div className="sip-e2e-step-msg">{stepItem.message}</div>
                    {stepItem.detail && (
                      <div className="sip-e2e-step-detail">Detail: {stepItem.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
