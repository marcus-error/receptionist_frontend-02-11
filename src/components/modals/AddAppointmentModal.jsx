import { useState, useEffect } from "react";
import staffService from "../../services/staff.service.js";

const DURATION_OPTIONS = ["15 Minutes", "30 Minutes", "45 Minutes", "60 Minutes"];
const HOURS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const MINUTES = ["00", "15", "30", "45"];

export default function AddAppointmentModal({ isOpen, onClose, onAdd }) {
  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({
    customer: "",
    phone: "",
    email: "",
    staff: "",
    service: "",
    date: "",
    duration: "30 Minutes",
    notes: ""
  });

  // Explicit 12-hour AM/PM Time State
  const [timeHour, setTimeHour] = useState("10");
  const [timeMinute, setTimeMinute] = useState("00");
  const [timeAmPm, setTimeAmPm] = useState("AM");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load staff when modal opens
  useEffect(() => {
    if (!isOpen) return;

    staffService.getAll()
      .then((staffData) => {
        const list = staffData || [];
        setStaffList(list);
        if (list.length > 0) {
          setForm((prev) => ({
            ...prev,
            staff: prev.staff || list[0].name
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to load staff for appointment modal:", err);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    if (!form.customer.trim()) return setError("Customer name is required.");
    if (!form.phone.trim()) return setError("Phone is required.");
    if (!form.date) return setError("Date is required.");

    // Determine department automatically from selected staff member
    const selectedStaffObj = staffList.find((s) => s.name === form.staff);
    const department = selectedStaffObj?.department || "General";

    // Formatted 12-hour AM/PM time
    const formattedTime = `${timeHour}:${timeMinute} ${timeAmPm}`;

    try {
      setSubmitting(true);
      await onAdd({
        customer: form.customer.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        department: department,
        staff: form.staff || "Assigned Staff",
        service: form.service.trim() || null,
        appointment_date: new Date(form.date).toLocaleDateString("en-GB", {
          day: "2-digit", month: "short", year: "numeric"
        }),
        appointment_time: formattedTime,
        duration: form.duration,
        notes: form.notes ? `${form.notes} (Manual Admin Booking)` : "Manual Admin Booking",
        reminder: "WhatsApp + Email",
        status: "Confirmed"
      });

      setSuccessMsg("✓ Appointment confirmed and synchronized with Google Calendar!");
      setTimeout(() => {
        setForm({ customer: "", phone: "", email: "", staff: staffList[0]?.name || "", service: "", date: "", duration: "30 Minutes", notes: "" });
        setTimeHour("10");
        setTimeMinute("00");
        setTimeAmPm("AM");
        setSuccessMsg("");
        onClose();
      }, 1000);
    } catch (err) {
      console.error("Failed to create appointment:", err);
      const detail = err?.response?.data?.detail;
      setError(detail ? (typeof detail === "string" ? detail : JSON.stringify(detail)) : "Failed to create appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create New Appointment</h2>
          <button className="modal-close-btn" onClick={onClose} type="button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div style={{ marginBottom: "12px", background: "#e0e7ff", color: "#3730a3", padding: "8px 12px", borderRadius: "6px", fontSize: "12.5px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>🆔 Customer ID will be automatically generated & linked (e.g. CUST-XXXXX)</span>
          </div>

          <div className="modal-grid">
            <div className="group">
              <label style={{ color: "var(--heading)" }}>Customer Name *</label>
              <input
                type="text"
                placeholder="Customer name"
                value={form.customer}
                onChange={set("customer")}
                required
              />
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Phone *</label>
              <input
                type="text"
                placeholder="+91 XXXXX XXXXX"
                value={form.phone}
                onChange={set("phone")}
                required
              />
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Email</label>
              <input
                type="email"
                placeholder="customer@email.com"
                value={form.email}
                onChange={set("email")}
              />
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Staff *</label>
              <select value={form.staff} onChange={set("staff")} required>
                {staffList.length === 0 && <option value="">General Reception Staff</option>}
                {staffList.map((s) => (
                  <option key={s.id || s.name} value={s.name}>
                    {s.name} {s.department ? `(${s.department})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Service / Procedure</label>
              <input
                type="text"
                placeholder="e.g. General Checkup, Dental Cleaning"
                value={form.service}
                onChange={set("service")}
              />
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={set("date")}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Time & AM/PM *</label>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <select
                  value={timeHour}
                  onChange={(e) => setTimeHour(e.target.value)}
                  style={{ flex: 1 }}
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span style={{ fontWeight: "bold", color: "var(--heading)" }}>:</span>
                <select
                  value={timeMinute}
                  onChange={(e) => setTimeMinute(e.target.value)}
                  style={{ flex: 1 }}
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={timeAmPm}
                  onChange={(e) => setTimeAmPm(e.target.value)}
                  style={{
                    width: "75px",
                    background: timeAmPm === "AM" ? "var(--badge-blue-bg)" : "var(--badge-yellow-bg)",
                    color: timeAmPm === "AM" ? "var(--badge-blue-fg)" : "var(--badge-yellow-fg)",
                    fontWeight: "700"
                  }}
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Duration</label>
              <select value={form.duration} onChange={set("duration")}>
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="group" style={{ marginTop: "4px" }}>
            <label style={{ color: "var(--heading)" }}>Notes</label>
            <textarea
              placeholder="Appointment notes"
              value={form.notes}
              onChange={set("notes")}
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {error && (
            <p style={{ color: "#ef4444", fontSize: "13px", marginTop: "8px" }}>{error}</p>
          )}

          {successMsg && (
            <p style={{ color: "#16a34a", fontSize: "13px", fontWeight: "700", marginTop: "8px" }}>{successMsg}</p>
          )}

          <div className="modal-footer">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
