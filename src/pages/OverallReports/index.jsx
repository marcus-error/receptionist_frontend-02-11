import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import useAuth from "../../hooks/useAuth.js";

/* ── tiny animated counter ── */
function AnimatedNumber({ value, duration = 600 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const num = typeof value === "number" ? value : parseInt(value, 10) || 0;
    let start = 0;
    const step = (ts) => {
      if (!ref.current) ref.current = ts;
      const progress = Math.min((ts - ref.current) / duration, 1);
      setDisplay(Math.floor(progress * num));
      if (progress < 1) requestAnimationFrame(step);
    };
    ref.current = null;
    requestAnimationFrame(step);
  }, [value, duration]);
  return <>{display}</>;
}

/* ── status badge ── */
function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  let cls = "badge green";
  if (s.includes("fail") || s.includes("cancel") || s.includes("miss")) cls = "badge red";
  else if (s.includes("pend") || s.includes("ring") || s.includes("progress")) cls = "badge yellow";
  else if (s.includes("complete") || s.includes("confirm") || s.includes("inbound")) cls = "badge green";
  return <span className={cls}>{status || "Unknown"}</span>;
}

/* ── section heading ── */
function SectionHeading({ icon, title }) {
  return (
    <h2 style={{
      fontFamily: "var(--font-heading)",
      fontSize: "17px",
      fontWeight: 700,
      color: "var(--heading)",
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      letterSpacing: "-0.01em"
    }}>
      <span style={{ fontSize: "18px" }}>{icon}</span>{title}
    </h2>
  );
}

/* ── stat card ── */
function StatCard({ label, value, color, icon }) {
  const colorMap = {
    blue:   { bg: "var(--panel-card)", border: "var(--line)", accent: "var(--primary)", labelColor: "var(--primary)" },
    green:  { bg: "var(--panel-card)", border: "var(--line)", accent: "#16a34a", labelColor: "#16a34a" },
    red:    { bg: "var(--panel-card)", border: "var(--line)", accent: "#dc2626", labelColor: "#dc2626" },
    purple: { bg: "var(--panel-card)", border: "var(--line)", accent: "#9333ea", labelColor: "#9333ea" },
    amber:  { bg: "var(--panel-card)", border: "var(--line)", accent: "#d97706", labelColor: "#d97706" },
    slate:  { bg: "var(--panel-card)", border: "var(--line)", accent: "var(--muted)", labelColor: "var(--muted)" },
  };
  const c = colorMap[color] || colorMap.blue;
  const isNumeric = typeof value === "number" || /^\d+$/.test(value);

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: "16px",
      padding: "20px 22px",
      boxShadow: "var(--shadow-sm)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
      cursor: "default",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{ fontSize: "16px" }}>{icon}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: c.labelColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: "32px", fontWeight: 800, color: "var(--heading)", lineHeight: 1 }}>
        {isNumeric ? <AnimatedNumber value={parseInt(value, 10)} /> : (value || "0")}
      </div>
    </div>
  );
}

export default function OverallReports() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("calls");
  
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");

  useEffect(() => {
    if (isSuperAdmin) {
      api.get("/organizations").then(res => {
        setOrganizations(res.data || []);
      }).catch(err => console.error("Failed to fetch orgs:", err));
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchReport();
  }, [period, selectedOrg]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/reports/summary?period=${period}`;
      if (period === "custom" && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      if (selectedOrg) {
        url += `&organization_id=${selectedOrg}`;
      }
      const res = await api.get(url);
      setReport(res.data);
    } catch (err) {
      console.error("Failed to fetch operational report", err);
      setError(err.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      let url = `/reports/export?period=${period}`;
      if (period === "custom" && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      if (selectedOrg) {
        url += `&organization_id=${selectedOrg}`;
      }
      const response = await api.get(url, { responseType: "blob" });

      const blob = new Blob([response.data], { type: "text/csv" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute("download", `ai_receptionist_report_${period}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to export report CSV: " + err.message);
    }
  };

  const periodLabels = {
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This Week",
    this_month: "This Month",
    this_quarter: "This Quarter",
    half_year: "Last 6 Months",
    this_year: "This Year",
    custom: "Custom Range"
  };

  const filterBarStyle = {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "24px",
    background: "var(--panel-card)",
    border: "1px solid var(--line)",
    padding: "16px 20px",
    borderRadius: "14px",
  };

  const selectStyle = {
    padding: "9px 14px",
    borderRadius: "10px",
    border: "1px solid var(--line)",
    background: "var(--line-light)",
    color: "var(--heading)",
    fontSize: "13.5px",
    fontWeight: "600",
    outline: "none",
    cursor: "pointer",
    minWidth: "180px"
  };

  const dateInputStyle = {
    padding: "9px 14px",
    borderRadius: "10px",
    border: "1px solid var(--line)",
    background: "var(--line-light)",
    color: "var(--heading)",
    fontSize: "13px",
    outline: "none",
    width: "auto"
  };

  const tabBtnStyle = (active) => ({
    padding: "9px 18px",
    borderRadius: "10px",
    border: active ? "1px solid var(--primary)" : "1px solid var(--line)",
    background: active ? "var(--primary)" : "var(--panel-card)",
    color: active ? "#ffffff" : "var(--fg)",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease"
  });

  return (
    <section id="overall-reports" className="page active">
      {/* ── Header ── */}
      <div className="header">
        <div>
          <h1 className="title">Overall Reports</h1>
          <p className="subtitle">
            Complete operational performance, call summaries, appointment reports, and CSV exports.
          </p>
        </div>
        <button className="btn primary" onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          📊 Export CSV Report
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div style={filterBarStyle}>
        {isSuperAdmin && (
          <>
            <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--heading)" }}>🏢 Organization:</span>
            <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} style={selectStyle}>
              <option value="">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            <div style={{ width: "1px", height: "24px", background: "var(--line)", margin: "0 8px" }}></div>
          </>
        )}

        <span style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--heading)" }}>📅 Period:</span>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} style={selectStyle}>
          {Object.entries(periodLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {period === "custom" && (
          <>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={dateInputStyle} />
            <span style={{ color: "var(--muted)", fontSize: "13px" }}>to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={dateInputStyle} />
            <button className="btn primary" onClick={fetchReport} style={{ padding: "9px 18px", fontSize: "13px" }}>
              Apply
            </button>
          </>
        )}
      </div>

      {/* ── Loading / Error ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{
            width: "40px", height: "40px", border: "3px solid var(--line)",
            borderTop: "3px solid var(--primary)", borderRadius: "50%",
            animation: "spin 0.8s linear infinite", margin: "0 auto 16px"
          }} />
          <p style={{ color: "var(--muted)", fontSize: "14px" }}>Loading report metrics…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : error ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "var(--panel-card)", border: "1px solid var(--line)",
          borderRadius: "16px"
        }}>
          <p style={{ color: "#ef4444", fontSize: "15px", fontWeight: 700, marginBottom: "8px" }}>⚠ Failed to load report</p>
          <p style={{ color: "var(--muted)", fontSize: "13px" }}>{error}</p>
          <button className="btn" onClick={fetchReport} style={{ marginTop: "16px" }}>Retry</button>
        </div>
      ) : !report ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: "var(--panel-card)", border: "1px solid var(--line)",
          borderRadius: "16px"
        }}>
          <p style={{ color: "var(--muted)", fontSize: "15px" }}>No report data available for this period.</p>
        </div>
      ) : (
        <>
          {/* ── Call Summary ── */}
          <SectionHeading icon="📞" title="Call Summary" />
          <div className="cards" style={{ marginBottom: "32px" }}>
            <StatCard label="Total Calls" value={report.call_summary.total_calls} color="blue" icon="📱" />
            <StatCard label="Answered" value={report.call_summary.answered_calls} color="green" icon="✅" />
            <StatCard label="Missed / Failed" value={report.call_summary.missed_calls} color="red" icon="📵" />
            <StatCard label="Avg Duration" value={report.call_summary.average_duration} color="purple" icon="⏱" />
          </div>

          {/* ── Appointment Summary ── */}
          <SectionHeading icon="📋" title="Appointment Summary" />
          <div className="cards" style={{ marginBottom: "32px" }}>
            <StatCard label="Total Booked" value={report.appointment_summary.total_appointments} color="slate" icon="📊" />
            <StatCard label="Confirmed" value={report.appointment_summary.scheduled_appointments} color="green" icon="✓" />
            <StatCard label="Pending" value={report.appointment_summary.pending_appointments} color="amber" icon="⏳" />
            <StatCard label="Cancelled" value={report.appointment_summary.cancelled_appointments} color="red" icon="✕" />
          </div>

          {/* ── Daily Snapshot ── */}
          {report.daily_details && (
            <>
              <SectionHeading icon="📆" title="Today's Snapshot" />
              <div className="grid3" style={{ marginBottom: "32px" }}>
                <div className="card" style={{ textAlign: "center" }}>
                  <div className="stat-label">Today's Calls</div>
                  <div className="stat" style={{ color: "var(--primary)" }}>
                    <AnimatedNumber value={report.daily_details.todays_calls} />
                  </div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div className="stat-label">Today's Appointments</div>
                  <div className="stat" style={{ color: "#16a34a" }}>
                    <AnimatedNumber value={report.daily_details.todays_scheduled_appointments} />
                  </div>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                  <div className="stat-label">Today's Cancellations</div>
                  <div className="stat" style={{ color: "#dc2626" }}>
                    <AnimatedNumber value={report.daily_details.todays_cancelled_appointments} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Detail Tables ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <button style={tabBtnStyle(activeTab === "calls")} onClick={() => setActiveTab("calls")}>
              📞 Call Details ({report.call_details?.length || 0})
            </button>
            <button style={tabBtnStyle(activeTab === "appointments")} onClick={() => setActiveTab("appointments")}>
              📋 Appointment Details ({report.appointment_details?.length || 0})
            </button>
          </div>

          {activeTab === "calls" && (
            <div className="table" style={{ marginBottom: "32px" }}>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Caller</th>
                      <th>Phone</th>
                      <th>Date & Time</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Intent</th>
                      <th>RAG Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.call_details && report.call_details.length > 0 ? (
                      report.call_details.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontFamily: "var(--font-heading)", fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>{c.id}</td>
                          <td style={{ fontWeight: 700, color: "var(--heading)" }}>{c.caller || "Test Runner"}</td>
                          <td style={{ color: "var(--fg)" }}>{c.phone || "Voice Assistant Test"}</td>
                          <td style={{ color: "var(--fg)", whiteSpace: "nowrap" }}>{c.date} {c.time}</td>
                          <td><span className="badge blue">{c.duration || "00:15"}</span></td>
                          <td><StatusBadge status={c.status} /></td>
                          <td style={{ color: "var(--fg)" }}>{c.intent || "Greeting"}</td>
                          <td>
                            {c.rag_used ? (
                              <span className="badge green">✓ Yes</span>
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: "12px", fontWeight: 600 }}>— No</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                          No call records found for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div className="table" style={{ marginBottom: "32px" }}>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Department</th>
                      <th>Staff</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.appointment_details && report.appointment_details.length > 0 ? (
                      report.appointment_details.map((a) => (
                        <tr key={a.id}>
                          <td style={{ fontFamily: "var(--font-heading)", fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>{a.id}</td>
                          <td style={{ fontWeight: 700, color: "var(--heading)" }}>{a.customer}</td>
                          <td style={{ color: "var(--fg)" }}>{a.phone}</td>
                          <td style={{ color: "var(--fg)" }}>{a.department}</td>
                          <td style={{ color: "var(--fg)" }}>{a.staff}</td>
                          <td style={{ color: "var(--fg)", whiteSpace: "nowrap" }}>{a.date}</td>
                          <td style={{ color: "var(--fg)" }}>{a.time}</td>
                          <td><StatusBadge status={a.status} /></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                          No appointment records found for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Extra Metrics Row ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px"
          }}>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ fontSize: "22px" }}>⏱</div>
              <div>
                <div className="stat-label">Total Talk Time</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: 700, color: "var(--heading)", marginTop: "4px" }}>
                  {report.call_summary.total_duration || "00:00"}
                </div>
              </div>
            </div>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ fontSize: "22px" }}>🔄</div>
              <div>
                <div className="stat-label">Active Calls</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: 700, color: "var(--heading)", marginTop: "4px" }}>
                  {report.call_summary.active_calls || 0}
                </div>
              </div>
            </div>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ fontSize: "22px" }}>📅</div>
              <div>
                <div className="stat-label">Today's Appointments</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: 700, color: "var(--heading)", marginTop: "4px" }}>
                  {report.appointment_summary.today_appointments || 0}
                </div>
              </div>
            </div>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ fontSize: "22px" }}>✅</div>
              <div>
                <div className="stat-label">Completed Calls</div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: 700, color: "var(--heading)", marginTop: "4px" }}>
                  {report.call_summary.completed_calls || 0}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
