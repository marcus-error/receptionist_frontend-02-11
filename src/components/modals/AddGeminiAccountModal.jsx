import { useState } from "react";

export default function AddGeminiAccountModal({ isOpen, onClose, onAddAccount }) {
  const [form, setForm] = useState({
    label: "Gemini Account 05",
    apiKey: "",
    model: "Gemini Flash",
    status: "Active"
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.apiKey.trim()) {
      alert("API Key is required.");
      return;
    }
    setSubmitting(true);
    try {
      if (onAddAccount) {
        await onAddAccount({
          account: form.label,
          api_key: form.apiKey,
          status: form.status,
        });
      }
      onClose();
    } catch (err) {
      console.error("Failed to add Gemini account:", err);
      alert("Failed to add account: " + (err?.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add Gemini Account</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="group">
            <label>Account Label *</label>
            <input
              type="text"
              placeholder="Gemini Account 05"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
            />
          </div>

          <div className="group">
            <label>API Key *</label>
            <input
              type="password"
              placeholder="Enter secure API key"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              required
            />
          </div>

          <div className="modal-grid">
            <div className="group">
              <label>Model</label>
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
              >
                <option value="Gemini Flash">Gemini Flash</option>
                <option value="Gemini Pro">Gemini Pro</option>
                <option value="Gemini Ultra">Gemini Ultra</option>
              </select>
            </div>

            <div className="group">
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-primary" disabled={submitting}>
              {submitting ? "Adding..." : "Add Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
