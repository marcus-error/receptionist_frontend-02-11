import { useState, useEffect } from "react";

export default function AddDepartmentModal({ isOpen, onClose, onSave, editingDept = null }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    head_of_department: "",
    phone: "",
    email: "",
    status: "Active"
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingDept) {
      setForm({
        name: editingDept.name || "",
        code: editingDept.code || "",
        description: editingDept.description || "",
        head_of_department: editingDept.head_of_department || "",
        phone: editingDept.phone || "",
        email: editingDept.email || "",
        status: editingDept.status || "Active"
      });
    } else {
      setForm({
        name: "",
        code: "",
        description: "",
        head_of_department: "",
        phone: "",
        email: "",
        status: "Active"
      });
    }
    setError("");
  }, [editingDept, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Department name is required.");

    try {
      setSubmitting(true);
      await onSave({
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
        head_of_department: form.head_of_department.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        status: form.status
      });
      onClose();
    } catch (err) {
      console.error("Failed to save department:", err);
      const detail = err?.response?.data?.detail;
      setError(detail ? (typeof detail === "string" ? detail : JSON.stringify(detail)) : "Failed to save department. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{editingDept ? "Edit Department" : "Add New Department"}</h2>
          <button className="modal-close-btn" onClick={onClose} type="button">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="modal-grid">
            <div className="group">
              <label style={{ color: "var(--heading)" }}>Department Name *</label>
              <input
                type="text"
                placeholder="e.g. Cardiology, Billing, Support"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Department Code</label>
              <input
                type="text"
                placeholder="e.g. CARD, BILL, SUPP"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Head of Department / Contact Person</label>
              <input
                type="text"
                placeholder="e.g. Dr. Priya Sharma"
                value={form.head_of_department}
                onChange={(e) => setForm({ ...form, head_of_department: e.target.value })}
              />
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Department Phone</label>
              <input
                type="text"
                placeholder="+91 XXXXX XXXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Department Email</label>
              <input
                type="email"
                placeholder="dept@clinic.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="group">
              <label style={{ color: "var(--heading)" }}>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="group" style={{ marginTop: "8px" }}>
            <label style={{ color: "var(--heading)" }}>Description & Scope</label>
            <textarea
              placeholder="Describe department functions and services offered..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          {error && (
            <p style={{ color: "#ef4444", fontSize: "13px", marginTop: "8px" }}>{error}</p>
          )}

          <div className="modal-footer">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : editingDept ? "Update Department" : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
