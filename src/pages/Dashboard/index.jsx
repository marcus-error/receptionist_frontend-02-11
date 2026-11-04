import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import dashboardService from "../../services/dashboard.service.js";
import "./dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    stats: {
      totalCalls: 0,
      callsToday: 0,
      inboundCallsToday: 0,
      aiAnswered: 0,
      answeredCalls: 0,
      missedCalls: 0,
      failedCalls: 0,
      totalDuration: "0m 0s",
      avgDuration: "00:00",
      appointmentsBooked: 0,
      todayAppointments: 0,
      totalLeads: 0,
      aiResolutionRate: "0%",
    },
    status: {
      sipTrunk: { status: "DISCONNECTED", host: "Not configured" },
      calendar: { status: "DISCONNECTED", account: "Not connected" },
      knowledgeRag: { status: "EMPTY", indexed_docs: 0 },
      voiceReceptionist: { status: "ACTIVE", llm: "Gemini 2.0 Flash" },
    },
    recentCalls: [],
    upcomingSchedule: [],
    leads: [],
    staffPerformance: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const res = await dashboardService.getOverview();
      if (res) {
        setData({
          stats: res.stats || {},
          status: res.status || {},
          recentCalls: Array.isArray(res.recentCalls) ? res.recentCalls : [],
          upcomingSchedule: Array.isArray(res.upcomingSchedule) ? res.upcomingSchedule : [],
          leads: Array.isArray(res.leads) ? res.leads : [],
          staffPerformance: Array.isArray(res.staffPerformance) ? res.staffPerformance : [],
        });
      }
    } catch (err) {
      console.error("Failed to load live dashboard overview, attempting fallback:", err);
      try {
        const [statsRes, callsRes, statusRes, scheduleRes, leadsRes, staffRes] = await Promise.allSettled([
          dashboardService.getStats(),
          dashboardService.getRecentCalls(),
          dashboardService.getStatus(),
          dashboardService.getSchedule(),
          dashboardService.getLeads(),
          dashboardService.getStaff(),
        ]);
        setData((prev) => ({
          stats: statsRes.status === "fulfilled" ? statsRes.value : prev.stats,
          status: statusRes.status === "fulfilled" ? statusRes.value : prev.status,
          recentCalls: callsRes.status === "fulfilled" && Array.isArray(callsRes.value) ? callsRes.value : prev.recentCalls,
          upcomingSchedule: scheduleRes.status === "fulfilled" && Array.isArray(scheduleRes.value) ? scheduleRes.value : prev.upcomingSchedule,
          leads: leadsRes.status === "fulfilled" && Array.isArray(leadsRes.value) ? leadsRes.value : prev.leads,
          staffPerformance: staffRes.status === "fulfilled" && Array.isArray(staffRes.value) ? staffRes.value : prev.staffPerformance,
        }));
      } catch (fallbackErr) {
        console.error("Live fallback fetch failed:", fallbackErr);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh live data every 8 seconds
    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const stats = data.stats || {};
  const status = data.status || {};
  const sip = status.sipTrunk || {};
  const cal = status.calendar || {};
  const rag = status.knowledgeRag || {};
  const voice = status.voiceReceptionist || {};

  return (
    <section id="dashboard" className="dash-container">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-header-title">
          <h1>AI Receptionist Dashboard</h1>
          <p>Real-time overview of live calls, AI voice activity, appointments, and staff performance.</p>
        </div>

        <div className="dash-header-actions">
          <button
            type="button"
            className="dash-btn-refresh"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
          >
            <span>{refreshing ? "⟳ Refreshing..." : "⟳ Refresh"}</span>
          </button>

          <button
            type="button"
            className="dash-btn-live"
            onClick={() => navigate("/admin/live-calls")}
          >
            <span>🎙️</span> View Live Calls
          </button>
        </div>
      </div>

      {/* Live System Integrations Strip */}
      <div className="dash-status-strip">
        <div className="dash-status-card" onClick={() => navigate("/admin/telephony")} style={{ cursor: "pointer" }}>
          <div className="dash-status-left">
            <span className="dash-status-icon">📞</span>
            <div className="dash-status-info">
              <span className="dash-status-name">SIP Trunk Telephony</span>
              <span className="dash-status-detail">{sip.host || "SIP Trunk"}</span>
            </div>
          </div>
          <span className={`dash-badge ${sip.status === "CONNECTED" ? "green" : "red"}`}>
            <span className="dash-badge-dot" />
            {sip.status || "DISCONNECTED"}
          </span>
        </div>

        <div className="dash-status-card" onClick={() => navigate("/admin/calendar-integration")} style={{ cursor: "pointer" }}>
          <div className="dash-status-left">
            <span className="dash-status-icon">📅</span>
            <div className="dash-status-info">
              <span className="dash-status-name">Google Calendar</span>
              <span className="dash-status-detail">{cal.account || "Calendar Sync"}</span>
            </div>
          </div>
          <span className={`dash-badge ${cal.status === "CONNECTED" ? "green" : "yellow"}`}>
            <span className="dash-badge-dot" />
            {cal.status || "DISCONNECTED"}
          </span>
        </div>

        <div className="dash-status-card" onClick={() => navigate("/admin/knowledge")} style={{ cursor: "pointer" }}>
          <div className="dash-status-left">
            <span className="dash-status-icon">🧠</span>
            <div className="dash-status-info">
              <span className="dash-status-name">Knowledge Base (RAG)</span>
              <span className="dash-status-detail">{rag.indexed_docs || 0} Docs Indexed</span>
            </div>
          </div>
          <span className={`dash-badge ${rag.status === "READY" ? "green" : "blue"}`}>
            <span className="dash-badge-dot" />
            {rag.status || "READY"}
          </span>
        </div>

        <div className="dash-status-card" onClick={() => navigate("/admin/voice")} style={{ cursor: "pointer" }}>
          <div className="dash-status-left">
            <span className="dash-status-icon">🤖</span>
            <div className="dash-status-info">
              <span className="dash-status-name">Voice Receptionist</span>
              <span className="dash-status-detail">{voice.llm || "Gemini 2.0 Flash"}</span>
            </div>
          </div>
          <span className="dash-badge green">
            <span className="dash-badge-dot" />
            ACTIVE
          </span>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="dash-kpi-grid">
        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Calls Today</span>
            <span className="dash-kpi-icon">📲</span>
          </div>
          <div className="dash-kpi-value">{loading ? "..." : (stats.callsToday || 0)}</div>
          <span className="dash-kpi-sub">Total: {stats.totalCalls || 0} calls</span>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Answered by AI</span>
            <span className="dash-kpi-icon">✅</span>
          </div>
          <div className="dash-kpi-value" style={{ color: "var(--primary)" }}>
            {loading ? "..." : (stats.answeredCalls || stats.aiAnswered || 0)}
          </div>
          <span className="dash-kpi-sub">{stats.aiResolutionRate || "100%"} resolution rate</span>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Missed / Failed</span>
            <span className="dash-kpi-icon">⚠️</span>
          </div>
          <div className="dash-kpi-value" style={{ color: (stats.missedCalls + stats.failedCalls > 0) ? "#ef4444" : "var(--heading)" }}>
            {loading ? "..." : ((stats.missedCalls || 0) + (stats.failedCalls || 0))}
          </div>
          <span className="dash-kpi-sub">{stats.missedCalls || 0} missed, {stats.failedCalls || 0} failed</span>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Appointments</span>
            <span className="dash-kpi-icon">📋</span>
          </div>
          <div className="dash-kpi-value">{loading ? "..." : (stats.appointmentsBooked || 0)}</div>
          <span className="dash-kpi-sub">{stats.todayAppointments || 0} scheduled today</span>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Caller Leads</span>
            <span className="dash-kpi-icon">👥</span>
          </div>
          <div className="dash-kpi-value">{loading ? "..." : (stats.totalLeads || 0)}</div>
          <span className="dash-kpi-sub">Unique contacts captured</span>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-top">
            <span className="dash-kpi-label">Avg Call Duration</span>
            <span className="dash-kpi-icon">⏱️</span>
          </div>
          <div className="dash-kpi-value">{loading ? "..." : (stats.avgDuration || "00:00")}</div>
          <span className="dash-kpi-sub">Total: {stats.totalDuration || "0m"}</span>
        </div>
      </div>

      {/* Quick Action Buttons Bar */}
      <div className="dash-actions-bar">
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--heading)", textTransform: "uppercase", marginRight: "4px" }}>
          Quick Actions:
        </span>
        <button type="button" className="dash-action-btn" onClick={() => navigate("/admin/live-calls")}>
          🎙️ Live Inbound Calls
        </button>
        <button type="button" className="dash-action-btn" onClick={() => navigate("/admin/appointments")}>
          📋 Appointments
        </button>
        <button type="button" className="dash-action-btn" onClick={() => navigate("/admin/staff")}>
          👥 Staff Directory
        </button>
        <button type="button" className="dash-action-btn" onClick={() => navigate("/admin/calendar-integration")}>
          📆 Calendar Sync
        </button>
        <button type="button" className="dash-action-btn" onClick={() => navigate("/admin/telephony")}>
          📞 SIP Trunk Config
        </button>
        <button type="button" className="dash-action-btn" onClick={() => navigate("/admin/overall-reports")}>
          📊 Overall Reports
        </button>
      </div>

      {/* Main Grid: Left (Calls & Schedule) | Right (Leads & Staff Performance) */}
      <div className="dash-main-grid">
        {/* Left Column */}
        <div className="dash-col">
          {/* Recent Inbound Calls */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <h3><span>📞</span> Recent Inbound Calls</h3>
              <button type="button" className="dash-panel-link" onClick={() => navigate("/admin/call-recordings")}>
                View All Calls →
              </button>
            </div>

            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Caller</th>
                    <th>Intent</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentCalls.map((c) => (
                    <tr key={c.id || c.call_sid}>
                      <td>
                        <div className="dash-caller-cell">
                          <span className="dash-caller-name">{c.caller}</span>
                          {c.phone && c.phone !== c.caller && (
                            <span className="dash-caller-phone">{c.phone}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ color: "var(--fg)", fontWeight: 600 }}>{c.intent}</span>
                      </td>
                      <td>
                        <span className="dash-badge blue">{c.duration}</span>
                      </td>
                      <td>
                        <span className={`dash-badge ${
                          c.status?.toLowerCase().includes("completed") || c.status?.toLowerCase().includes("resolved") || c.status?.toLowerCase().includes("connected")
                            ? "green"
                            : c.status?.toLowerCase().includes("missed") || c.status?.toLowerCase().includes("failed")
                            ? "red"
                            : "yellow"
                        }`}>
                          <span className="dash-badge-dot" />
                          {c.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 500 }}>
                        {c.time_formatted || "Recent"}
                      </td>
                    </tr>
                  ))}

                  {data.recentCalls.length === 0 && !loading && (
                    <tr>
                      <td colSpan="5" className="dash-empty-state">
                        No recent calls recorded in database yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Today's Schedule & Upcoming Appointments */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <h3><span>📅</span> Today's Schedule & Upcoming Appointments</h3>
              <button type="button" className="dash-panel-link" onClick={() => navigate("/admin/appointments")}>
                View All Appointments →
              </button>
            </div>

            <div className="dash-schedule-list">
              {data.upcomingSchedule.map((appt) => (
                <div key={appt.id} className="dash-schedule-item">
                  <div className="dash-schedule-time">
                    <span className="time-val">{appt.time || "10:00 AM"}</span>
                    <span className="date-val">{appt.date || "Today"}</span>
                  </div>

                  <div className="dash-schedule-details">
                    <span className="dash-schedule-patient">{appt.customer}</span>
                    <span className="dash-schedule-meta">
                      {appt.department} • With <strong style={{ color: "var(--heading)" }}>{appt.staff}</strong> {appt.duration && `(${appt.duration})`}
                    </span>
                  </div>

                  <span className={`dash-badge ${
                    appt.status?.toLowerCase() === "confirmed"
                      ? "green"
                      : appt.status?.toLowerCase() === "cancelled"
                      ? "red"
                      : "yellow"
                  }`}>
                    <span className="dash-badge-dot" />
                    {appt.status}
                  </span>
                </div>
              ))}

              {data.upcomingSchedule.length === 0 && !loading && (
                <div className="dash-empty-state">
                  No upcoming appointments scheduled.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dash-col">
          {/* Caller Leads & Contacts */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <h3><span>👥</span> Caller Leads & Contacts</h3>
              <button type="button" className="dash-panel-link" onClick={() => navigate("/admin/crm-integration")}>
                CRM Sync →
              </button>
            </div>

            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Source</th>
                    <th>Department / Topic</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leads.map((lead, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="dash-caller-cell">
                          <span className="dash-caller-name">{lead.name}</span>
                          <span className="dash-caller-phone">{lead.phone}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>{lead.source}</td>
                      <td style={{ color: "var(--fg)", fontWeight: 600 }}>{lead.department}</td>
                      <td>
                        <span className={`dash-badge ${lead.status === "Booked" ? "green" : "blue"}`}>
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {data.leads.length === 0 && !loading && (
                    <tr>
                      <td colSpan="4" className="dash-empty-state">
                        No leads generated from calls yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Team / Staff Availability & Workload */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <h3><span>👨‍⚕️</span> Staff Availability & Workload</h3>
              <button type="button" className="dash-panel-link" onClick={() => navigate("/admin/staff")}>
                Manage Staff →
              </button>
            </div>

            <div className="dash-staff-list">
              {data.staffPerformance.map((staff) => (
                <div key={staff.id} className="dash-staff-item">
                  <div className="dash-staff-info">
                    <div className="dash-staff-avatar">
                      {staff.name.charAt(0)}
                    </div>
                    <div className="dash-staff-names">
                      <span className="dash-staff-name">{staff.name}</span>
                      <span className="dash-staff-dept">{staff.department} {staff.working_hours ? `• ${staff.working_hours}` : staff.appointment_duration ? `• ${staff.appointment_duration}` : ""}</span>
                    </div>
                  </div>

                  <div className="dash-staff-stats">
                    <span className="dash-staff-load">
                      {staff.total_appointments} Bookings
                    </span>
                    <span className={`dash-badge ${staff.status === "available" ? "green" : "yellow"}`}>
                      <span className="dash-badge-dot" />
                      {staff.status || "available"}
                    </span>
                  </div>
                </div>
              ))}

              {data.staffPerformance.length === 0 && !loading && (
                <div className="dash-empty-state">
                  No staff members registered in directory.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
