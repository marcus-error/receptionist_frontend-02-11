import { useEffect, useState } from "react";
import workflowService from "../../services/workflow.service.js";
import Badge from "../../components/ui/Badge.jsx";
import {
  Zap,
  Plus,
  Play,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  MessageSquare,
  Mail,
  PhoneCall,
  Users,
  RefreshCw,
  Sparkles,
  History,
  AlertCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

const TRIGGER_LABELS = {
  call_ended: { label: "Call Ended", color: "blue", icon: PhoneCall },
  appointment_created: { label: "Appointment Booked", color: "purple", icon: CheckCircle2 },
  missed_call: { label: "Missed Call", color: "orange", icon: AlertCircle },
  emergency_call: { label: "Emergency Call", color: "red", icon: Zap },
  lead_captured: { label: "Lead Captured", color: "teal", icon: Sparkles }
};

const ACTION_LABELS = {
  send_whatsapp: { label: "Send WhatsApp / SMS", color: "green", icon: MessageSquare },
  send_email: { label: "Send Email Notification", color: "blue", icon: Mail },
  notify_staff: { label: "Notify Duty Staff", color: "yellow", icon: Users },
  transfer_call: { label: "Direct Call Transfer", color: "purple", icon: PhoneCall },
  sync_crm: { label: "Sync to CRM Pipeline", color: "teal", icon: RefreshCw }
};

export default function Workflows() {
  const [activeTab, setActiveTab] = useState("workflows"); // 'workflows' | 'logs'
  const [workflows, setWorkflows] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWf, setEditingWf] = useState(null);
  const [testingId, setTestingId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trigger_event: "call_ended",
    action_type: "send_whatsapp",
    action_config: "",
    is_active: true
  });

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const data = await workflowService.getAll();
      setWorkflows(data || []);
    } catch (err) {
      console.error("Failed to load workflows:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const data = await workflowService.getLogs();
      setLogs(data || []);
    } catch (err) {
      console.error("Failed to load workflow logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") {
      fetchLogs();
    }
  }, [activeTab]);

  const handleOpenModal = (wf = null) => {
    if (wf) {
      setEditingWf(wf);
      setFormData({
        name: wf.name || "",
        description: wf.description || "",
        trigger_event: wf.trigger_event || "call_ended",
        action_type: wf.action_type || "send_whatsapp",
        action_config: wf.action_config || "",
        is_active: wf.is_active ?? true
      });
    } else {
      setEditingWf(null);
      setFormData({
        name: "",
        description: "",
        trigger_event: "call_ended",
        action_type: "send_whatsapp",
        action_config: "",
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveWorkflow = async (e) => {
    e.preventDefault();
    try {
      if (editingWf) {
        await workflowService.update(editingWf.id, formData);
      } else {
        await workflowService.create(formData);
      }
      setIsModalOpen(false);
      fetchWorkflows();
    } catch (err) {
      alert("Failed to save workflow: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await workflowService.toggle(id);
      fetchWorkflows();
    } catch (err) {
      alert("Failed to toggle workflow status: " + err.message);
    }
  };

  const handleDeleteWorkflow = async (id) => {
    if (!window.confirm("Are you sure you want to delete this automation workflow?")) return;
    try {
      await workflowService.remove(id);
      fetchWorkflows();
    } catch (err) {
      alert("Failed to delete workflow: " + err.message);
    }
  };

  const handleTestRun = async (id, name) => {
    try {
      setTestingId(id);
      const res = await workflowService.testRun(id);
      alert(`⚡ Test Run Success!\n${res.message}`);
      if (activeTab === "logs") fetchLogs();
    } catch (err) {
      alert("Test run failed: " + err.message);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <section id="workflows-page" className="page active">
      {/* Page Header */}
      <div className="header" style={{ marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <div
              style={{
                background: "rgba(56, 189, 248, 0.15)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: "8px",
                padding: "8px",
                display: "flex"
              }}
            >
              <Zap size={22} color="#38bdf8" />
            </div>
            <h1 className="title" style={{ margin: 0 }}>Workflow Automations</h1>
          </div>
          <p className="subtitle" style={{ margin: 0, color: "var(--muted)" }}>
            Configure automated actions (WhatsApp/SMS, Email, Staff Notifications, CRM Sync) triggered by caller events.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Tab Switches */}
          <div style={{ background: "rgba(30, 41, 59, 0.7)", padding: "4px", borderRadius: "10px", display: "flex", gap: "4px" }}>
            <button
              onClick={() => setActiveTab("workflows")}
              style={{
                background: activeTab === "workflows" ? "var(--accent)" : "transparent",
                color: activeTab === "workflows" ? "#fff" : "var(--muted)",
                border: "none",
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              ⚡ Automations
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              style={{
                background: activeTab === "logs" ? "var(--accent)" : "transparent",
                color: activeTab === "logs" ? "#fff" : "var(--muted)",
                border: "none",
                borderRadius: "6px",
                padding: "6px 14px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <History size={14} /> Execution Logs
            </button>
          </div>

          <button className="btn primary" onClick={() => handleOpenModal()}>
            + Create Workflow
          </button>
        </div>
      </div>

      {activeTab === "workflows" ? (
        <>
          {/* Quick Preset Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.5) 100%)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: "14px",
              padding: "20px",
              marginBottom: "20px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Sparkles size={18} color="#38bdf8" />
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc", margin: 0 }}>
                Popular Automation Presets
              </h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "12px" }}>
              <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>📞 Missed Call Auto-SMS</div>
                <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "4px" }}>Triggers instant SMS to caller when a call is missed.</div>
              </div>
              <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>📅 Booking Email & WhatsApp</div>
                <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "4px" }}>Sends instant confirmation message on appointment booking.</div>
              </div>
              <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>🚨 Emergency Staff Alert</div>
                <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "4px" }}>Alerts duty doctor on urgent emergency calls.</div>
              </div>
              <div style={{ background: "rgba(30, 41, 59, 0.6)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "#f1f5f9" }}>🔄 Lead Auto-CRM Sync</div>
                <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "4px" }}>Syncs new caller contact details to HubSpot/Zoho.</div>
              </div>
            </div>
          </div>

          {/* Workflows Table */}
          <div className="table">
            <table>
              <thead>
                <tr>
                  <th>Workflow Name</th>
                  <th>Trigger Event</th>
                  <th>Action Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                      Loading workflow automations...
                    </td>
                  </tr>
                ) : workflows.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                      No workflows configured yet. Click "+ Create Workflow" to add your first automation.
                    </td>
                  </tr>
                ) : (
                  workflows.map((wf) => {
                    const trig = TRIGGER_LABELS[wf.trigger_event] || { label: wf.trigger_event, color: "gray" };
                    const act = ACTION_LABELS[wf.action_type] || { label: wf.action_type, color: "blue" };
                    return (
                      <tr key={wf.id}>
                        <td>
                          <div style={{ fontWeight: "700", color: "var(--heading)", fontSize: "14px" }}>{wf.name}</div>
                          {wf.description && (
                            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                              {wf.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <Badge color={trig.color}>{trig.label}</Badge>
                        </td>
                        <td>
                          <Badge color={act.color}>{act.label}</Badge>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleActive(wf.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px"
                            }}
                          >
                            <Badge color={wf.is_active ? "green" : "gray"}>
                              {wf.is_active ? "⚡ Active" : "⏸️ Inactive"}
                            </Badge>
                          </button>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            <button
                              className="btn btn-sm success"
                              disabled={testingId === wf.id}
                              onClick={() => handleTestRun(wf.id, wf.name)}
                              style={{ fontSize: "12px" }}
                            >
                              {testingId === wf.id ? "Running..." : "⚡ Test Run"}
                            </button>
                            <button
                              className="btn btn-sm"
                              onClick={() => handleOpenModal(wf)}
                              style={{ fontSize: "12px" }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="btn btn-sm danger"
                              onClick={() => handleDeleteWorkflow(wf.id)}
                              style={{ fontSize: "12px" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        /* Execution History Logs View */
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Execution Time</th>
                <th>Workflow Name</th>
                <th>Trigger Event</th>
                <th>Action Executed</th>
                <th>Status</th>
                <th>Execution Details</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    Loading execution logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                    No workflow execution logs found yet. Run a workflow test to generate execution logs!
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: "12.5px", color: "var(--muted)", fontFamily: "monospace" }}>
                      {new Date(log.executed_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: "600", color: "var(--heading)" }}>{log.workflow_name || `Workflow #${log.workflow_id}`}</td>
                    <td>
                      <Badge color="blue">{log.trigger_event}</Badge>
                    </td>
                    <td>
                      <Badge color="purple">{log.action_type}</Badge>
                    </td>
                    <td>
                      <Badge color={log.status === "success" ? "green" : "red"}>
                        {log.status === "success" ? "✓ Success" : "✖ Failed"}
                      </Badge>
                    </td>
                    <td style={{ fontSize: "12px", color: "var(--muted)", maxWidth: "300px" }}>
                      {log.details || "Execution completed."}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Workflow Builder Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap size={20} color="#38bdf8" />
                {editingWf ? "Edit Workflow Automation" : "Create New Workflow Automation"}
              </h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveWorkflow} style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  Workflow Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Appointment Confirmation WhatsApp"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Automatically sends booking details to caller"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="modal-grid" style={{ gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                    Trigger Event *
                  </label>
                  <select
                    value={formData.trigger_event}
                    onChange={(e) => setFormData({ ...formData, trigger_event: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e293b", color: "#fff", border: "1px solid #334155" }}
                  >
                    <option value="call_ended">📞 Call Ended</option>
                    <option value="appointment_created">📅 Appointment Booked</option>
                    <option value="missed_call">⚠️ Missed Call</option>
                    <option value="emergency_call">🚨 Emergency Call</option>
                    <option value="lead_captured">🙋 Lead Captured</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                    Automated Action *
                  </label>
                  <select
                    value={formData.action_type}
                    onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "#1e293b", color: "#fff", border: "1px solid #334155" }}
                  >
                    <option value="send_whatsapp">💬 Send WhatsApp / SMS</option>
                    <option value="send_email">✉️ Send Email Alert</option>
                    <option value="notify_staff">👥 Notify Staff Member</option>
                    <option value="transfer_call">📲 Direct Call Transfer</option>
                    <option value="sync_crm">🔄 Sync to CRM</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
                  Action Message / Configuration Payload
                </label>
                <textarea
                  rows={3}
                  placeholder='e.g. {"message": "Thank you for contacting us!", "template": "booking_success"}'
                  value={formData.action_config}
                  onChange={(e) => setFormData({ ...formData, action_config: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#1e293b",
                    color: "#fff",
                    border: "1px solid #334155",
                    fontSize: "13px",
                    fontFamily: "monospace"
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="wf-active-check"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: "18px", height: "18px", accentColor: "var(--accent)", cursor: "pointer" }}
                />
                <label htmlFor="wf-active-check" style={{ fontSize: "13px", cursor: "pointer", fontWeight: "600" }}>
                  Enable Workflow Immediately
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn">
                  Cancel
                </button>
                <button type="submit" className="btn primary">
                  {editingWf ? "Update Workflow" : "Create Workflow"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
