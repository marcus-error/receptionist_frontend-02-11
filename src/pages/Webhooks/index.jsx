import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Webhook,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ExternalLink,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Eye,
  Copy,
  Check,
  RotateCcw,
  Activity,
  Layers,
  Key,
  FileText,
  Radio
} from "lucide-react";
import Badge from "../../components/ui/Badge.jsx";
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhook,
  getWebhookEvents,
  getWebhookStats,
  getDeliveries,
  retryDelivery
} from "../../services/webhook.service.js";
import "./webhooks.css";

export default function Webhooks() {
  const navigate = useNavigate();

  // Primary State
  const [webhooks, setWebhooks] = useState([]);
  const [stats, setStats] = useState({
    total_webhooks: 0,
    active_webhooks: 0,
    outgoing_webhooks: 0,
    incoming_webhooks: 0,
    failed_deliveries: 0,
  });
  const [availableEvents, setAvailableEvents] = useState([]);
  const [deliveries, setDeliveries] = useState([]);

  // UI States
  const [activeTab, setActiveTab] = useState("webhooks");
  const [loading, setLoading] = useState(true);
  const [deliveriesLoading, setDeliveriesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("all");
  const [deliveryEventFilter, setDeliveryEventFilter] = useState("all");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "outgoing",
    url: "",
    events: [],
    description: "",
    is_active: true,
  });

  const [createdSecretData, setCreatedSecretData] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deleteConfirmWh, setDeleteConfirmWh] = useState(null);

  const [copiedKey, setCopiedKey] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Webhooks & Stats
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [whRes, statsRes, eventsRes] = await Promise.all([
        getWebhooks({ search: searchQuery, status: statusFilter, type: typeFilter }),
        getWebhookStats().catch(() => ({
          total_webhooks: 0,
          active_webhooks: 0,
          outgoing_webhooks: 0,
          incoming_webhooks: 0,
          failed_deliveries: 0,
        })),
        getWebhookEvents().catch(() => FALLBACK_EVENTS),
      ]);

      setWebhooks(whRes?.items || []);
      setStats(statsRes || {
        total_webhooks: 0,
        active_webhooks: 0,
        outgoing_webhooks: 0,
        incoming_webhooks: 0,
        failed_deliveries: 0,
      });

      const rawEvents = Array.isArray(eventsRes)
        ? eventsRes
        : (eventsRes?.events || eventsRes?.items || FALLBACK_EVENTS);

      const parsed = (rawEvents && rawEvents.length > 0 ? rawEvents : FALLBACK_EVENTS).map((e) => ({
        event: typeof e === "string" ? e : (e.event || e.name || String(e)),
        description: e.description || "",
        category: e.category || "General"
      }));

      setAvailableEvents(parsed);
    } catch (err) {
      console.error("Failed to load webhooks:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, typeFilter]);

  // 2. Fetch Deliveries
  const fetchDeliveries = useCallback(async () => {
    setDeliveriesLoading(true);
    try {
      const params = { limit: 50 };
      if (deliveryStatusFilter !== "all") params.status = deliveryStatusFilter;
      if (deliveryEventFilter !== "all") params.event = deliveryEventFilter;
      const res = await getDeliveries(params);
      setDeliveries(res.deliveries || []);
    } catch (err) {
      console.error("Failed to fetch deliveries:", err);
    } finally {
      setDeliveriesLoading(false);
    }
  }, [deliveryStatusFilter, deliveryEventFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "deliveries") {
      fetchDeliveries();
    }
  }, [activeTab, fetchDeliveries]);

  // Handlers
  const handleOpenModal = (wh = null) => {
    if (wh) {
      setEditingWebhook(wh);
      setFormData({
        name: wh.name || "",
        type: wh.type || "outgoing",
        url: wh.url || "",
        events: wh.events || [],
        description: wh.description || "",
        is_active: wh.is_active,
      });
    } else {
      setEditingWebhook(null);
      setFormData({
        name: "",
        type: "outgoing",
        url: "",
        events: availableEvents.length > 0 ? [availableEvents[0].event] : ["appointment.created"],
        description: "",
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWebhook(null);
  };

  const handleEventToggle = (eventName) => {
    setFormData((prev) => {
      const exists = prev.events.includes(eventName);
      return {
        ...prev,
        events: exists ? prev.events.filter((e) => e !== eventName) : [...prev.events, eventName],
      };
    });
  };

  const handleSelectAllEvents = () => {
    if (formData.events.length === availableEvents.length) {
      setFormData((prev) => ({ ...prev, events: [] }));
    } else {
      setFormData((prev) => ({
        ...prev,
        events: availableEvents.map((e) => e.event),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.events.length === 0) {
      alert("Please select at least one event subscription.");
      return;
    }
    setActionLoading(true);
    try {
      if (editingWebhook) {
        await updateWebhook(editingWebhook.id, {
          name: formData.name,
          url: formData.type === "outgoing" ? formData.url : undefined,
          events: formData.events,
          description: formData.description,
          is_active: formData.is_active,
        });
        showToast("Webhook updated successfully");
        setIsModalOpen(false);
        fetchData();
      } else {
        const created = await createWebhook(formData);
        setIsModalOpen(false);
        setCreatedSecretData(created);
        fetchData();
      }
    } catch (err) {
      alert(err.message || "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (wh) => {
    try {
      const updated = await toggleWebhook(wh.id);
      setWebhooks((prev) => prev.map((w) => (w.id === wh.id ? updated : w)));
      showToast(`Webhook is now ${updated.is_active ? "Active" : "Inactive"}`);
    } catch (err) {
      alert(err.message || "Failed to toggle status");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmWh) return;
    setActionLoading(true);
    try {
      await deleteWebhook(deleteConfirmWh.id);
      setWebhooks((prev) => prev.filter((w) => w.id !== deleteConfirmWh.id));
      setDeleteConfirmWh(null);
      showToast("Webhook deleted permanently");
    } catch (err) {
      alert(err.message || "Failed to delete webhook");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryDelivery = async (delivId) => {
    setActionLoading(true);
    try {
      await retryDelivery(delivId);
      showToast("Delivery retry triggered");
      fetchDeliveries();
      if (selectedDelivery && selectedDelivery.id === delivId) {
        setIsDeliveryModalOpen(false);
      }
    } catch (err) {
      alert(err.message || "Failed to retry delivery");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
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

  return (
    <div className="wh-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#0284c7",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 600,
            fontSize: "13.5px"
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="wh-header">
        <div className="wh-title-area">
          <h1>
            <span className="wh-title-icon"><Webhook size={22} /></span>
            Webhooks
          </h1>
          <p>Manage real-time incoming and outgoing integrations with external applications.</p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="wh-btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={16} /> New Webhook
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="wh-kpi-grid">
        <div className="wh-kpi-card">
          <div className="wh-kpi-top">
            <span className="wh-kpi-label">Total Webhooks</span>
            <div className="wh-kpi-icon" style={{ background: "rgba(2, 132, 199, 0.1)", color: "#0284c7" }}>
              <Webhook size={16} />
            </div>
          </div>
          <div className="wh-kpi-value">{stats.total_webhooks}</div>
          <div className="wh-kpi-desc">Registered endpoints</div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-top">
            <span className="wh-kpi-label">Active</span>
            <div className="wh-kpi-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="wh-kpi-value" style={{ color: "#10b981" }}>{stats.active_webhooks}</div>
          <div className="wh-kpi-desc">Processing live events</div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-top">
            <span className="wh-kpi-label">Outgoing</span>
            <div className="wh-kpi-icon" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="wh-kpi-value">{stats.outgoing_webhooks}</div>
          <div className="wh-kpi-desc">Data pushed to URLs</div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-top">
            <span className="wh-kpi-label">Incoming</span>
            <div className="wh-kpi-icon" style={{ background: "rgba(6, 182, 212, 0.1)", color: "#06b6d4" }}>
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div className="wh-kpi-value">{stats.incoming_webhooks}</div>
          <div className="wh-kpi-desc">Receiving endpoints</div>
        </div>

        <div className="wh-kpi-card">
          <div className="wh-kpi-top">
            <span className="wh-kpi-label">Failed Deliveries</span>
            <div className="wh-kpi-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="wh-kpi-value" style={{ color: stats.failed_deliveries > 0 ? "#ef4444" : "inherit" }}>
            {stats.failed_deliveries}
          </div>
          <div className="wh-kpi-desc">Requires attention</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="wh-tabs-nav">
        <button
          className={`wh-tab-btn ${activeTab === "webhooks" ? "active" : ""}`}
          onClick={() => setActiveTab("webhooks")}
        >
          <Layers size={16} />
          <span>Webhook Endpoints ({webhooks.length})</span>
        </button>

        <button
          className={`wh-tab-btn ${activeTab === "deliveries" ? "active" : ""}`}
          onClick={() => setActiveTab("deliveries")}
        >
          <Activity size={16} />
          <span>Delivery Logs</span>
          {stats.failed_deliveries > 0 && (
            <span style={{ background: "#ef4444", color: "#ffffff", fontSize: "11px", fontWeight: "700", padding: "1px 6px", borderRadius: "10px" }}>
              {stats.failed_deliveries}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: WEBHOOKS LIST */}
      {activeTab === "webhooks" && (
        <>
          {/* Controls Bar */}
          <div className="wh-controls-bar">
            <div className="wh-search-box">
              <Search className="wh-search-icon" size={15} />
              <input
                type="text"
                className="wh-search-input"
                placeholder="Search webhooks by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <select
                className="wh-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="outgoing">Outgoing</option>
                <option value="incoming">Incoming</option>
              </select>

              <select
                className="wh-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <button className="wh-btn-outline" onClick={() => fetchData()}>
                <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="wh-table-card">
            {loading ? (
              <div style={{ padding: "48px", textAlign: "center", color: "var(--muted, #64748b)" }}>
                <RefreshCw size={24} className="spin" style={{ margin: "0 auto 12px" }} />
                <p style={{ margin: 0 }}>Loading webhooks...</p>
              </div>
            ) : webhooks.length === 0 ? (
              <div style={{ padding: "64px 24px", textAlign: "center" }}>
                <Webhook size={36} style={{ color: "var(--muted, #94a3b8)", marginBottom: "12px", opacity: 0.6 }} />
                <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 6px" }}>No webhooks configured yet</h3>
                <p style={{ color: "var(--muted, #64748b)", fontSize: "13.5px", marginBottom: "18px" }}>
                  Connect your CRM, Zapier, Make, or custom API by creating your first webhook.
                </p>
                <button className="wh-btn-primary" onClick={() => handleOpenModal()}>
                  <Plus size={16} /> Create Webhook
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="wh-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Subscribed Events</th>
                      <th>Status</th>
                      <th>Last Triggered</th>
                      <th>Created</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhooks.map((wh) => (
                      <tr key={wh.id}>
                        <td>
                          <div style={{ fontWeight: "600", marginBottom: "3px" }}>
                            <Link to={`/admin/webhooks/${wh.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                              {wh.name}
                            </Link>
                          </div>
                          {wh.type === "outgoing" ? (
                            <div style={{ fontSize: "12px", color: "var(--muted, #64748b)", display: "flex", alignItems: "center", gap: "4px" }}>
                              <ExternalLink size={11} />
                              <span style={{ maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {wh.url}
                              </span>
                            </div>
                          ) : (
                            <div style={{ fontSize: "12px", color: "#06b6d4" }}>
                              /{wh.webhook_uuid}
                            </div>
                          )}
                        </td>

                        <td>
                          <Badge variant={wh.type === "incoming" ? "purple" : "info"}>
                            {wh.type === "incoming" ? "Incoming" : "Outgoing"}
                          </Badge>
                        </td>

                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "260px" }}>
                            {(wh.events || []).slice(0, 3).map((ev) => (
                              <span
                                key={ev}
                                style={{
                                  background: "var(--line-light, rgba(0,0,0,0.04))",
                                  border: "1px solid var(--line, #e2e8f0)",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontFamily: "monospace"
                                }}
                              >
                                {ev}
                              </span>
                            ))}
                            {(wh.events || []).length > 3 && (
                              <span style={{ fontSize: "11px", color: "var(--muted, #64748b)", alignSelf: "center" }}>
                                +{wh.events.length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <Badge variant={wh.is_active ? "success" : "neutral"}>
                            {wh.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        <td style={{ color: "var(--muted, #64748b)", fontSize: "12.5px" }}>
                          {wh.last_triggered_at ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={12} /> {new Date(wh.last_triggered_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span style={{ color: "var(--faint, #94a3b8)" }}>Never</span>
                          )}
                        </td>

                        <td style={{ color: "var(--muted, #64748b)", fontSize: "12.5px" }}>
                          {wh.created_at ? new Date(wh.created_at).toLocaleDateString() : "—"}
                        </td>

                        <td style={{ textAlign: "right" }}>
                          <div className="wh-table-actions">
                            <button
                              className="wh-icon-btn"
                              onClick={() => navigate(`/admin/webhooks/${wh.id}`)}
                              title="View Webhook Details"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              className="wh-icon-btn"
                              onClick={() => handleOpenModal(wh)}
                              title="Edit Configuration"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="wh-icon-btn"
                              onClick={() => handleToggleActive(wh)}
                              title={wh.is_active ? "Disable Webhook" : "Enable Webhook"}
                            >
                              {wh.is_active ? <ToggleRight size={15} color="#10b981" /> : <ToggleLeft size={15} />}
                            </button>
                            <button
                              className="wh-icon-btn danger"
                              onClick={() => setDeleteConfirmWh(wh)}
                              title="Delete Webhook"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: DELIVERY LOGS */}
      {activeTab === "deliveries" && (
        <>
          <div className="wh-controls-bar">
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <select
                className="wh-select"
                value={deliveryStatusFilter}
                onChange={(e) => setDeliveryStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered (2xx)</option>
                <option value="failed">Failed</option>
                <option value="retrying">Retrying</option>
                <option value="pending">Pending</option>
              </select>

              <select
                className="wh-select"
                value={deliveryEventFilter}
                onChange={(e) => setDeliveryEventFilter(e.target.value)}
              >
                <option value="all">All Events</option>
                {availableEvents.map((ev) => (
                  <option key={ev.event} value={ev.event}>
                    {ev.event}
                  </option>
                ))}
              </select>

              <button className="wh-btn-outline" onClick={() => fetchDeliveries()}>
                <RefreshCw size={14} className={deliveriesLoading ? "spin" : ""} /> Refresh Logs
              </button>
            </div>
          </div>

          <div className="wh-table-card">
            {deliveriesLoading ? (
              <div style={{ padding: "48px", textAlign: "center", color: "var(--muted, #64748b)" }}>
                <RefreshCw size={24} className="spin" style={{ margin: "0 auto 12px" }} />
                <p style={{ margin: 0 }}>Loading delivery logs...</p>
              </div>
            ) : deliveries.length === 0 ? (
              <div style={{ padding: "64px 24px", textAlign: "center" }}>
                <FileText size={32} style={{ color: "var(--muted, #94a3b8)", marginBottom: "12px", opacity: 0.6 }} />
                <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 4px" }}>No delivery logs recorded</h3>
                <p style={{ color: "var(--muted, #64748b)", fontSize: "13px" }}>
                  Delivery events will be captured here in real-time as webhooks trigger.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="wh-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Event</th>
                      <th>Event ID</th>
                      <th>Direction</th>
                      <th>HTTP Code</th>
                      <th>Attempt</th>
                      <th>Duration</th>
                      <th>Time</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((deliv) => (
                      <tr key={deliv.id}>
                        <td>{getStatusBadge(deliv.status)}</td>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: "12.5px" }}>{deliv.event}</span>
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--muted, #64748b)" }}>
                          {deliv.event_id ? deliv.event_id.slice(0, 14) + "..." : "—"}
                        </td>
                        <td>
                          <span style={{ textTransform: "capitalize", fontSize: "12.5px" }}>{deliv.direction}</span>
                        </td>
                        <td>
                          {deliv.response_status ? (
                            <span
                              style={{
                                fontWeight: 600,
                                color: deliv.response_status >= 200 && deliv.response_status < 300 ? "#10b981" : "#ef4444"
                              }}
                            >
                              {deliv.response_status}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{deliv.attempt} / {deliv.max_attempts}</td>
                        <td>{deliv.duration_ms ? `${deliv.duration_ms}ms` : "—"}</td>
                        <td style={{ color: "var(--muted, #64748b)", fontSize: "12.5px" }}>
                          {deliv.created_at ? new Date(deliv.created_at).toLocaleTimeString() : "—"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="wh-table-actions">
                            <button
                              className="wh-btn-outline"
                              style={{ padding: "4px 8px", fontSize: "12px" }}
                              onClick={() => {
                                setSelectedDelivery(deliv);
                                setIsDeliveryModalOpen(true);
                              }}
                            >
                              <Eye size={13} /> Details
                            </button>

                            {deliv.direction === "outgoing" && deliv.status === "failed" && (
                              <button
                                className="wh-btn-outline"
                                style={{ padding: "4px 8px", fontSize: "12px", borderColor: "#10b981", color: "#10b981" }}
                                onClick={() => handleRetryDelivery(deliv.id)}
                              >
                                <RotateCcw size={13} /> Retry
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
        </>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE / EDIT WEBHOOK                                          */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="wh-modal-overlay" onClick={handleCloseModal}>
          <div className="wh-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="wh-modal-header">
              <h2>{editingWebhook ? "Edit Webhook" : "New Webhook"}</h2>
              <button className="wh-modal-close-btn" onClick={handleCloseModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
              <div className="wh-modal-body">
                {/* Name */}
                <div className="wh-form-group">
                  <label className="wh-form-label">Webhook Name *</label>
                  <input
                    type="text"
                    required
                    className="wh-form-input"
                    placeholder="e.g. HubSpot CRM Sync, Zapier Inbound"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Type */}
                <div className="wh-form-group">
                  <label className="wh-form-label">Webhook Type *</label>
                  <select
                    disabled={!!editingWebhook}
                    className="wh-form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="outgoing">Outgoing (Send data to URL when events occur)</option>
                    <option value="incoming">Incoming (Receive data from external system)</option>
                  </select>
                  <span className="wh-form-helper">
                    {formData.type === "outgoing"
                      ? "Our application will send HTTP POST requests with signed HMAC payloads to your destination URL."
                      : "Generates a unique URL endpoint on this server that external platforms can POST events to."}
                  </span>
                </div>

                {/* Destination URL */}
                {formData.type === "outgoing" && (
                  <div className="wh-form-group">
                    <label className="wh-form-label">Destination URL *</label>
                    <input
                      type="url"
                      required
                      className="wh-form-input"
                      placeholder="https://example.com/api/webhook"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    />
                  </div>
                )}

                {/* Trigger Events */}
                <div className="wh-form-group">
                  <div className="wh-form-label">
                    <span>{formData.type === "outgoing" ? "Trigger Events *" : "Accepted Events *"}</span>
                    <button
                      type="button"
                      onClick={handleSelectAllEvents}
                      style={{ background: "none", border: "none", color: "#0284c7", fontSize: "12px", fontWeight: "600", cursor: "pointer", textTransform: "none" }}
                    >
                      {formData.events.length === availableEvents.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  <div
                    style={{
                      maxHeight: "220px",
                      overflowY: "auto",
                      border: "1px solid var(--line, rgba(255, 255, 255, 0.12))",
                      borderRadius: "8px",
                      padding: "8px",
                      background: "var(--bg, #090d16)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px"
                    }}
                  >
                    {availableEvents.map((ev) => {
                      const eventKey = ev.event || ev.name;
                      const isChecked = formData.events.includes(eventKey);
                      return (
                        <div
                          key={eventKey}
                          onClick={() => handleEventToggle(eventKey)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            background: isChecked ? "rgba(2, 132, 199, 0.15)" : "rgba(255, 255, 255, 0.02)",
                            border: isChecked ? "1px solid #0284c7" : "1px solid var(--line, rgba(255, 255, 255, 0.08))",
                            transition: "all 0.15s ease",
                            userSelect: "none"
                          }}
                        >
                          {/* Pixel-perfect custom styled checkbox */}
                          <div
                            style={{
                              width: "18px",
                              height: "18px",
                              minWidth: "18px",
                              maxWidth: "18px",
                              borderRadius: "4px",
                              border: isChecked ? "1.5px solid #0284c7" : "1.5px solid var(--muted, #64748b)",
                              background: isChecked ? "#0284c7" : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              transition: "all 0.15s ease"
                            }}
                          >
                            {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--fg, #f8fafc)", fontFamily: "monospace" }}>
                              {eventKey}
                            </div>
                            {ev.description && (
                              <div style={{ fontSize: "11.5px", color: "var(--muted, #94a3b8)", marginTop: "2px", lineHeight: 1.3 }}>
                                {ev.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div className="wh-form-group">
                  <label className="wh-form-label">Description (Optional)</label>
                  <textarea
                    rows={2}
                    className="wh-form-textarea"
                    placeholder="Notes on where this webhook sends data or team contact..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="wh-modal-footer">
                <button type="button" className="wh-btn-outline" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="wh-btn-primary" disabled={actionLoading}>
                  {actionLoading ? "Saving..." : editingWebhook ? "Save Changes" : "Create Webhook"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SECRET CREATION CONFIRMATION                                   */}
      {/* ===================================================================== */}
      {createdSecretData && (
        <div className="wh-modal-overlay">
          <div className="wh-modal-container" style={{ maxWidth: "520px" }}>
            <div className="wh-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Key size={18} color="#10b981" />
                <h2>Webhook Created Successfully</h2>
              </div>
            </div>

            <div className="wh-modal-body">
              <p style={{ color: "var(--muted, #64748b)", fontSize: "13.5px", margin: 0 }}>
                Please copy your signing secret and endpoint information now. For security purposes, raw secrets are never displayed again in full.
              </p>

              {createdSecretData.type === "incoming" && createdSecretData.incoming_url && (
                <div className="wh-form-group">
                  <label className="wh-form-label">Incoming Webhook URL</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      readOnly
                      className="wh-form-input"
                      style={{ fontFamily: "monospace", fontSize: "12.5px" }}
                      value={createdSecretData.incoming_url}
                    />
                    <button
                      className="wh-btn-primary"
                      onClick={() => handleCopy(createdSecretData.incoming_url, "new_url")}
                    >
                      {copiedKey === "new_url" ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="wh-form-group">
                <label className="wh-form-label">Signing Secret (HMAC-SHA256)</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    readOnly
                    className="wh-form-input"
                    style={{ fontFamily: "monospace", fontSize: "12.5px", color: "#f59e0b", fontWeight: "600" }}
                    value={createdSecretData.secret}
                  />
                  <button
                    className="wh-btn-primary"
                    onClick={() => handleCopy(createdSecretData.secret, "new_sec")}
                  >
                    {copiedKey === "new_sec" ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="wh-modal-footer">
              <button className="wh-btn-primary" onClick={() => setCreatedSecretData(null)}>
                I Have Saved The Secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DELIVERY DETAILS INSPECTION                                    */}
      {/* ===================================================================== */}
      {isDeliveryModalOpen && selectedDelivery && (
        <div className="wh-modal-overlay" onClick={() => setIsDeliveryModalOpen(false)}>
          <div className="wh-modal-container" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
            <div className="wh-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye size={18} color="var(--primary, #0284c7)" />
                <h2>Delivery Log Details</h2>
              </div>
              <button className="wh-modal-close-btn" onClick={() => setIsDeliveryModalOpen(false)}>✕</button>
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
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "10px 14px", color: "#ef4444", fontSize: "12.5px" }}>
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
                  onClick={() => handleRetryDelivery(selectedDelivery.id)}
                >
                  <RotateCcw size={14} /> Retry Delivery
                </button>
              )}
              <button className="wh-btn-primary" onClick={() => setIsDeliveryModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DELETE CONFIRMATION                                            */}
      {/* ===================================================================== */}
      {deleteConfirmWh && (
        <div className="wh-modal-overlay" onClick={() => setDeleteConfirmWh(null)}>
          <div className="wh-modal-container" style={{ maxWidth: "460px" }} onClick={(e) => e.stopPropagation()}>
            <div className="wh-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Trash2 size={18} color="#ef4444" />
                <h2>Delete Webhook</h2>
              </div>
              <button className="wh-modal-close-btn" onClick={() => setDeleteConfirmWh(null)}>✕</button>
            </div>

            <div className="wh-modal-body">
              <p style={{ color: "var(--muted, #64748b)", fontSize: "13.5px", margin: 0 }}>
                Are you sure you want to delete <strong>{deleteConfirmWh.name}</strong>?
                This will permanently delete the webhook and all associated delivery history.
              </p>
            </div>

            <div className="wh-modal-footer">
              <button className="wh-btn-outline" onClick={() => setDeleteConfirmWh(null)}>
                Cancel
              </button>
              <button
                className="wh-btn-primary"
                style={{ background: "#ef4444" }}
                disabled={actionLoading}
                onClick={handleDelete}
              >
                {actionLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
