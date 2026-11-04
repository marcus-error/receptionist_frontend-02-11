import { useState, useEffect } from "react";
import Badge from "../../components/ui/Badge.jsx";
import useApi from "../../hooks/useApi.js";
import appointmentsService from "../../services/appointments.service.js";
import AddAppointmentModal from "../../components/modals/AddAppointmentModal.jsx";

const STATUS_COLOR = { Confirmed: "green", Scheduled: "green", Pending: "yellow", Cancelled: "red" };
const HOURS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MINUTES = ["00", "15", "30", "45"];

export default function Appointments() {
  const { data: appointments, reload, loading } = useApi(
    appointmentsService.getAll,
    [],
    []
  );

  // Filter States
  const [timeFilter, setTimeFilter] = useState("all"); // "all" | "today" | "weekly" | "monthly"
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-poll live appointments every 6 seconds so voice AI bookings appear automatically
  useEffect(() => {
    const interval = setInterval(() => {
      reload();
    }, 6000);
    return () => clearInterval(interval);
  }, [reload]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [cancelAppt, setCancelAppt] = useState(null);
  const [availabilityAppt, setAvailabilityAppt] = useState(null);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [historyAppt, setHistoryAppt] = useState(null);

  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleHour, setRescheduleHour] = useState("10");
  const [rescheduleMinute, setRescheduleMinute] = useState("00");
  const [rescheduleAmPm, setRescheduleAmPm] = useState("AM");
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");

  // Cancel form state
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Date Parser Helper for Filtering
  const parseApptDate = (dateStr) => {
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const month = monthNames.findIndex((m) => parts[1].toLowerCase().startsWith(m));
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && month !== -1 && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return null;
  };

  // Filter Logic
  const filteredAppointments = appointments.filter((a) => {
    // 1. Status Filter
    if (statusFilter !== "all" && (a.status || "Pending").toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchCust = (a.customer || "").toLowerCase().includes(q);
      const matchCustId = (a.customer_id || "").toLowerCase().includes(q);
      const matchPhone = (a.phone || a.customer_phone || "").toLowerCase().includes(q);
      const matchStaff = (a.staff || "").toLowerCase().includes(q);
      const matchDept = (a.department || "").toLowerCase().includes(q);
      const matchService = (a.service || a.service_name || "").toLowerCase().includes(q);
      if (!matchCust && !matchCustId && !matchPhone && !matchStaff && !matchDept && !matchService) {
        return false;
      }
    }

    // 3. Time Period Filter (All, Today, Weekly, Monthly)
    if (timeFilter !== "all") {
      const apptDate = parseApptDate(a.appointment_date);
      if (!apptDate) return true;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      if (timeFilter === "today") {
        return apptDate >= todayStart && apptDate <= todayEnd;
      }

      if (timeFilter === "weekly") {
        const diffTime = Math.abs(apptDate.getTime() - todayStart.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7 || (apptDate.getMonth() === now.getMonth() && Math.abs(apptDate.getDate() - now.getDate()) <= 7);
      }

      if (timeFilter === "monthly") {
        const diffTime = Math.abs(apptDate.getTime() - todayStart.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30 || (apptDate.getMonth() === now.getMonth() && apptDate.getFullYear() === now.getFullYear());
      }
    }

    return true;
  });

  // Action Handlers
  const handleAdd = async (payload) => {
    await appointmentsService.create(payload);
    reload();
  };

  const openReschedule = (appt) => {
    setRescheduleAppt(appt);
    setRescheduleError("");
    setRescheduleDate(appt.appointment_date || "");

    // Parse existing time if available
    const timeStr = appt.appointment_time || "";
    if (timeStr.includes(":")) {
      const parts = timeStr.split(":");
      const h = parts[0].padStart(2, "0");
      if (HOURS.includes(h)) setRescheduleHour(h);
      if (parts[1]) {
        const m = parts[1].substring(0, 2);
        if (MINUTES.includes(m)) setRescheduleMinute(m);
      }
      if (timeStr.toUpperCase().includes("PM")) setRescheduleAmPm("PM");
      else setRescheduleAmPm("AM");
    } else {
      setRescheduleHour("10");
      setRescheduleMinute("00");
      setRescheduleAmPm("AM");
    }
  };

  const handleSaveReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleAppt) return;
    if (!rescheduleDate) {
      setRescheduleError("Please select a date.");
      return;
    }

    const formattedTime = `${rescheduleHour}:${rescheduleMinute} ${rescheduleAmPm}`;

    try {
      setSubmittingReschedule(true);
      await appointmentsService.reschedule(rescheduleAppt.id, {
        appointment_date: rescheduleDate,
        appointment_time: formattedTime,
        status: "Confirmed",
        confirmation_status: "Confirmed"
      });
      setRescheduleAppt(null);
      reload();
    } catch (err) {
      console.error("Failed to reschedule:", err);
      setRescheduleError("Failed to reschedule appointment. Please try again.");
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const openCancel = (appt) => {
    setCancelAppt(appt);
  };

  const handleConfirmCancel = async () => {
    if (!cancelAppt) return;
    try {
      setSubmittingCancel(true);
      await appointmentsService.cancel(cancelAppt.id);
      setCancelAppt(null);
      reload();
    } catch (err) {
      console.error("Failed to cancel appointment:", err);
      alert("Failed to cancel appointment. Please try again.");
    } finally {
      setSubmittingCancel(false);
    }
  };

  const openAvailability = async (appt) => {
    setAvailabilityAppt(appt);
    setCheckingAvailability(true);
    setAvailabilityData(null);
    try {
      const result = await appointmentsService.getAvailability({
        date: appt.appointment_date,
        staff: appt.staff,
        service: appt.service
      });
      setAvailabilityData(result);
    } catch (err) {
      console.error("Failed to check availability:", err);
      setAvailabilityData({ available_slots: [], reason: "Could not fetch availability slots" });
    } finally {
      setCheckingAvailability(false);
    }
  };

  return (
    <section id="appointments" className="page active">
      {/* ── Header ── */}
      <div className="header">
        <div>
          <h1 className="title">Appointments</h1>
          <p className="subtitle">Appointments created and managed by the AI receptionist</p>
        </div>

        <button className="btn primary" onClick={() => setIsAddModalOpen(true)}>
          + New Appointment
        </button>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        {/* Date Filter Tabs */}
        <div style={{ display: "flex", gap: "6px", background: "var(--line-light, rgba(255, 255, 255, 0.05))", padding: "4px", borderRadius: "8px", border: "1px solid var(--line)" }}>
          {[
            { id: "all", label: "All Appointments" },
            { id: "today", label: "Today" },
            { id: "weekly", label: "Weekly" },
            { id: "monthly", label: "Monthly" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTimeFilter(tab.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: timeFilter === tab.id ? "700" : "500",
                background: timeFilter === tab.id ? "#0284c7" : "transparent",
                color: timeFilter === tab.id ? "#ffffff" : "var(--muted)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Status Controls */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              border: "1px solid var(--line)",
              background: "var(--panel-card, #0f172a)",
              color: "var(--heading, #ffffff)",
              minHeight: "38px",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="all">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <input
            type="text"
            placeholder="🔍 Search name, ID, phone, staff, service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              border: "1px solid var(--line)",
              background: "var(--panel-card, #0f172a)",
              color: "var(--heading, #ffffff)",
              minWidth: "280px",
              minHeight: "38px",
              outline: "none"
            }}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="table">
        <table>
          <thead>
            <tr>
              <th>Customer & ID</th>
              <th>Department</th>
              <th>Staff</th>
              <th>Date</th>
              <th>Time</th>
              <th>Service</th>
              <th>Sync & Alerts</th>
              <th>Reminder</th>
              <th>Confirmation</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map((a) => (
              <tr key={a.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <strong style={{ color: "var(--heading)" }}>{a.customer}</strong>
                    <span style={{
                      fontSize: "10.5px",
                      fontWeight: "700",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: "#f1f5f9",
                      color: "#334155",
                      border: "1px solid #cbd5e1"
                    }} title="Appointment Database ID">
                      #{a.id}
                    </span>
                    {a.customer_id && (
                      <span style={{
                        fontSize: "10.5px",
                        fontWeight: "700",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: "#e0e7ff",
                        color: "#3730a3",
                        letterSpacing: "0.3px"
                      }} title="Auto-Generated Customer ID">
                        {a.customer_id}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 500, display: "block", marginTop: "2px" }}>
                    {a.customer_phone || a.phone || "No phone"} {a.customer_email || a.email ? `• ${a.customer_email || a.email}` : ""}
                  </span>
                </td>
                <td style={{ color: "var(--fg)" }}>{a.department || "—"}</td>
                <td>
                  <strong style={{ display: "block", color: "var(--heading)" }}>{a.staff || "—"}</strong>
                  <span style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: 500 }}>
                    {a.staff_email || a.staff_phone || ""}
                  </span>
                </td>
                <td style={{ whiteSpace: "nowrap", color: "var(--fg)", fontWeight: 500 }}>{a.appointment_date}</td>
                <td style={{ whiteSpace: "nowrap", color: "var(--fg)", fontWeight: 500 }}>{a.appointment_time}</td>
                <td style={{ color: "var(--fg)" }}>{a.service || a.service_name || "—"}</td>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ fontSize: "10.5px", color: "var(--muted)", width: "24px" }}>Cal:</span>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: a.calendar_sync_status === "SYNCED" ? "#dcfce7" : a.calendar_sync_status === "FAILED" ? "#fee2e2" : "#fef3c7",
                        color: a.calendar_sync_status === "SYNCED" ? "#166534" : a.calendar_sync_status === "FAILED" ? "#991b1b" : "#92400e"
                      }}>
                        {a.calendar_sync_status || "PENDING"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ fontSize: "10.5px", color: "var(--muted)", width: "24px" }}>Mail:</span>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: a.email_status === "SENT" ? "#dcfce7" : a.email_status === "FAILED" ? "#fee2e2" : a.email_status === "SKIPPED" ? "#f1f5f9" : "#fef3c7",
                        color: a.email_status === "SENT" ? "#166534" : a.email_status === "FAILED" ? "#991b1b" : a.email_status === "SKIPPED" ? "#64748b" : "#92400e"
                      }}>
                        {a.email_status || "PENDING"}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                      <span style={{ fontSize: "10.5px", color: "var(--muted)", width: "24px" }}>WA:</span>
                      <span style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        background: a.whatsapp_status === "SENT" ? "#dcfce7" : a.whatsapp_status === "FAILED" ? "#fee2e2" : a.whatsapp_status === "SKIPPED" ? "#f1f5f9" : "#fef3c7",
                        color: a.whatsapp_status === "SENT" ? "#166534" : a.whatsapp_status === "FAILED" ? "#991b1b" : a.whatsapp_status === "SKIPPED" ? "#64748b" : "#92400e"
                      }}>
                        {a.whatsapp_status || "PENDING"}
                      </span>
                    </div>
                  </div>
                </td>
                <td style={{ color: "var(--fg)" }}>{a.reminder || "Not scheduled"}</td>
                <td>
                  <Badge color={a.confirmation_status === "Confirmed" ? "green" : "yellow"}>
                    {a.confirmation_status || (a.status === "Confirmed" ? "Confirmed" : "Pending")}
                  </Badge>
                </td>
                <td>
                  <Badge color={STATUS_COLOR[a.status] || "blue"}>{a.status || "Pending"}</Badge>
                </td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    <button className="btn btn-sm" onClick={() => openAvailability(a)} title="Check Staff Slot Availability">
                      Availability
                    </button>
                    <button className="btn btn-sm" onClick={() => openReschedule(a)} title="Reschedule Date/Time">
                      Reschedule
                    </button>
                    <button className="btn btn-sm danger" onClick={() => openCancel(a)} title="Cancel Appointment">
                      Cancel
                    </button>
                    <button className="btn btn-sm" onClick={() => setHistoryAppt(a)} title="View Audit Details">
                      History
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredAppointments.length === 0 && !loading && (
              <tr>
                <td colSpan="11" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  {appointments.length === 0
                    ? 'No appointments scheduled. Click "+ New Appointment" to create one.'
                    : 'No appointments match the selected filters.'}
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan="11" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  Loading appointments...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── 1. Reschedule Modal ── */}
      {rescheduleAppt && (
        <div className="modal-overlay" onClick={() => setRescheduleAppt(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <h2 className="modal-title">Reschedule Appointment</h2>
              <button className="modal-close-btn" onClick={() => setRescheduleAppt(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveReschedule} className="modal-body">
              <p style={{ fontSize: "13.5px", color: "var(--muted)", marginBottom: "16px" }}>
                Rescheduling for <strong style={{ color: "var(--heading)" }}>{rescheduleAppt.customer}</strong> with <strong style={{ color: "var(--heading)" }}>{rescheduleAppt.staff || "Staff"}</strong>.
              </p>

              <div className="group" style={{ marginBottom: "14px" }}>
                <label style={{ color: "var(--heading)" }}>New Date *</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              <div className="group" style={{ marginBottom: "14px" }}>
                <label style={{ color: "var(--heading)" }}>New Time & AM/PM *</label>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <select
                    value={rescheduleHour}
                    onChange={(e) => setRescheduleHour(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span style={{ fontWeight: "bold", color: "var(--heading)" }}>:</span>
                  <select
                    value={rescheduleMinute}
                    onChange={(e) => setRescheduleMinute(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={rescheduleAmPm}
                    onChange={(e) => setRescheduleAmPm(e.target.value)}
                    style={{
                      width: "75px",
                      background: rescheduleAmPm === "AM" ? "var(--badge-blue-bg)" : "var(--badge-yellow-bg)",
                      color: rescheduleAmPm === "AM" ? "var(--badge-blue-fg)" : "var(--badge-yellow-fg)",
                      fontWeight: "700"
                    }}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {rescheduleError && (
                <p style={{ color: "#ef4444", fontSize: "13px", marginTop: "8px" }}>{rescheduleError}</p>
              )}

              <div className="modal-footer">
                <button type="button" className="modal-btn-cancel" onClick={() => setRescheduleAppt(null)}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn-primary" disabled={submittingReschedule}>
                  {submittingReschedule ? "Saving..." : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. Cancel Confirmation Modal ── */}
      {cancelAppt && (
        <div className="modal-overlay" onClick={() => setCancelAppt(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: "#ef4444" }}>Cancel Appointment</h2>
              <button className="modal-close-btn" onClick={() => setCancelAppt(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "14px", color: "var(--fg)", lineHeight: "1.6" }}>
                Are you sure you want to cancel the appointment for <strong style={{ color: "var(--heading)" }}>{cancelAppt.customer}</strong> on <strong style={{ color: "var(--heading)" }}>{cancelAppt.appointment_date}</strong> at <strong style={{ color: "var(--heading)" }}>{cancelAppt.appointment_time}</strong>?
              </p>
              <p style={{ fontSize: "12.5px", color: "var(--muted)", marginTop: "8px" }}>
                This status will be updated to "Cancelled" in the database.
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={() => setCancelAppt(null)}>
                Keep Appointment
              </button>
              <button className="btn danger" style={{ padding: "9px 20px" }} onClick={handleConfirmCancel} disabled={submittingCancel}>
                {submittingCancel ? "Cancelling..." : "Yes, Cancel Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Availability Modal ── */}
      {availabilityAppt && (
        <div className="modal-overlay" onClick={() => setAvailabilityAppt(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h2 className="modal-title">Staff Availability Check</h2>
              <button className="modal-close-btn" onClick={() => setAvailabilityAppt(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "14px", color: "var(--fg)", marginBottom: "12px" }}>
                Staff: <strong style={{ color: "var(--heading)" }}>{availabilityAppt.staff || "Assigned Staff"}</strong> ({availabilityAppt.department || "General"})
              </p>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>
                Target Date: <strong style={{ color: "var(--heading)" }}>{availabilityAppt.appointment_date}</strong> at <strong style={{ color: "var(--heading)" }}>{availabilityAppt.appointment_time}</strong>
              </p>

              {checkingAvailability ? (
                <p style={{ color: "var(--muted)", fontSize: "13.5px" }}>⏳ Checking slots with backend...</p>
              ) : availabilityData ? (
                <div style={{ background: "var(--line-light)", padding: "14px", borderRadius: "10px", border: "1px solid var(--line)" }}>
                  {availabilityData.available_slots && availabilityData.available_slots.length > 0 ? (
                    <>
                      <span style={{ color: "#16a34a", fontWeight: "700", display: "block", marginBottom: "8px" }}>
                        ✓ Open Slots Available Today:
                      </span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {availabilityData.available_slots.map((slot, i) => {
                          const slotLabel = typeof slot === "string"
                            ? slot
                            : (slot.start ? `${slot.start}${slot.end ? ' - ' + slot.end : ''}` : (slot.start_datetime || String(slot)));
                          return <span key={i} className="badge green">{slotLabel}</span>;
                        })}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: "#16a34a", fontWeight: "700" }}>
                      ✓ Staff slot confirmed available for {availabilityAppt.appointment_time}
                    </span>
                  )}
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={() => setAvailabilityAppt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. History Modal ── */}
      {historyAppt && (
        <div className="modal-overlay" onClick={() => setHistoryAppt(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h2 className="modal-title">Appointment History & Details</h2>
              <button className="modal-close-btn" onClick={() => setHistoryAppt(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ lineHeight: 1.8 }}>
              <p style={{ color: "var(--fg)" }}>
                <strong style={{ color: "var(--heading)" }}>Customer:</strong> {historyAppt.customer}
                {historyAppt.customer_id && (
                  <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: "700", padding: "2px 6px", borderRadius: "4px", background: "#e0e7ff", color: "#3730a3" }}>
                    {historyAppt.customer_id}
                  </span>
                )}
                <span style={{ marginLeft: "6px" }}>— {historyAppt.customer_phone || historyAppt.phone || historyAppt.customer_email || historyAppt.email || "No contact details"}</span>
              </p>
              <p style={{ color: "var(--fg)" }}>
                <strong style={{ color: "var(--heading)" }}>Staff:</strong> {historyAppt.staff || "—"} — {historyAppt.staff_email || historyAppt.staff_phone || "No staff contact details"}
              </p>
              <p style={{ color: "var(--fg)" }}>
                <strong style={{ color: "var(--heading)" }}>Service:</strong> {historyAppt.service || historyAppt.service_name || "—"}
              </p>
              <p style={{ color: "var(--fg)" }}>
                <strong style={{ color: "var(--heading)" }}>Status:</strong> {historyAppt.status || "Pending"}
              </p>
              <p style={{ color: "var(--fg)" }}>
                <strong style={{ color: "var(--heading)" }}>Confirmation:</strong> {historyAppt.confirmation_status || "Pending"}
              </p>
              <p style={{ color: "var(--fg)" }}>
                <strong style={{ color: "var(--heading)" }}>Reminder:</strong> {historyAppt.reminder || "Not scheduled"}
              </p>
              <p style={{ color: "var(--fg)" }}>
                <strong style={{ color: "var(--heading)" }}>Google Calendar:</strong>{" "}
                <span style={{ fontWeight: 600, color: historyAppt.calendar_sync_status === "SYNCED" ? "#16a34a" : historyAppt.calendar_sync_status === "FAILED" ? "#dc2626" : "#d97706" }}>
                  {historyAppt.calendar_sync_status || "PENDING"}
                </span>
                {historyAppt.calendar_event_id && (
                  <span style={{ marginLeft: "6px", fontSize: "12px", color: "var(--muted)" }}>
                    (Event ID: {historyAppt.calendar_event_id})
                  </span>
                )}
              </p>
              <p style={{ color: "var(--fg)" }}>
                <strong style={{ color: "var(--heading)" }}>Email Confirmation:</strong>{" "}
                <span style={{ fontWeight: 600, color: historyAppt.email_status === "SENT" ? "#16a34a" : historyAppt.email_status === "FAILED" ? "#dc2626" : "#d97706" }}>
                  {historyAppt.email_status || "PENDING"}
                </span>
              </p>
              <p style={{ color: "var(--fg)" }}>
                <strong style={{ color: "var(--heading)" }}>WhatsApp Confirmation:</strong>{" "}
                <span style={{ fontWeight: 600, color: historyAppt.whatsapp_status === "SENT" ? "#16a34a" : historyAppt.whatsapp_status === "FAILED" ? "#dc2626" : "#d97706" }}>
                  {historyAppt.whatsapp_status || "PENDING"}
                </span>
              </p>
              <p style={{ marginTop: "12px", color: "var(--heading)", fontWeight: "700" }}>Audit Trail:</p>
              <div style={{
                marginTop: "8px",
                padding: "14px",
                background: "var(--line-light)",
                border: "1px solid var(--line)",
                borderRadius: "10px",
                fontSize: "13px",
                color: "var(--fg)"
              }}>
                {historyAppt.history
                  ? (Array.isArray(historyAppt.history)
                    ? historyAppt.history.map((h, i) => <div key={i}>{h.date || ""} {h.action || h.status || h}</div>)
                    : String(historyAppt.history))
                  : `Appointment created on ${historyAppt.appointment_date || "today"}. Managed by AI Receptionist.`}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={() => setHistoryAppt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Appointment Modal ── */}
      <AddAppointmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAdd}
      />
    </section>
  );
}
