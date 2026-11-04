import { useState, useEffect } from "react";
import departmentService from "../../services/department.service.js";

const DEFAULT_DEPARTMENTS = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Orthopedics",
  "Pediatrics",
  "Dental Care",
  "Customer Support"
];

export default function AddStaffModal({ isOpen, onClose, onAddStaff }) {
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "General Medicine",
    startTime: "09:00",
    endTime: "17:00",
    appointment_duration: "30 min",
    status: "Available"
  });
  const [customDepartment, setCustomDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setCustomDepartment("");
      setError("");
      return;
    }
    departmentService.getAll()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.filter((d) => d.status === "Active").map((d) => d.name);
          if (names.length > 0) {
            setDepartments(names);
            setForm((prev) => ({
              ...prev,
              department: prev.department === "Others" || names.includes(prev.department) ? prev.department : names[0]
            }));
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load departments for staff modal:", err);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const PHONE_RE = /^\+?[\d\s\-().]{6,20}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Staff name is required.");
    if (!form.department) return setError("Department is required.");
    if (form.department === "Others" && !customDepartment.trim()) {
      return setError("Custom department name is required.");
    }
    if (form.phone.trim()) {
      const ph = form.phone.trim();
      if (!PHONE_RE.test(ph)) {
        return setError("Invalid phone number. Use E.164 format (e.g. +919876543210) or digits with spaces/dashes/parentheses.");
      }
      const digitCount = ph.replace(/\D/g, "").length;
      if (digitCount < 6) return setError("Phone number must contain at least 6 digits.");
      if (digitCount > 15) return setError("Phone number must not exceed 15 digits.");
    }

    try {
      setSubmitting(true);
      const working_hours = `${form.startTime}-${form.endTime}`;
      const finalDepartment = form.department === "Others" ? customDepartment.trim() : form.department;
      await onAddStaff({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        department: finalDepartment,
        working_hours,
        appointment_duration: form.appointment_duration,
        status: form.status,
      });
      // Reset
      setForm({ name: "", email: "", phone: "", department: departments[0] || "General Medicine", startTime: "09:00", endTime: "17:00", appointment_duration: "30 min", status: "Available" });
      setCustomDepartment("");
      onClose();
    } catch (err) {
      console.error("Failed to add staff:", err);
      const detail = err?.response?.data?.detail;
      setError(detail ? (typeof detail === "string" ? detail : JSON.stringify(detail)) : "Failed to add staff member. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Staff Member</h2>
          <button className="modal-close-btn" onClick={onClose} type="button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="modal-grid">
            <div className="group">
              <label>Full Name *</label>
              <input
                type="text"
                placeholder="Staff name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="group">
              <label>Email</label>
              <input
                type="email"
                placeholder="staff@clinic.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="group">
              <label>Phone</label>
              <input
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <small style={{ color: "var(--muted)", fontSize: "11px", marginTop: "3px", display: "block" }}>
                E.164 (e.g. +919876543210) or local format with dashes/spaces
              </small>
            </div>

            <div className="group">
              <label>Department *</label>
              <select
                value={form.department}
                onChange={(e) => {
                  setForm({ ...form, department: e.target.value });
                  if (e.target.value !== "Others") {
                    setCustomDepartment("");
                  }
                }}
                required
              >
                {departments.filter((d) => d !== "Others").map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="Others">Others</option>
              </select>
              {form.department === "Others" && (
                <input
                  type="text"
                  placeholder="Enter custom department name"
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  style={{ marginTop: "8px" }}
                  autoFocus
                  required
                />
              )}
            </div>

            <div className="group">
              <label>Start Time</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>

            <div className="group">
              <label>End Time</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>

            <div className="group">
              <label>Appointment Duration</label>
              <select
                value={form.appointment_duration}
                onChange={(e) => setForm({ ...form, appointment_duration: e.target.value })}
              >
                <option value="15 min">15 min</option>
                <option value="30 min">30 min</option>
                <option value="45 min">45 min</option>
                <option value="60 min">60 min</option>
              </select>
            </div>

            <div className="group">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="Available">Available</option>
                <option value="Busy">Busy</option>
                <option value="Offline">Offline</option>
              </select>
            </div>
          </div>

          {error && (
            <p style={{ color: "#ef4444", fontSize: "13px", marginTop: "8px" }}>{error}</p>
          )}

          <div className="modal-footer">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-primary" disabled={submitting}>
              {submitting ? "Adding..." : "Add Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
