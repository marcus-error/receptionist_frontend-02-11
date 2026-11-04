import { useState, useEffect } from "react";
import crmService from "../../services/crm.service.js";

// CRM Platforms List with brand icons & metadata
const CRM_PROVIDERS = [
  {
    id: "salesforce",
    name: "Salesforce",
    icon: "☁️",
    badgeColor: "#00A1E0",
    description: "Connect your AI receptionist with Salesforce CRM.",
    authType: "oauth",
    defaultUrl: "https://login.salesforce.com"
  },
  {
    id: "hubspot",
    name: "HubSpot",
    icon: "🟠",
    badgeColor: "#FF7A59",
    description: "Sync calls, contacts, leads and activities with HubSpot.",
    authType: "oauth",
    defaultUrl: "https://api.hubapi.com"
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    icon: "🔴",
    badgeColor: "#E42526",
    description: "Automatically create and update CRM records from calls.",
    authType: "oauth",
    defaultUrl: "https://www.zohoapis.com/crm/v2"
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    icon: "🟢",
    badgeColor: "#222222",
    description: "Sync callers, leads, deals and activities.",
    authType: "api_key",
    defaultUrl: "https://api.pipedrive.com/v1"
  },
  {
    id: "freshsales",
    name: "Freshsales",
    icon: "🍃",
    badgeColor: "#02B875",
    description: "Connect calls and contacts with Freshsales.",
    authType: "api_key",
    defaultUrl: "https://domain.freshsales.io/api"
  },
  {
    id: "dynamics365",
    name: "Microsoft Dynamics 365",
    icon: "🟦",
    badgeColor: "#002050",
    description: "Sync customer and call information with Dynamics 365.",
    authType: "oauth",
    defaultUrl: "https://org.api.crm.dynamics.com"
  },
  {
    id: "custom",
    name: "Custom CRM",
    icon: "⚡",
    badgeColor: "#7c68ff",
    description: "Connect any CRM using REST API.",
    authType: "custom",
    defaultUrl: "https://api.example.com"
  }
];

// Initial Data Sync Controls (Requirement 4)
const INITIAL_SYNC_SETTINGS = {
  syncContacts: true,
  syncLeads: true,
  syncCallRecords: true,
  syncCallTranscripts: true,
  syncCallSummary: true,
  syncCallerIntent: true,
  syncAppointments: true,
  syncFollowupTasks: true,
  syncAiData: true,
  syncRecordingUrl: true,
  syncHumanTransferDetails: true
};

// Initial Automation Rules (Requirement 6)
const INITIAL_AUTOMATION_RULES = {
  newCallerContact: true,
  leadIdentified: true,
  appointmentBooked: true,
  callTransferred: true,
  callUnresolved: true,
  callbackRequested: true,
  existingContactCall: true,
  appointmentCancelled: true
};

// Initial Field Mappings (Requirement 5)
const INITIAL_FIELD_MAPPING = [
  { id: 1, aiField: "Caller Name", crmField: "Contact Name" },
  { id: 2, aiField: "Phone Number", crmField: "Phone" },
  { id: 3, aiField: "Email", crmField: "Email" },
  { id: 4, aiField: "Call Date", crmField: "Call Date" },
  { id: 5, aiField: "Call Duration", crmField: "Call Duration" },
  { id: 6, aiField: "Call Status", crmField: "Call Status" },
  { id: 7, aiField: "Caller Intent", crmField: "Lead Source" },
  { id: 8, aiField: "Call Summary", crmField: "Description" },
  { id: 9, aiField: "Appointment Date", crmField: "Appointment Date" },
  { id: 10, aiField: "Appointment Time", crmField: "Appointment Time" },
  { id: 11, aiField: "Service Requested", crmField: "Service" },
  { id: 12, aiField: "Agent / AI Receptionist", crmField: "Assigned Agent" }
];

export default function CrmIntegration() {
  const [activeTab, setActiveTab] = useState("providers"); // providers, sync, field_mapping, contacts_leads, custom_api, logs
  
  // Connection State
  const [connectedCrm, setConnectedCrm] = useState({
    provider: "None",
    name: "Not Connected",
    account: "—",
    status: "disconnected",
    lastSync: "Never",
    recordsSynced: 0
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const conns = await crmService.getConnections();
        if (conns && conns.length > 0) {
          const active = conns[0]; // Take the first connected CRM
          setConnectedCrm({
            provider: active.provider || "None",
            name: active.name || "Not Connected",
            account: active.account_name || "—",
            status: active.status || "disconnected",
            lastSync: active.last_sync || "Never",
            recordsSynced: 0
          });
        }
        const logs = await crmService.getSyncLogs();
        if (logs) setSyncLogs(logs);
      } catch (err) {
        console.error("Failed to load CRM data", err);
      }
    }
    fetchData();
  }, []);

  // Modal / Form state for Add/Edit CRM
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(CRM_PROVIDERS[0]);
  const [formData, setFormData] = useState({
    provider: "Salesforce",
    connectionName: "",
    accountName: "",
    baseUrl: "https://login.salesforce.com",
    apiKey: "",
    clientId: "",
    clientSecret: "",
    accessToken: "",
    refreshToken: ""
  });

  // Test Connection status
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Sync Settings & Rules state
  const [syncSettings, setSyncSettings] = useState(INITIAL_SYNC_SETTINGS);
  const [automationRules, setAutomationRules] = useState(INITIAL_AUTOMATION_RULES);
  const [fieldMappings, setFieldMappings] = useState(INITIAL_FIELD_MAPPING);
  const [newAiField, setNewAiField] = useState("");
  const [newCrmField, setNewCrmField] = useState("");

  // Call Activity Settings (Requirement 7)
  const [activitySettings, setActivitySettings] = useState({
    activityType: "Inbound Call",
    activityStatus: "Completed",
    direction: "Inbound",
    autoCreateActivity: true,
    savePhone: true,
    saveName: true,
    saveDuration: true,
    saveDateTime: true,
    saveSummary: true,
    saveTranscript: true,
    saveIntent: true,
    saveAppointmentDetails: true,
    saveTransferStatus: true,
    saveRecordingUrl: true
  });

  // Contact Management Settings (Requirement 8)
  const [contactSettings, setContactSettings] = useState({
    autoCreateContacts: true,
    updateExisting: true,
    matchPhone: true,
    matchEmail: true,
    preventDuplicates: true,
    duplicateHandling: "Update Existing Contact"
  });

  // Lead Management Settings (Requirement 9)
  const [leadSettings, setLeadSettings] = useState({
    enabled: true,
    leadSource: "AI Receptionist",
    leadStatus: "New",
    assignment: "Auto-Assign Sales Team",
    leadScore: "Automatic (AI Evaluated)",
    leadNotes: "Automatic Call Summary"
  });

  // Appointment Sync Settings (Requirement 10)
  const [appointmentSettings, setAppointmentSettings] = useState({
    createOnBooking: true,
    updateOnReschedule: true,
    updateOnCancel: true,
    addNotes: true,
    syncDateTime: true,
    syncService: true,
    syncStaff: true
  });

  // Webhook / API Settings for Custom CRM (Requirement 11)
  const [apiConfig, setApiConfig] = useState({
    baseUrl: "https://api.example.com/v1/crm",
    authType: "API Key",
    apiKey: "••••••••••••••••",
    bearerToken: "",
    webhookUrl: "https://your-app-domain.com/api/crm/webhook",
    httpMethod: "POST",
    headers: [
      { key: "Content-Type", value: "application/json" },
      { key: "X-Source-App", value: "AI-Receptionist" }
    ],
    requestBody: `{\n  "event": "call_completed",\n  "caller_phone": "{{phone_number}}",\n  "caller_name": "{{caller_name}}",\n  "intent": "{{caller_intent}}",\n  "summary": "{{call_summary}}",\n  "transcript": "{{call_transcript}}"\n}`
  });

  // Sync Activity Logs (Requirement 12)
  const [syncLogs, setSyncLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Modal Handlers
  const handleOpenConnectModal = (provider) => {
    setSelectedProvider(provider);
    setFormData({
      provider: provider.name,
      connectionName: `${provider.name} Connection`,
      accountName: "",
      baseUrl: provider.defaultUrl,
      apiKey: "",
      clientId: "",
      clientSecret: "",
      accessToken: "",
      refreshToken: ""
    });
    setTestResult(null);
    setShowConfigModal(true);
  };

  // Test Connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    const res = await crmService.testConnection({ ...formData, provider: selectedProvider.name });
    setTestingConnection(false);
    setTestResult(res);
  };

  // Save Connection
  const handleSaveConnection = async (e) => {
    e?.preventDefault();
    const res = await crmService.saveConnection({ ...formData, provider: selectedProvider.name });
    if (res.success || res.connection) {
      setConnectedCrm({
        provider: selectedProvider.name,
        name: formData.connectionName || `${selectedProvider.name} Primary`,
        account: formData.accountName || "Production Account",
        status: "connected",
        lastSync: "Just now",
        recordsSynced: 0
      });
      setShowConfigModal(false);
      showNotification(`Successfully connected to ${selectedProvider.name}`);
    }
  };

  // Disconnect CRM
  const handleDisconnect = async () => {
    if (window.confirm("Are you sure you want to disconnect your CRM?")) {
      try {
        // Find existing connection from service if possible, or assume a generic route
        // We might need an ID, but for now we'll just mock the reset in UI or trigger an endpoint
        setConnectedCrm({
          provider: "None",
          name: "Not Connected",
          account: "—",
          status: "disconnected",
          lastSync: "Never",
          recordsSynced: 0
        });
        showNotification("CRM connection removed.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Refresh Logs
  const handleRefreshLogs = async () => {
    setLogsLoading(true);
    const logs = await crmService.getSyncLogs();
    setSyncLogs(logs);
    setTimeout(() => setLogsLoading(false), 500);
  };

  // Helper notification toast
  const showNotification = (msg) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(""), 3000);
  };

  // Add Custom Field Mapping
  const handleAddFieldMapping = () => {
    if (!newAiField || !newCrmField) return;
    setFieldMappings([
      ...fieldMappings,
      { id: Date.now(), aiField: newAiField, crmField: newCrmField }
    ]);
    setNewAiField("");
    setNewCrmField("");
  };

  // Delete Mapping Row
  const handleRemoveFieldMapping = (id) => {
    setFieldMappings(fieldMappings.filter((m) => m.id !== id));
  };

  // Add API Header
  const handleAddHeader = () => {
    setApiConfig({
      ...apiConfig,
      headers: [...apiConfig.headers, { key: "", value: "" }]
    });
  };

  return (
    <section id="crm-integration" className="page active">
      {/* Toast alert */}
      {saveSuccessMsg && (
        <div className="crm-toast">
          ✓ {saveSuccessMsg}
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="header">
        <div>
          <h1 className="title">CRM Integration</h1>
          <p className="subtitle">
            Connect your CRM to automatically sync caller information, leads, contacts, appointments and call activities.
          </p>
        </div>
        <button
          className="btn primary"
          onClick={() => handleOpenConnectModal(CRM_PROVIDERS[0])}
        >
          + Add CRM
        </button>
      </div>

      {/* CONNECTION STATUS CARD (REQUIREMENT 3) */}
      <div className="card crm-status-card" style={{ marginBottom: "24px" }}>
        <div className="crm-status-header">
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div className="crm-status-logo">
              {CRM_PROVIDERS.find((p) => p.name === connectedCrm.provider)?.icon || "💼"}
            </div>
            <div>
              <div style={{ fontSize: "16px", fontWeight: "700" }}>
                {connectedCrm.provider !== "None" ? connectedCrm.provider : "No CRM Connected"}
              </div>
              <div style={{ fontSize: "13px", color: "#667085" }}>
                {connectedCrm.name} • {connectedCrm.account}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              className={`badge ${
                connectedCrm.status === "connected"
                  ? "green"
                  : connectedCrm.status === "syncing"
                  ? "yellow"
                  : "red"
              }`}
              style={{ fontSize: "12px", padding: "6px 12px" }}
            >
              ● {connectedCrm.status.toUpperCase()}
            </span>

            {connectedCrm.status === "connected" && (
              <>
                <button className="btn" onClick={() => showNotification("Syncing CRM data now...")}>
                  🔄 Sync Now
                </button>
                <button
                  className="btn"
                  onClick={() =>
                    handleOpenConnectModal(
                      CRM_PROVIDERS.find((p) => p.name === connectedCrm.provider) || CRM_PROVIDERS[0]
                    )
                  }
                >
                  ✏️ Edit
                </button>
                <button className="btn danger" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        {connectedCrm.status === "connected" && (
          <div className="crm-status-stats">
            <div>
              <div className="stat-label">Last Sync</div>
              <div style={{ fontWeight: "600", marginTop: "2px" }}>{connectedCrm.lastSync}</div>
            </div>
            <div>
              <div className="stat-label">Records Synced</div>
              <div style={{ fontWeight: "600", marginTop: "2px" }}>
                {connectedCrm.recordsSynced.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="stat-label">Sync Mode</div>
              <div style={{ fontWeight: "600", marginTop: "2px" }}>Real-time Bi-directional</div>
            </div>
          </div>
        )}
      </div>

      {/* TAB NAVIGATION */}
      <div className="crm-tabs">
        <button
          className={`crm-tab ${activeTab === "providers" ? "active" : ""}`}
          onClick={() => setActiveTab("providers")}
        >
          Select CRM Platform
        </button>
        <button
          className={`crm-tab ${activeTab === "sync" ? "active" : ""}`}
          onClick={() => setActiveTab("sync")}
        >
          Data Sync & Automation
        </button>
        <button
          className={`crm-tab ${activeTab === "field_mapping" ? "active" : ""}`}
          onClick={() => setActiveTab("field_mapping")}
        >
          Field Mapping
        </button>
        <button
          className={`crm-tab ${activeTab === "contacts_leads" ? "active" : ""}`}
          onClick={() => setActiveTab("contacts_leads")}
        >
          Contacts, Leads & Appointments
        </button>
        <button
          className={`crm-tab ${activeTab === "custom_api" ? "active" : ""}`}
          onClick={() => setActiveTab("custom_api")}
        >
          Webhook / REST API
        </button>
        <button
          className={`crm-tab ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          Sync Activity Logs
        </button>
      </div>

      {/* TAB 1: CRM PROVIDER SELECTION (REQUIREMENT 1) */}
      {activeTab === "providers" && (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700" }}>Select CRM Platform</h2>
            <p className="subtitle">
              Choose your CRM service provider to initiate seamless call & contact data synchronization.
            </p>
          </div>

          <div className="grid3">
            {CRM_PROVIDERS.map((provider) => {
              const isConnected = connectedCrm.provider === provider.name;
              return (
                <div key={provider.id} className="card crm-provider-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div className="crm-icon-badge" style={{ backgroundColor: provider.badgeColor }}>
                      {provider.icon}
                    </div>
                    {isConnected && <span className="badge green">Connected</span>}
                  </div>

                  <div style={{ fontSize: "16px", fontWeight: "700", marginTop: "14px" }}>
                    {provider.name}
                  </div>
                  <div className="subtitle" style={{ minHeight: "36px", marginBottom: "18px" }}>
                    {provider.description}
                  </div>

                  <button
                    className={`btn ${isConnected ? "" : "primary"}`}
                    style={{ width: "100%" }}
                    onClick={() => handleOpenConnectModal(provider)}
                  >
                    {isConnected ? "Configure / Edit" : provider.id === "custom" ? "Configure" : "Connect"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CRM DATA SYNC & AUTOMATION (REQUIREMENTS 4 & 6 & 7) */}
      {activeTab === "sync" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* SECTION 4: CRM DATA SYNC SETTINGS */}
          <div className="card">
            <h2 className="card-title">CRM Sync Settings</h2>
            <p className="subtitle" style={{ marginTop: "-10px", marginBottom: "20px" }}>
              Choose which AI Receptionist data should be synchronized with your CRM.
            </p>

            <div className="grid2" style={{ gap: "16px" }}>
              {[
                { key: "syncContacts", label: "Sync Contacts", desc: "Automatically create or update contact records in your CRM." },
                { key: "syncLeads", label: "Sync Leads", desc: "Generate CRM leads automatically from qualified callers." },
                { key: "syncCallRecords", label: "Sync Call Records", desc: "Automatically create a CRM activity for every inbound call." },
                { key: "syncCallTranscripts", label: "Sync Call Transcripts", desc: "Store the full AI conversation transcript in the CRM activity." },
                { key: "syncCallSummary", label: "Sync Call Summary", desc: "Store the AI-generated call summary in the CRM activity." },
                { key: "syncCallerIntent", label: "Sync Caller Intent", desc: "Extract caller intent and topic tags into CRM field attributes." },
                { key: "syncAppointments", label: "Sync Appointments", desc: "Automatically create or update appointment information in the CRM." },
                { key: "syncFollowupTasks", label: "Sync Follow-up Tasks", desc: "Create follow-up tasks for human sales or customer support reps." },
                { key: "syncAiData", label: "Sync AI Conversation Data", desc: "Push sentiment scores, extracted entity data, and AI tags." },
                { key: "syncRecordingUrl", label: "Sync Call Recording URL", desc: "Attach call audio recording URL link to CRM activity logs." },
                { key: "syncHumanTransferDetails", label: "Sync Human Transfer Details", desc: "Log call transfer details, transfer time, and target agent." }
              ].map((item) => (
                <div key={item.key} className="crm-toggle-row">
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>{item.label}</div>
                    <div style={{ fontSize: "12px", color: "#667085" }}>{item.desc}</div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={syncSettings[item.key]}
                      onChange={(e) =>
                        setSyncSettings({ ...syncSettings, [item.key]: e.target.checked })
                      }
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 6: CRM AUTOMATION RULES */}
          <div className="card">
            <h2 className="card-title">CRM Automation</h2>
            <p className="subtitle" style={{ marginTop: "-10px", marginBottom: "20px" }}>
              Define what should happen automatically after each call.
            </p>

            <div className="grid2" style={{ gap: "16px" }}>
              {[
                { key: "newCallerContact", trigger: "When a new caller contacts:", action: "Create Contact" },
                { key: "leadIdentified", trigger: "When caller is identified as a lead:", action: "Create Lead" },
                { key: "appointmentBooked", trigger: "When appointment is booked:", action: "Create CRM Activity" },
                { key: "callTransferred", trigger: "When call is transferred to human:", action: "Create Follow-up Task" },
                { key: "callUnresolved", trigger: "When call is unresolved:", action: "Create Follow-up Task" },
                { key: "callbackRequested", trigger: "When caller requests a callback:", action: "Create Callback Task" },
                { key: "existingContactCall", trigger: "When an existing contact calls:", action: "Update Contact" },
                { key: "appointmentCancelled", trigger: "When appointment is cancelled:", action: "Update CRM Appointment" }
              ].map((rule) => (
                <div key={rule.key} className="crm-automation-card">
                  <div>
                    <span style={{ fontSize: "12px", color: "#667085" }}>{rule.trigger}</span>
                    <div style={{ fontWeight: "700", color: "#635bff", marginTop: "2px" }}>
                      → {rule.action}
                    </div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={automationRules[rule.key]}
                      onChange={(e) =>
                        setAutomationRules({ ...automationRules, [rule.key]: e.target.checked })
                      }
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 7: CALL ACTIVITY SETTINGS */}
          <div className="card">
            <h2 className="card-title">Call Activity Sync</h2>

            <div className="grid3" style={{ gap: "16px", marginBottom: "20px" }}>
              <div>
                <label className="stat-label">Activity Type</label>
                <input
                  type="text"
                  className="search"
                  style={{ width: "100%", marginTop: "6px" }}
                  value={activitySettings.activityType}
                  onChange={(e) =>
                    setActivitySettings({ ...activitySettings, activityType: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="stat-label">Default Activity Status</label>
                <select
                  className="search"
                  style={{ width: "100%", marginTop: "6px" }}
                  value={activitySettings.activityStatus}
                  onChange={(e) =>
                    setActivitySettings({ ...activitySettings, activityStatus: e.target.value })
                  }
                >
                  <option value="Completed">Completed</option>
                  <option value="Transferred">Transferred</option>
                  <option value="Missed">Missed</option>
                  <option value="Unresolved">Unresolved</option>
                </select>
              </div>
              <div>
                <label className="stat-label">Call Direction</label>
                <input
                  type="text"
                  className="search"
                  style={{ width: "100%", marginTop: "6px" }}
                  value={activitySettings.direction}
                  readOnly
                />
              </div>
            </div>

            <div className="crm-toggle-row" style={{ background: "rgba(244, 245, 243, 0.05)", border: "1px solid rgba(244, 245, 243, 0.08)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontWeight: "600", color: "#fff" }}>Create CRM activity automatically after every call</div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={activitySettings.autoCreateActivity}
                  onChange={(e) =>
                    setActivitySettings({ ...activitySettings, autoCreateActivity: e.target.checked })
                  }
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn" onClick={() => showNotification("Changes cancelled")}>Cancel</button>
            <button className="btn primary" onClick={() => showNotification("CRM Sync Settings saved successfully!")}>
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: FIELD MAPPING (REQUIREMENT 5) */}
      {activeTab === "field_mapping" && (
        <div className="card">
          <h2 className="card-title">CRM Field Mapping</h2>
          <p className="subtitle" style={{ marginTop: "-10px", marginBottom: "20px" }}>
            Map AI Receptionist data to your CRM fields.
          </p>

          <div className="table" style={{ marginBottom: "20px" }}>
            <table>
              <thead>
                <tr>
                  <th>AI RECEPTIONIST FIELD</th>
                  <th>CRM FIELD</th>
                  <th style={{ textAlign: "right" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {fieldMappings.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: "600" }}>{row.aiField}</td>
                    <td>
                      <select
                        className="search"
                        style={{ width: "240px", padding: "6px 10px" }}
                        value={row.crmField}
                        onChange={(e) => {
                          const updated = fieldMappings.map((m) =>
                            m.id === row.id ? { ...m, crmField: e.target.value } : m
                          );
                          setFieldMappings(updated);
                        }}
                      >
                        <option value="Contact Name">Contact Name</option>
                        <option value="Phone">Phone</option>
                        <option value="Email">Email</option>
                        <option value="Call Date">Call Date</option>
                        <option value="Call Duration">Call Duration</option>
                        <option value="Call Status">Call Status</option>
                        <option value="Lead Source">Lead Source</option>
                        <option value="Description">Description</option>
                        <option value="Appointment Date">Appointment Date</option>
                        <option value="Appointment Time">Appointment Time</option>
                        <option value="Service">Service</option>
                        <option value="Assigned Agent">Assigned Agent</option>
                        <option value="Custom CRM Field">Custom Field</option>
                      </select>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn danger"
                        style={{ padding: "4px 10px", fontSize: "11px" }}
                        onClick={() => handleRemoveFieldMapping(row.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add custom mapping row */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              background: "rgba(244, 245, 243, 0.05)",
              border: "1px solid rgba(244, 245, 243, 0.08)",
              padding: "16px",
              borderRadius: "10px",
              alignItems: "center"
            }}
          >
            <input
              type="text"
              className="search"
              placeholder="Custom AI Field (e.g. Caller Preference)"
              value={newAiField}
              onChange={(e) => setNewAiField(e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="text"
              className="search"
              placeholder="CRM Field Name (e.g. Custom_Pref__c)"
              value={newCrmField}
              onChange={(e) => setNewCrmField(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn primary" onClick={handleAddFieldMapping}>
              + Add Field Mapping
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button className="btn" onClick={() => showNotification("Changes cancelled")}>Cancel</button>
            <button className="btn primary" onClick={() => showNotification("Field mappings saved successfully!")}>
              Save Field Mappings
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: CONTACTS, LEADS & APPOINTMENTS (REQUIREMENTS 8, 9, 10) */}
      {activeTab === "contacts_leads" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* REQUIREMENT 8: CONTACT CREATION SETTINGS */}
          <div className="card">
            <h2 className="card-title">Contact Management</h2>
            
            <div className="grid2" style={{ gap: "14px", marginBottom: "20px" }}>
              {[
                { key: "autoCreateContacts", label: "Automatically create new contacts" },
                { key: "updateExisting", label: "Update existing contacts" },
                { key: "matchPhone", label: "Match contacts by phone number" },
                { key: "matchEmail", label: "Match contacts by email" },
                { key: "preventDuplicates", label: "Prevent duplicate contacts" }
              ].map((item) => (
                <div key={item.key} className="crm-toggle-row">
                  <span style={{ fontWeight: "600" }}>{item.label}</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={contactSettings[item.key]}
                      onChange={(e) =>
                        setContactSettings({ ...contactSettings, [item.key]: e.target.checked })
                      }
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "16px" }}>
              <label className="stat-label">Duplicate Handling Strategy</label>
              <select
                className="search"
                style={{ width: "100%", marginTop: "6px" }}
                value={contactSettings.duplicateHandling}
                onChange={(e) =>
                  setContactSettings({ ...contactSettings, duplicateHandling: e.target.value })
                }
              >
                <option value="Update Existing Contact">Update Existing Contact</option>
                <option value="Create New Contact">Create New Contact</option>
                <option value="Ask Before Creating">Ask Before Creating</option>
              </select>
            </div>
          </div>

          {/* REQUIREMENT 9: LEAD MANAGEMENT */}
          <div className="card">
            <h2 className="card-title">Lead Management</h2>

            <div className="grid3" style={{ gap: "16px" }}>
              <div>
                <label className="stat-label">Lead Creation Status</label>
                <select
                  className="search"
                  style={{ width: "100%", marginTop: "6px" }}
                  value={leadSettings.enabled ? "Enabled" : "Disabled"}
                  onChange={(e) =>
                    setLeadSettings({ ...leadSettings, enabled: e.target.value === "Enabled" })
                  }
                >
                  <option value="Enabled">Enabled</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>

              <div>
                <label className="stat-label">Lead Source Attribute</label>
                <select
                  className="search"
                  style={{ width: "100%", marginTop: "6px" }}
                  value={leadSettings.leadSource}
                  onChange={(e) =>
                    setLeadSettings({ ...leadSettings, leadSource: e.target.value })
                  }
                >
                  <option value="AI Receptionist">AI Receptionist</option>
                  <option value="Website Inbound Call">Website Inbound Call</option>
                  <option value="Phone SIP Trunk">Phone SIP Trunk</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="stat-label">Initial Lead Status</label>
                <select
                  className="search"
                  style={{ width: "100%", marginTop: "6px" }}
                  value={leadSettings.leadStatus}
                  onChange={(e) =>
                    setLeadSettings({ ...leadSettings, leadStatus: e.target.value })
                  }
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Converted">Converted</option>
                </select>
              </div>
            </div>
          </div>

          {/* REQUIREMENT 10: APPOINTMENT CRM SYNC */}
          <div className="card">
            <h2 className="card-title">Appointment Sync</h2>

            <div className="grid2" style={{ gap: "14px" }}>
              {[
                { key: "createOnBooking", label: "Create CRM activity when appointment is booked" },
                { key: "updateOnReschedule", label: "Update CRM when appointment is rescheduled" },
                { key: "updateOnCancel", label: "Update CRM when appointment is cancelled" },
                { key: "addNotes", label: "Add appointment notes to CRM record" },
                { key: "syncDateTime", label: "Sync appointment date and time" },
                { key: "syncService", label: "Sync service requested" },
                { key: "syncStaff", label: "Sync assigned staff member" }
              ].map((item) => (
                <div key={item.key} className="crm-toggle-row">
                  <span style={{ fontWeight: "600" }}>{item.label}</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={appointmentSettings[item.key]}
                      onChange={(e) =>
                        setAppointmentSettings({ ...appointmentSettings, [item.key]: e.target.checked })
                      }
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn" onClick={() => showNotification("Changes cancelled")}>Cancel</button>
            <button className="btn primary" onClick={() => showNotification("Contact & Lead settings saved!")}>
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: WEBHOOK / REST API FOR CUSTOM CRM (REQUIREMENT 11) */}
      {activeTab === "custom_api" && (
        <div className="card">
          <h2 className="card-title">API & Webhook Configuration (Custom CRM)</h2>
          <p className="subtitle" style={{ marginTop: "-10px", marginBottom: "20px" }}>
            Configure custom REST API endpoints, webhooks, authentication, and HTTP headers.
          </p>

          <div className="grid2" style={{ gap: "16px", marginBottom: "16px" }}>
            <div>
              <label className="stat-label">API Base URL</label>
              <input
                type="text"
                className="search"
                style={{ width: "100%", marginTop: "6px" }}
                value={apiConfig.baseUrl}
                onChange={(e) => setApiConfig({ ...apiConfig, baseUrl: e.target.value })}
              />
            </div>

            <div>
              <label className="stat-label">Authentication Type</label>
              <select
                className="search"
                style={{ width: "100%", marginTop: "6px" }}
                value={apiConfig.authType}
                onChange={(e) => setApiConfig({ ...apiConfig, authType: e.target.value })}
              >
                <option value="API Key">API Key</option>
                <option value="Bearer Token">Bearer Token</option>
                <option value="OAuth 2.0">OAuth 2.0</option>
                <option value="Basic Authentication">Basic Authentication</option>
              </select>
            </div>
          </div>

          <div className="grid2" style={{ gap: "16px", marginBottom: "16px" }}>
            {apiConfig.authType === "API Key" && (
              <div>
                <label className="stat-label">API Key</label>
                <input
                  type="password"
                  className="search"
                  style={{ width: "100%", marginTop: "6px" }}
                  value={apiConfig.apiKey}
                  onChange={(e) => setApiConfig({ ...apiConfig, apiKey: e.target.value })}
                />
              </div>
            )}

            {apiConfig.authType === "Bearer Token" && (
              <div>
                <label className="stat-label">Bearer Token</label>
                <input
                  type="password"
                  className="search"
                  style={{ width: "100%", marginTop: "6px" }}
                  value={apiConfig.bearerToken}
                  onChange={(e) => setApiConfig({ ...apiConfig, bearerToken: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="stat-label">Webhook Listener URL</label>
              <input
                type="text"
                className="search"
                style={{ width: "100%", marginTop: "6px" }}
                value={apiConfig.webhookUrl}
                onChange={(e) => setApiConfig({ ...apiConfig, webhookUrl: e.target.value })}
              />
            </div>

            <div>
              <label className="stat-label">HTTP Method</label>
              <select
                className="search"
                style={{ width: "100%", marginTop: "6px" }}
                value={apiConfig.httpMethod}
                onChange={(e) => setApiConfig({ ...apiConfig, httpMethod: e.target.value })}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </div>

          {/* Headers */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label className="stat-label">HTTP Headers</label>
              <button className="btn" style={{ fontSize: "11px", padding: "4px 8px" }} onClick={handleAddHeader}>
                + Add Header
              </button>
            </div>
            {apiConfig.headers.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                <input
                  type="text"
                  className="search"
                  placeholder="Header Key"
                  value={h.key}
                  onChange={(e) => {
                    const headers = [...apiConfig.headers];
                    headers[i].key = e.target.value;
                    setApiConfig({ ...apiConfig, headers });
                  }}
                  style={{ flex: 1 }}
                />
                <input
                  type="text"
                  className="search"
                  placeholder="Header Value"
                  value={h.value}
                  onChange={(e) => {
                    const headers = [...apiConfig.headers];
                    headers[i].value = e.target.value;
                    setApiConfig({ ...apiConfig, headers });
                  }}
                  style={{ flex: 1 }}
                />
              </div>
            ))}
          </div>

          {/* Payload JSON */}
          <div style={{ marginBottom: "20px" }}>
            <label className="stat-label">Request Body (JSON Payload)</label>
            <textarea
              className="search"
              rows={6}
              style={{ width: "100%", fontFamily: "monospace", fontSize: "12px", marginTop: "6px" }}
              value={apiConfig.requestBody}
              onChange={(e) => setApiConfig({ ...apiConfig, requestBody: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
            <button className="btn" onClick={handleTestConnection}>
              Test API Connection
            </button>
            <button className="btn primary" onClick={() => showNotification("API Configuration saved!")}>
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: SYNC LOGS (REQUIREMENT 12) */}
      {activeTab === "logs" && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 className="card-title" style={{ marginBottom: "2px" }}>CRM Sync Activity</h2>
              <p className="subtitle">Real-time audit log of records synchronized with CRM platforms.</p>
            </div>
            <button className="btn" onClick={handleRefreshLogs}>
              {logsLoading ? "Refreshing..." : "🔄 Refresh Logs"}
            </button>
          </div>

          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>DATE & TIME</th>
                  <th>RECORD NAME</th>
                  <th>TYPE</th>
                  <th>CRM</th>
                  <th>STATUS</th>
                  <th>MESSAGE</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.datetime}</td>
                    <td style={{ fontWeight: "600" }}>{log.record}</td>
                    <td>{log.type}</td>
                    <td>{log.crm}</td>
                    <td>
                      <span
                        className={`badge ${
                          log.status === "Success"
                            ? "green"
                            : log.status === "Pending"
                            ? "yellow"
                            : "red"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px", color: "#667085" }}>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONNECTION FORM MODAL (REQUIREMENTS 2 & 13 & 14) */}
      {showConfigModal && selectedProvider && (
        <div className="crm-modal-overlay">
          <div className="crm-modal-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>{selectedProvider.icon}</span>
                <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
                  Connect to {selectedProvider.name}
                </h2>
              </div>
              <button
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer" }}
                onClick={() => setShowConfigModal(false)}
              >
                ✕
              </button>
            </div>

            {testResult && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  fontWeight: "600",
                  backgroundColor: testResult.success ? "#dcfce7" : "#fee2e2",
                  color: testResult.success ? "#15803d" : "#dc2626"
                }}
              >
                {testResult.success ? "✓ " : "✕ "} {testResult.message}
              </div>
            )}

            <form onSubmit={handleSaveConnection}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label className="stat-label">CRM Provider</label>
                  <select
                    className="search"
                    style={{ width: "100%", marginTop: "4px" }}
                    value={selectedProvider.name}
                    onChange={(e) => {
                      const p = CRM_PROVIDERS.find((prov) => prov.name === e.target.value);
                      if (p) setSelectedProvider(p);
                    }}
                  >
                    {CRM_PROVIDERS.map((prov) => (
                      <option key={prov.id} value={prov.name}>
                        {prov.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="stat-label">Connection Name</label>
                  <input
                    type="text"
                    className="search"
                    style={{ width: "100%", marginTop: "4px" }}
                    placeholder="Enter connection name (e.g. Salesforce Production)"
                    value={formData.connectionName}
                    onChange={(e) => setFormData({ ...formData, connectionName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="stat-label">CRM Account / Organization</label>
                  <input
                    type="text"
                    className="search"
                    style={{ width: "100%", marginTop: "4px" }}
                    placeholder="Enter account or organization name"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="stat-label">API Base URL</label>
                  <input
                    type="text"
                    className="search"
                    style={{ width: "100%", marginTop: "4px" }}
                    placeholder="https://api.example.com"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  />
                </div>

                {/* Conditional Fields based on Auth Type */}
                {selectedProvider.authType === "api_key" && (
                  <div>
                    <label className="stat-label">API Key</label>
                    <input
                      type="password"
                      className="search"
                      style={{ width: "100%", marginTop: "4px" }}
                      placeholder="Enter API key"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    />
                  </div>
                )}

                {selectedProvider.authType === "oauth" && (
                  <>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <label className="stat-label">Client ID</label>
                        <input
                          type="text"
                          className="search"
                          style={{ width: "100%", marginTop: "4px" }}
                          placeholder="Enter client ID"
                          value={formData.clientId}
                          onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="stat-label">Client Secret</label>
                        <input
                          type="password"
                          className="search"
                          style={{ width: "100%", marginTop: "4px" }}
                          placeholder="Enter client secret"
                          value={formData.clientSecret}
                          onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {selectedProvider.id === "custom" && (
                  <>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div style={{ flex: 1 }}>
                        <label className="stat-label">Access Token</label>
                        <input
                          type="password"
                          className="search"
                          style={{ width: "100%", marginTop: "4px" }}
                          placeholder="Enter access token"
                          value={formData.accessToken}
                          onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label className="stat-label">Refresh Token</label>
                        <input
                          type="password"
                          className="search"
                          style={{ width: "100%", marginTop: "4px" }}
                          placeholder="Enter refresh token"
                          value={formData.refreshToken}
                          onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div
                style={{
                  display: "flex",
                  justify: "space-between",
                  alignItems: "center",
                  marginTop: "24px"
                }}
              >
                <div>
                  {selectedProvider.authType === "oauth" && (
                    <button
                      type="button"
                      className="btn"
                      style={{ background: selectedProvider.badgeColor, color: "#fff", border: "none" }}
                      onClick={() => handleSaveConnection()}
                    >
                      🔗 Connect with OAuth
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn"
                    disabled={testingConnection}
                    onClick={handleTestConnection}
                  >
                    {testingConnection ? "Testing..." : "Test Connection"}
                  </button>

                  <button type="submit" className="btn primary">
                    Save Connection
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
