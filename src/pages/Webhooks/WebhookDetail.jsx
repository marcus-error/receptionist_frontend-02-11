import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Webhook,
  ArrowLeft,
  Play,
  RotateCcw,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  Check,
  Shield,
  Send,
  AlertTriangle,
  ExternalLink,
  Code2,
  RefreshCw,
  Eye,
  Lock,
  Globe,
  Radio,
  FileText
} from "lucide-react";
import Badge from "../../components/ui/Badge.jsx";
import {
  getWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhook,
  sendWebhookTest,
  getWebhookDeliveries,
  getDelivery,
  retryDelivery,
  rotateWebhookSecret,
  getWebhookEvents
} from "../../services/webhook.service.js";
import "./webhooks.css";

export default function WebhookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [webhook, setWebhook] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  // Modals & Actions
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", url: "", events: [], is_active: true });
  const [savingEdit, setSavingEdit] = useState(false);

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEvent, setTestEvent] = useState("");
  const [customPayload, setCustomPayload] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [rotateModalOpen, setRotateModalOpen] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [newRotatedSecret, setNewRotatedSecret] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const [copiedField, setCopiedField] = useState(null);
  const [activeCodeTab, setActiveCodeTab] = useState("nodejs");

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wh, evRes, delRes] = await Promise.all([
        getWebhook(id),
        getWebhookEvents().catch(() => ({ events: [] })),
        getWebhookDeliveries(id, { limit: 50 }).catch(() => ({ deliveries: [] }))
      ]);
      setWebhook(wh);
      setDeliveries(delRes.deliveries || []);
      setAvailableEvents(evRes.events || []);
      setEditForm({
        name: wh.name || "",
        url: wh.url || "",
        events: wh.events || [],
        is_active: wh.is_active
      });
      if (wh.events && wh.events.length > 0) {
        setTestEvent(wh.events[0]);
      }
    } catch (err) {
      console.error("Failed to load webhook detail:", err);
      setError(err.message || "Failed to load webhook details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const showNotice = (msg) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Toggle Active
  const handleToggle = async () => {
    try {
      const res = await toggleWebhook(id);
      setWebhook(res);
      showNotice(`Webhook is now ${res.is_active ? "Active" : "Inactive"}`);
    } catch (err) {
      alert(err.message || "Failed to toggle status");
    }
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const payload = {
        name: editForm.name,
        events: editForm.events,
        is_active: editForm.is_active
      };
      if (webhook.type === "outgoing") {
        payload.url = editForm.url;
      }
      const updated = await updateWebhook(id, payload);
      setWebhook(updated);
      setEditModalOpen(false);
      showNotice("Webhook configuration updated successfully");
    } catch (err) {
      alert(err.message || "Failed to update webhook");
    } finally {
      setSavingEdit(false);
    }
  };

  // Rotate Secret
  const handleRotateSecret = async () => {
    setRotating(true);
    try {
      const res = await rotateWebhookSecret(id);
      setWebhook(res);
      setNewRotatedSecret(res.secret);
      showNotice("Webhook secret has been rotated successfully");
    } catch (err) {
      alert(err.message || "Failed to rotate secret");
      setRotateModalOpen(false);
    } finally {
      setRotating(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteWebhook(id);
      navigate("/admin/webhooks");
    } catch (err) {
      alert(err.message || "Failed to delete webhook");
      setDeleting(false);
    }
  };

  // Send Test
  const handleSendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      let parsedPayload = null;
      if (customPayload.trim()) {
        try {
          parsedPayload = JSON.parse(customPayload);
        } catch (e) {
          alert("Invalid JSON format in custom payload");
          setTesting(false);
          return;
        }
      }
      const res = await sendWebhookTest(id, testEvent || "test.ping", parsedPayload);
      setTestResult(res);
      const delRes = await getWebhookDeliveries(id, { limit: 50 });
      setDeliveries(delRes.deliveries || []);
    } catch (err) {
      setTestResult({
        success: false,
        http_status: 0,
        duration_ms: 0,
        error_message: err.message || "Failed to execute test request"
      });
    } finally {
      setTesting(false);
    }
  };

  // Retry Delivery
  const handleRetry = async (deliveryId) => {
    setRetryingId(deliveryId);
    try {
      const updated = await retryDelivery(id, deliveryId);
      setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? updated : d)));
      if (selectedDelivery && selectedDelivery.id === deliveryId) {
        setSelectedDelivery(updated);
      }
      showNotice("Delivery retry executed successfully");
    } catch (err) {
      alert(err.message || "Failed to retry delivery");
    } finally {
      setRetryingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "delivered":
        return <Badge variant="success">Delivered</Badge>;
      case "failed":
        return <Badge variant="danger">Failed</Badge>;
      case "processing":
      case "retrying":
        return <Badge variant="warning">{status === "retrying" ? "Retrying" : "Processing"}</Badge>;
      case "pending":
      default:
        return <Badge variant="neutral">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: "48px", textAlign: "center" }}>
        <RefreshCw className="spin" size={32} style={{ margin: "0 auto 16px", color: "var(--primary, #0284c7)" }} />
        <p style={{ color: "var(--muted, #64748b)" }}>Loading webhook details...</p>
      </div>
    );
  }

  if (error || !webhook) {
    return (
      <div className="card" style={{ padding: "32px", textAlign: "center" }}>
        <AlertTriangle size={36} color="#ef4444" style={{ margin: "0 auto 12px" }} />
        <h3>Webhook Not Found</h3>
        <p style={{ color: "var(--muted, #64748b)", marginBottom: "20px" }}>{error || "The requested webhook could not be found."}</p>
        <Link to="/admin/webhooks" className="wh-btn-primary">
          <ArrowLeft size={16} /> Back to Webhooks
        </Link>
      </div>
    );
  }

  const sampleJsonVerificationPython = `# Python FastAPI / Flask signature verification
import hmac, hashlib

def verify_signature(payload_bytes: bytes, signature_header: str, secret: str) -> bool:
    expected_sig = hmac.new(
        secret.encode('utf-8'),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()
    clean_sig = signature_header.replace('sha256=', '')
    return hmac.compare_digest(expected_sig, clean_sig)`;

  const sampleJsonVerificationNode = `// Node.js Express / Next.js signature verification
const crypto = require('crypto');

function verifyWebhook(rawBody, signatureHeader, secret) {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const cleanSig = signatureHeader.replace('sha256=', '');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSig),
    Buffer.from(cleanSig)
  );
}`;

  const sampleCurlVerification = `# Test your incoming endpoint with cURL
curl -X POST "${webhook.url || 'https://YOUR_DOMAIN/api/v1/webhooks/incoming/' + webhook.id}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Event: appointment.created" \\
  -H "X-Webhook-Event-ID: evt_test_123" \\
  -H "X-Webhook-Timestamp: $(date +%s)" \\
  -d '{"event_id":"evt_test_123","event":"appointment.created","data":{"message":"Test payload"}}'`;

  return (
    <div className="wh-page-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Notice */}
      {successNotice && (
        <div style={{
          padding: "12px 18px",
          background: "rgba(16, 185, 129, 0.12)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "8px",
          color: "#10b981",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontWeight: 600,
          fontSize: "13.5px"
        }}>
          <CheckCircle size={18} />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <Link
            to="/admin/webhooks"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--muted, #64748b)",
              fontSize: "13px",
              marginBottom: "8px",
              textDecoration: "none"
            }}
          >
            <ArrowLeft size={14} /> Back to Webhooks
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>{webhook.name}</h1>
            <Badge variant={webhook.type === "incoming" ? "purple" : "info"}>
              {webhook.type === "incoming" ? "Incoming Webhook" : "Outgoing Webhook"}
            </Badge>
            <Badge variant={webhook.is_active ? "success" : "neutral"}>
              {webhook.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--muted, #64748b)", fontSize: "13px" }}>
            ID: <code style={{ fontSize: "12px", background: "var(--line-light, rgba(0,0,0,0.05))", padding: "2px 6px", borderRadius: "4px" }}>{webhook.id}</code>
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button className="wh-btn-outline" onClick={handleToggle}>
            {webhook.is_active ? "Disable" : "Enable"}
          </button>

          {webhook.type === "outgoing" && (
            <button
              className="wh-btn-outline"
              style={{ borderColor: "#10b981", color: "#10b981" }}
              onClick={() => {
                setTestResult(null);
                setTestModalOpen(true);
              }}
            >
              <Send size={14} /> Send Test
            </button>
          )}

          <button className="wh-btn-outline" onClick={() => setEditModalOpen(true)}>
            <Edit2 size={14} /> Edit
          </button>

          <button
            className="wh-btn-outline"
            style={{ borderColor: "#ef4444", color: "#ef4444" }}
            onClick={() => setDeleteModalOpen(true)}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* Grid: Endpoint & Secret */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "16px" }}>
        {/* Endpoint Card */}
        <div className="wh-table-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", borderBottom: "1px solid var(--line, #e2e8f0)", paddingBottom: "12px" }}>
            <Globe size={18} color="var(--primary, #0284c7)" />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Endpoint Configuration</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {webhook.type === "outgoing" ? (
              <div className="wh-form-group">
                <label className="wh-form-label">Destination URL</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    readOnly
                    value={webhook.url || ""}
                    className="wh-form-input"
                    style={{ fontFamily: "monospace", fontSize: "12.5px" }}
                  />
                  <button
                    className="wh-btn-outline"
                    onClick={() => handleCopy(webhook.url, "url")}
                  >
                    {copiedField === "url" ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="wh-form-group">
                <label className="wh-form-label">Incoming Webhook URL (POST)</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    readOnly
                    value={webhook.url || ""}
                    className="wh-form-input"
                    style={{ fontFamily: "monospace", fontSize: "12.5px" }}
                  />
                  <button
                    className="wh-btn-outline"
                    onClick={() => handleCopy(webhook.url, "url")}
                  >
                    {copiedField === "url" ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>
            )}

            <div className="modal-grid" style={{ gap: "12px", paddingTop: "6px" }}>
              <div>
                <span style={{ fontSize: "11.5px", color: "var(--muted, #64748b)", display: "block" }}>Created At</span>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                  {webhook.created_at ? new Date(webhook.created_at).toLocaleString() : "—"}
                </span>
              </div>
              <div>
                <span style={{ fontSize: "11.5px", color: "var(--muted, #64748b)", display: "block" }}>Last Triggered</span>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>
                  {webhook.last_triggered_at ? new Date(webhook.last_triggered_at).toLocaleString() : "Never"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Secret Card */}
        <div className="wh-table-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid var(--line, #e2e8f0)", paddingBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={18} color="#8b5cf6" />
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Secret & Signing</h3>
            </div>
            <button
              className="wh-btn-outline"
              style={{ fontSize: "12px", padding: "4px 10px" }}
              onClick={() => setRotateModalOpen(true)}
            >
              <RotateCcw size={12} /> Rotate Secret
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="wh-form-group">
              <label className="wh-form-label">Webhook Secret (HMAC-SHA256)</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  readOnly
                  value={webhook.secret || "••••••••••••••••••••••••••••••••"}
                  className="wh-form-input"
                  style={{ fontFamily: "monospace", fontSize: "12.5px" }}
                />
                {webhook.secret && (
                  <button
                    className="wh-btn-outline"
                    onClick={() => handleCopy(webhook.secret, "secret")}
                  >
                    {copiedField === "secret" ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                  </button>
                )}
              </div>
            </div>

            <div style={{ background: "var(--line-light, rgba(0,0,0,0.03))", border: "1px solid var(--line, #e2e8f0)", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", color: "var(--muted, #64748b)" }}>
              🔒 <strong>Signature Header:</strong> <code>X-Webhook-Signature: sha256=&lt;hmac&gt;</code>
            </div>
          </div>
        </div>
      </div>

      {/* Subscribed Events */}
      <div className="wh-table-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Radio size={17} color="var(--primary, #0284c7)" />
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
            {webhook.type === "incoming" ? "Accepted Events" : "Subscribed Events"} ({webhook.events?.length || 0})
          </h3>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {webhook.events && webhook.events.length > 0 ? (
            webhook.events.map((ev) => (
              <span
                key={ev}
                style={{
                  background: "var(--line-light, rgba(0,0,0,0.04))",
                  border: "1px solid var(--line, #e2e8f0)",
                  padding: "4px 10px",
                  borderRadius: "16px",
                  fontSize: "12.5px",
                  fontFamily: "monospace"
                }}
              >
                ● {ev}
              </span>
            ))
          ) : (
            <span style={{ color: "var(--muted, #64748b)", fontSize: "13px" }}>No events selected</span>
          )}
        </div>
      </div>

      {/* Signature Verification Guide */}
      <div className="wh-table-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", borderBottom: "1px solid var(--line, #e2e8f0)", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Code2 size={18} color="#06b6d4" />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Signature Verification</h3>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className={`wh-btn-outline ${activeCodeTab === "nodejs" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "12px", background: activeCodeTab === "nodejs" ? "#0284c7" : "inherit", color: activeCodeTab === "nodejs" ? "#fff" : "inherit" }}
              onClick={() => setActiveCodeTab("nodejs")}
            >
              Node.js
            </button>
            <button
              className={`wh-btn-outline ${activeCodeTab === "python" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "12px", background: activeCodeTab === "python" ? "#0284c7" : "inherit", color: activeCodeTab === "python" ? "#fff" : "inherit" }}
              onClick={() => setActiveCodeTab("python")}
            >
              Python
            </button>
            <button
              className={`wh-btn-outline ${activeCodeTab === "curl" ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "12px", background: activeCodeTab === "curl" ? "#0284c7" : "inherit", color: activeCodeTab === "curl" ? "#fff" : "inherit" }}
              onClick={() => setActiveCodeTab("curl")}
            >
              cURL
            </button>
          </div>
        </div>

        <pre className="wh-json-viewer" style={{ maxHeight: "240px", fontSize: "12px" }}>
          {activeCodeTab === "nodejs" && sampleJsonVerificationNode}
          {activeCodeTab === "python" && sampleJsonVerificationPython}
          {activeCodeTab === "curl" && sampleCurlVerification}
        </pre>
      </div>

      {/* Deliveries History */}
      <div className="wh-table-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={17} color="var(--primary, #0284c7)" />
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>Delivery History</h3>
          </div>
          <button className="wh-btn-outline" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={loadData}>
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {deliveries.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--muted, #64748b)" }}>
            <FileText size={32} style={{ margin: "0 auto 8px", opacity: 0.5 }} />
            <p style={{ margin: 0 }}>No delivery events recorded yet for this webhook.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="wh-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Event</th>
                  <th>Event ID</th>
                  <th>HTTP Code</th>
                  <th>Duration</th>
                  <th>Attempt</th>
                  <th>Timestamp</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((del) => (
                  <tr key={del.id}>
                    <td>{getStatusBadge(del.status)}</td>
                    <td><span style={{ fontFamily: "monospace" }}>{del.event}</span></td>
                    <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--muted, #64748b)" }}>
                      {del.event_id ? del.event_id.slice(0, 14) + "..." : "—"}
                    </td>
                    <td>
                      {del.response_status ? (
                        <span style={{ fontWeight: 600, color: del.response_status >= 200 && del.response_status < 300 ? "#10b981" : "#ef4444" }}>
                          {del.response_status}
                        </span>
                      ) : "—"}
                    </td>
                    <td>{del.duration_ms ? `${del.duration_ms}ms` : "—"}</td>
                    <td>{del.attempt} / {del.max_attempts}</td>
                    <td style={{ color: "var(--muted, #64748b)", fontSize: "12.5px" }}>
                      {del.created_at ? new Date(del.created_at).toLocaleTimeString() : "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="wh-table-actions">
                        <button
                          className="wh-btn-outline"
                          style={{ padding: "4px 8px", fontSize: "12px" }}
                          onClick={() => setSelectedDelivery(del)}
                        >
                          <Eye size={13} /> Details
                        </button>
                        {del.direction === "outgoing" && del.status === "failed" && (
                          <button
                            className="wh-btn-outline"
                            style={{ padding: "4px 8px", fontSize: "12px", borderColor: "#10b981", color: "#10b981" }}
                            disabled={retryingId === del.id}
                            onClick={() => handleRetry(del.id)}
                          >
                            <Play size={13} /> {retryingId === del.id ? "Retrying..." : "Retry"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL: EDIT WEBHOOK                                                   */}
      {/* ===================================================================== */}
      {editModalOpen && (
        <div className="wh-modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="wh-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="wh-modal-header">
              <h2>Edit Webhook</h2>
              <button className="wh-modal-close-btn" onClick={() => setEditModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="wh-modal-body">
                <div className="wh-form-group">
                  <label className="wh-form-label">Webhook Name *</label>
                  <input
                    type="text"
                    required
                    className="wh-form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                {webhook.type === "outgoing" && (
                  <div className="wh-form-group">
                    <label className="wh-form-label">Destination URL *</label>
                    <input
                      type="url"
                      required
                      className="wh-form-input"
                      value={editForm.url}
                      onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                    />
                  </div>
                )}

                <div className="wh-form-group">
                  <label className="wh-form-label">Subscribed Events</label>
                  <div className="wh-events-container">
                    {availableEvents.map((ev) => {
                      const checked = editForm.events.includes(ev.event);
                      return (
                        <label
                          key={ev.event}
                          className={`wh-event-row ${checked ? "selected" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="wh-checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditForm({ ...editForm, events: [...editForm.events, ev.event] });
                              } else {
                                setEditForm({ ...editForm, events: editForm.events.filter((x) => x !== ev.event) });
                              }
                            }}
                          />
                          <div className="wh-event-content">
                            <span className="wh-event-name">{ev.event}</span>
                            <span className="wh-event-desc">{ev.description}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13.5px", marginTop: "4px" }}>
                  <input
                    type="checkbox"
                    className="wh-checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  />
                  <span>Active & Enabled</span>
                </label>
              </div>

              <div className="wh-modal-footer">
                <button type="button" className="wh-btn-outline" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="wh-btn-primary" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SEND TEST                                                      */}
      {/* ===================================================================== */}
      {testModalOpen && (
        <div className="wh-modal-overlay" onClick={() => setTestModalOpen(false)}>
          <div className="wh-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="wh-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Send size={18} color="var(--primary, #0284c7)" />
                <h2>Send Test Webhook</h2>
              </div>
              <button className="wh-modal-close-btn" onClick={() => setTestModalOpen(false)}>✕</button>
            </div>

            <div className="wh-modal-body">
              <p style={{ color: "var(--muted, #64748b)", fontSize: "13px", margin: 0 }}>
                This will dispatch a real HTTP POST request to <code>{webhook.url}</code> with a valid HMAC-SHA256 signature.
              </p>

              <div className="wh-form-group">
                <label className="wh-form-label">Select Event</label>
                <select
                  className="wh-form-select"
                  value={testEvent}
                  onChange={(e) => setTestEvent(e.target.value)}
                >
                  {webhook.events && webhook.events.length > 0 ? (
                    webhook.events.map((ev) => (
                      <option key={ev} value={ev}>{ev}</option>
                    ))
                  ) : (
                    <option value="test.ping">test.ping</option>
                  )}
                </select>
              </div>

              <div className="wh-form-group">
                <label className="wh-form-label">Custom Payload (Optional JSON)</label>
                <textarea
                  className="wh-form-textarea"
                  rows={4}
                  placeholder={`{\n  "test_message": "Hello from Callzenza test!"\n}`}
                  style={{ fontFamily: "monospace", fontSize: "12px" }}
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                />
              </div>

              {testResult && (
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    background: testResult.success ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                    border: `1px solid ${testResult.success ? "#10b981" : "#ef4444"}`
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {testResult.success ? <CheckCircle size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                      <strong style={{ color: testResult.success ? "#10b981" : "#ef4444", fontSize: "13px" }}>
                        {testResult.success ? "Delivery Succeeded" : "Delivery Failed"}
                      </strong>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
                      HTTP {testResult.http_status || "ERR"} • {testResult.duration_ms}ms
                    </span>
                  </div>
                  {testResult.error_message && (
                    <p style={{ color: "#ef4444", fontSize: "12px", margin: "4px 0 0" }}>
                      Error: {testResult.error_message}
                    </p>
                  )}
                  {testResult.response_body && (
                    <pre className="wh-json-viewer" style={{ marginTop: "8px", maxHeight: "100px" }}>
                      {testResult.response_body}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="wh-modal-footer">
              <button className="wh-btn-outline" onClick={() => setTestModalOpen(false)}>
                Close
              </button>
              <button
                className="wh-btn-primary"
                disabled={testing}
                onClick={handleSendTest}
              >
                {testing ? "Dispatching..." : "Dispatch Test"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ROTATE SECRET                                                  */}
      {/* ===================================================================== */}
      {rotateModalOpen && (
        <div className="wh-modal-overlay" onClick={() => { setRotateModalOpen(false); setNewRotatedSecret(null); }}>
          <div className="wh-modal-container" style={{ maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <div className="wh-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <RotateCcw size={18} color="#8b5cf6" />
                <h2>Rotate Secret</h2>
              </div>
              <button className="wh-modal-close-btn" onClick={() => { setRotateModalOpen(false); setNewRotatedSecret(null); }}>✕</button>
            </div>

            <div className="wh-modal-body">
              {newRotatedSecret ? (
                <div style={{ padding: "14px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                  <p style={{ color: "#10b981", fontWeight: 600, margin: "0 0 6px", fontSize: "13.5px" }}>
                    ✓ Secret Successfully Rotated!
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--muted, #64748b)", margin: "0 0 10px" }}>
                    Please copy your new secret now and update your receiving webhook service.
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      readOnly
                      value={newRotatedSecret}
                      className="wh-form-input"
                      style={{ fontFamily: "monospace", fontSize: "12px" }}
                    />
                    <button
                      className="wh-btn-primary"
                      onClick={() => handleCopy(newRotatedSecret, "newSecret")}
                    >
                      {copiedField === "newSecret" ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "#f59e0b" }}>
                  <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <p style={{ margin: 0, fontSize: "13px" }}>
                    Are you sure you want to rotate the secret for <strong>{webhook.name}</strong>?
                    The previous secret will immediately be invalidated.
                  </p>
                </div>
              )}
            </div>

            <div className="wh-modal-footer">
              <button
                className="wh-btn-outline"
                onClick={() => { setRotateModalOpen(false); setNewRotatedSecret(null); }}
              >
                {newRotatedSecret ? "Done" : "Cancel"}
              </button>
              {!newRotatedSecret && (
                <button
                  className="wh-btn-primary"
                  style={{ background: "#8b5cf6" }}
                  disabled={rotating}
                  onClick={handleRotateSecret}
                >
                  {rotating ? "Rotating..." : "Confirm Rotation"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DELETE CONFIRMATION                                            */}
      {/* ===================================================================== */}
      {deleteModalOpen && (
        <div className="wh-modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div className="wh-modal-container" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className="wh-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Trash2 size={18} color="#ef4444" />
                <h2>Delete Webhook</h2>
              </div>
              <button className="wh-modal-close-btn" onClick={() => setDeleteModalOpen(false)}>✕</button>
            </div>
            <div className="wh-modal-body">
              <p style={{ color: "var(--muted, #64748b)", fontSize: "13.5px", margin: 0 }}>
                Are you sure you want to delete <strong>{webhook.name}</strong>?
                This will permanently remove the webhook configuration and all delivery logs.
              </p>
            </div>
            <div className="wh-modal-footer">
              <button className="wh-btn-outline" onClick={() => setDeleteModalOpen(false)}>
                Cancel
              </button>
              <button
                className="wh-btn-primary"
                style={{ background: "#ef4444" }}
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DELIVERY DETAILS                                               */}
      {/* ===================================================================== */}
      {selectedDelivery && (
        <div className="wh-modal-overlay" onClick={() => setSelectedDelivery(null)}>
          <div className="wh-modal-container" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
            <div className="wh-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye size={18} color="var(--primary, #0284c7)" />
                <h2>Delivery Log Details</h2>
              </div>
              <button className="wh-modal-close-btn" onClick={() => setSelectedDelivery(null)}>✕</button>
            </div>

            <div className="wh-modal-body">
              <div className="wh-delivery-meta-grid">
                <div className="wh-meta-item">
                  <span>Event</span>
                  <strong>{selectedDelivery.event}</strong>
                </div>
                <div className="wh-meta-item">
                  <span>Status</span>
                  <div>{getStatusBadge(selectedDelivery.status)}</div>
                </div>
                <div className="wh-meta-item">
                  <span>HTTP Code</span>
                  <strong style={{ color: selectedDelivery.response_status >= 200 && selectedDelivery.response_status < 300 ? "#10b981" : "#ef4444" }}>
                    {selectedDelivery.response_status || "—"}
                  </strong>
                </div>
                <div className="wh-meta-item">
                  <span>Direction</span>
                  <strong style={{ textTransform: "capitalize" }}>{selectedDelivery.direction}</strong>
                </div>
                <div className="wh-meta-item">
                  <span>Duration</span>
                  <strong>{selectedDelivery.duration_ms ? `${selectedDelivery.duration_ms}ms` : "—"}</strong>
                </div>
                <div className="wh-meta-item">
                  <span>Attempt</span>
                  <strong>{selectedDelivery.attempt} / {selectedDelivery.max_attempts}</strong>
                </div>
              </div>

              {selectedDelivery.error_message && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "10px 14px", color: "#ef4444", fontSize: "12px" }}>
                  <strong>Error:</strong> {selectedDelivery.error_message}
                </div>
              )}

              <div className="wh-form-group">
                <label className="wh-form-label">Request Payload</label>
                <pre className="wh-json-viewer">
                  {typeof selectedDelivery.request_payload === "object"
                    ? JSON.stringify(selectedDelivery.request_payload, null, 2)
                    : selectedDelivery.request_payload || "(empty payload)"}
                </pre>
              </div>

              <div className="wh-form-group">
                <label className="wh-form-label">Response Body</label>
                <pre className="wh-json-viewer">
                  {selectedDelivery.response_body || "(empty response)"}
                </pre>
              </div>
            </div>

            <div className="wh-modal-footer">
              {selectedDelivery.direction === "outgoing" && selectedDelivery.status === "failed" && (
                <button
                  className="wh-btn-outline"
                  style={{ borderColor: "#10b981", color: "#10b981" }}
                  disabled={retryingId === selectedDelivery.id}
                  onClick={() => handleRetry(selectedDelivery.id)}
                >
                  <Play size={14} />
                  {retryingId === selectedDelivery.id ? "Retrying..." : "Retry Delivery Now"}
                </button>
              )}
              <button className="wh-btn-primary" onClick={() => setSelectedDelivery(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
