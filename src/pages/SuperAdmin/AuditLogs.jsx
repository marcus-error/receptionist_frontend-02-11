import { useState, useEffect } from "react";
import Badge from "../../components/ui/Badge.jsx";
import api from "../../services/api.js";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/notification-logs?limit=50");
      const realLogs = (res.data?.logs || []).map((item) => ({
        id: item.id,
        timestamp: item.created_at,
        actor: item.recipient_type || "System",
        action: item.action || "Notification",
        target: `${item.channel || "Event"}: ${item.recipient_contact || item.recipient_name || "Unknown"}`,
        status: item.status === "sent" ? "Success" : (item.status || "Pending")
      }));
      setLogs(realLogs);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <section id="super-admin-audit-logs" className="page active">
      <div className="header">
        <div>
          <h1 className="title">📋 System Audit Logs</h1>
          <p className="subtitle">Platform-wide activity tracker for security and compliance monitoring.</p>
        </div>
        <button className="btn">
          Export Logs (CSV)
        </button>
      </div>

      <div className="table">
        <table>
          <thead>
            <tr>
              <th>Log ID</th>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action / Event</th>
              <th>Target Entity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-secondary" style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
                  Fetching audit logs...
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log.id}>
                <td className="text-secondary" style={{ fontFamily: "monospace", opacity: 0.7 }}>#{log.id}</td>
                <td className="text-secondary" style={{ opacity: 0.8 }}>{formatDate(log.timestamp)}</td>
                <td style={{ fontWeight: "600", color: log.actor === "Super Admin" ? "#a78bfa" : log.actor === "System" ? "var(--muted)" : "var(--fg)" }}>
                  {log.actor}
                </td>
                <td style={{ fontWeight: "500", color: "var(--heading)" }}>{log.action}</td>
                <td className="text-secondary" style={{ opacity: 0.9 }}>{log.target}</td>
                <td>
                  <Badge color={log.status === "Success" ? "green" : "red"}>
                    {log.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
