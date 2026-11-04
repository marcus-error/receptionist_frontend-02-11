import React, { useState, useEffect, useMemo } from "react";
import {
  Bell,
  MessageSquare,
  Mail,
  User,
  Stethoscope,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  X,
  Send,
  Filter,
  Users
} from "lucide-react";
import api from "../../services/api.js";
import "./notificationLogs.css";

export default function NotificationLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    customer: 0,
    staff: 0,
    whatsapp: 0,
    email: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'customer' | 'staff'
  const [channelFilter, setChannelFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Selected Log for Modal Preview
  const [selectedLog, setSelectedLog] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch Notification Logs from Backend
  const fetchLogs = async () => {
    setRefreshing(true);
    try {
      const res = await api.get("/notification-logs");
      if (res.data) {
        const rawLogs = res.data.logs || [];
        setLogs(rawLogs);
        
        if (res.data.stats) {
          const s = res.data.stats;
          setStats({
            total: s.total_sent ?? s.total ?? rawLogs.length,
            customer: s.customer_count ?? s.customer ?? rawLogs.filter(l => l.recipient_type === 'customer').length,
            staff: s.staff_count ?? s.staff ?? rawLogs.filter(l => l.recipient_type === 'staff').length,
            whatsapp: s.whatsapp_count ?? s.whatsapp ?? rawLogs.filter(l => l.channel === 'whatsapp').length,
            email: s.email_count ?? s.email ?? rawLogs.filter(l => l.channel === 'email').length,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch notification logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filtered Logs Calculation
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Recipient Tab Filter
      if (activeTab === "customer" && log.recipient_type !== "customer") return false;
      if (activeTab === "staff" && log.recipient_type !== "staff") return false;

      // Channel Filter
      if (channelFilter !== "all" && log.channel !== channelFilter) return false;

      // Action Filter
      if (actionFilter !== "all" && !log.action?.toLowerCase().includes(actionFilter)) return false;

      // Status Filter
      if (statusFilter !== "all" && log.status !== statusFilter) return false;

      // Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = log.recipient_name?.toLowerCase().includes(query);
        const contactMatch = log.recipient_contact?.toLowerCase().includes(query);
        const subjectMatch = log.subject?.toLowerCase().includes(query);
        const bodyMatch = log.message_body?.toLowerCase().includes(query);
        const actionMatch = log.action?.toLowerCase().includes(query);
        if (!nameMatch && !contactMatch && !subjectMatch && !bodyMatch && !actionMatch) {
          return false;
        }
      }

      return true;
    });
  }, [logs, activeTab, channelFilter, actionFilter, statusFilter, searchTerm]);

  // Tab Badge Counts
  const customerCount = useMemo(() => logs.filter((l) => l.recipient_type === "customer").length, [logs]);
  const staffCount = useMemo(() => logs.filter((l) => l.recipient_type === "staff").length, [logs]);

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const formatActionName = (action) => {
    if (!action) return "Notification";
    if (action.includes("created")) return "Confirmation Message";
    if (action.includes("rescheduled")) return "Reschedule Notice";
    if (action.includes("cancelled")) return "Cancellation Notice";
    if (action.includes("reminder")) return "Appointment Reminder";
    return action.replace("_", " ").toUpperCase();
  };

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all notification logs? This action will reset to only real-time live messages sent going forward.")) {
      return;
    }
    try {
      setRefreshing(true);
      await api.delete("/notification-logs/clear");
      await fetchLogs();
    } catch (err) {
      console.error("Failed to clear notification logs:", err);
      alert("Failed to clear logs. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="notif-logs-page">
      {/* Top Header */}
      <div className="notif-header">
        <div>
          <h1>
            <Bell size={26} />
            Automated Notification Logs
          </h1>
          <p>
            Track and verify live automated Email & WhatsApp confirmation messages sent to Customers and Doctors / Staff.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className={`notif-refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={fetchLogs}
            disabled={refreshing}
          >
            <RefreshCw size={16} />
            <span>{refreshing ? "Refreshing..." : "Refresh Logs"}</span>
          </button>
          <button
            className="notif-refresh-btn"
            onClick={handleClearLogs}
            disabled={refreshing}
            style={{ background: "#ef4444", color: "#ffffff", borderColor: "#dc2626" }}
            title="Clear dummy logs and reset list"
          >
            <X size={16} />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="notif-stats-grid">
        <div className="notif-stat-card">
          <div className="notif-stat-icon total">
            <Send size={22} />
          </div>
          <div className="notif-stat-info">
            <span className="notif-stat-val">{stats.total || logs.length}</span>
            <span className="notif-stat-lbl">Total Sent</span>
          </div>
        </div>

        <div className="notif-stat-card">
          <div className="notif-stat-icon customer">
            <User size={22} />
          </div>
          <div className="notif-stat-info">
            <span className="notif-stat-val">{stats.customer || customerCount}</span>
            <span className="notif-stat-lbl">User (Customer)</span>
          </div>
        </div>

        <div className="notif-stat-card">
          <div className="notif-stat-icon staff">
            <Stethoscope size={22} />
          </div>
          <div className="notif-stat-info">
            <span className="notif-stat-val">{stats.staff || staffCount}</span>
            <span className="notif-stat-lbl">Doctor / Staff</span>
          </div>
        </div>

        <div className="notif-stat-card">
          <div className="notif-stat-icon whatsapp">
            <MessageSquare size={22} />
          </div>
          <div className="notif-stat-info">
            <span className="notif-stat-val">{stats.whatsapp || logs.filter(l => l.channel === 'whatsapp').length}</span>
            <span className="notif-stat-lbl">WhatsApp Messages</span>
          </div>
        </div>

        <div className="notif-stat-card">
          <div className="notif-stat-icon email">
            <Mail size={22} />
          </div>
          <div className="notif-stat-info">
            <span className="notif-stat-val">{stats.email || logs.filter(l => l.channel === 'email').length}</span>
            <span className="notif-stat-lbl">Emails Sent</span>
          </div>
        </div>
      </div>

      {/* Recipient Tabs */}
      <div className="notif-tabs-bar">
        <button
          className={`notif-tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          <Users size={16} />
          <span>All Recipients</span>
          <span className="notif-tab-badge">{logs.length}</span>
        </button>

        <button
          className={`notif-tab ${activeTab === "customer" ? "active" : ""}`}
          onClick={() => setActiveTab("customer")}
        >
          <User size={16} />
          <span>Customer (User) Messages</span>
          <span className="notif-tab-badge">{customerCount}</span>
        </button>

        <button
          className={`notif-tab ${activeTab === "staff" ? "active" : ""}`}
          onClick={() => setActiveTab("staff")}
        >
          <Stethoscope size={16} />
          <span>Doctor / Staff Messages</span>
          <span className="notif-tab-badge">{staffCount}</span>
        </button>
      </div>

      {/* Control Bar: Search & Select Filters */}
      <div className="notif-controls">
        <div className="notif-search-wrapper">
          <Search className="notif-search-icon" size={18} />
          <input
            type="text"
            className="notif-search-input"
            placeholder="Search by recipient name, email, phone, or message content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="notif-filter-group">
          {/* Channel Selector */}
          <select
            className="notif-select"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
          >
            <option value="all">All Channels</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>

          {/* Action Filter */}
          <select
            className="notif-select"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">All Actions</option>
            <option value="created">Confirmations</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancellations</option>
            <option value="reminder">Reminders</option>
          </select>

          {/* Status Filter */}
          <select
            className="notif-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="notif-table-card">
        {loading ? (
          <div className="notif-empty-state">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-400 mb-3" />
            <h3>Loading Notification Logs...</h3>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="notif-empty-state">
            <div className="notif-empty-icon">
              <Bell size={28} />
            </div>
            <h3>No Notification Logs Found</h3>
            <p>
              {searchTerm || channelFilter !== "all" || actionFilter !== "all" || activeTab !== "all"
                ? "No logs match your selected filter criteria. Try clearing search filters."
                : "No auto-sent confirmation or reminder logs recorded yet."}
            </p>
          </div>
        ) : (
          <div className="notif-table-wrapper">
            <table className="notif-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Type</th>
                  <th>Channel</th>
                  <th>Message Event</th>
                  <th>Sent Time</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="recipient-cell">
                        <span className="recipient-name">
                          {log.recipient_name || "Unknown Recipient"}
                        </span>
                        <span className="recipient-contact">
                          {log.recipient_contact || "N/A"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className={`badge-tag ${log.recipient_type === "staff" ? "staff" : "customer"}`}>
                        {log.recipient_type === "staff" ? (
                          <>
                            <Stethoscope size={12} /> Staff / Doctor
                          </>
                        ) : (
                          <>
                            <User size={12} /> User (Customer)
                          </>
                        )}
                      </span>
                    </td>

                    <td>
                      <span className={`badge-channel ${log.channel}`}>
                        {log.channel === "whatsapp" ? (
                          <>
                            <MessageSquare size={13} /> WhatsApp
                          </>
                        ) : (
                          <>
                            <Mail size={13} /> Email
                          </>
                        )}
                      </span>
                    </td>

                    <td>
                      <span className="badge-action">
                        {formatActionName(log.action)}
                      </span>
                    </td>

                    <td>
                      <span className="notif-time-cell" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--muted)', fontSize: '0.825rem', fontWeight: 500 }}>
                        <Clock size={13} style={{ opacity: 0.7 }} />
                        {formatTimestamp(log.created_at || log.sent_at)}
                      </span>
                    </td>

                    <td>
                      <span className={`badge-status ${log.status}`}>
                        <span className={`status-dot ${log.status}`} />
                        {log.status ? log.status.charAt(0).toUpperCase() + log.status.slice(1) : "Sent"}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn-view-msg"
                        onClick={() => setSelectedLog(log)}
                        title="Click to view exact message body"
                      >
                        <Eye size={14} />
                        <span>View Text</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Preview Modal */}
      {selectedLog && (
        <div className="notif-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="notif-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="notif-modal-header">
              <div className="notif-modal-title">
                {selectedLog.channel === "whatsapp" ? (
                  <MessageSquare className="text-emerald-400" size={20} />
                ) : (
                  <Mail className="text-blue-400" size={20} />
                )}
                <span>Auto-Sent Message Preview</span>
              </div>
              <button
                className="notif-modal-close"
                onClick={() => setSelectedLog(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="notif-modal-body">
              {/* Metadata Grid */}
              <div className="modal-meta-grid">
                <div className="modal-meta-item">
                  <span className="modal-meta-lbl">Recipient Name</span>
                  <span className="modal-meta-val">{selectedLog.recipient_name}</span>
                </div>

                <div className="modal-meta-item">
                  <span className="modal-meta-lbl">Recipient Type</span>
                  <span className="modal-meta-val">
                    <span className={`badge-tag ${selectedLog.recipient_type === "staff" ? "staff" : "customer"}`}>
                      {selectedLog.recipient_type === "staff" ? "Doctor / Staff" : "Customer / User"}
                    </span>
                  </span>
                </div>

                <div className="modal-meta-item">
                  <span className="modal-meta-lbl">Channel & Contact</span>
                  <span className="modal-meta-val">
                    {selectedLog.channel?.toUpperCase()} ({selectedLog.recipient_contact})
                  </span>
                </div>

                <div className="modal-meta-item">
                  <span className="modal-meta-lbl">Sent Timestamp</span>
                  <span className="modal-meta-val">
                    {formatTimestamp(selectedLog.created_at || selectedLog.sent_at)}
                  </span>
                </div>

                {selectedLog.subject && (
                  <div className="modal-meta-item" style={{ gridColumn: "span 2" }}>
                    <span className="modal-meta-lbl">Subject Line</span>
                    <span className="modal-meta-val" style={{ color: "var(--accent, #0284c7)" }}>{selectedLog.subject}</span>
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="msg-box-header">
                <span>FULL MESSAGE TEXT SENT</span>
                <button
                  className="btn-copy-msg"
                  onClick={() => handleCopyText(selectedLog.message_body || "")}
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Message</span>
                    </>
                  )}
                </button>
              </div>

              <div className={`msg-content-preview ${selectedLog.channel === "whatsapp" ? "whatsapp-style" : "email-style"}`}>
                {selectedLog.message_body}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
