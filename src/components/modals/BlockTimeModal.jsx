import { useState } from "react";

export default function BlockTimeModal({ isOpen, onClose, onBlock, staffList = [] }) {
  const [form, setForm] = useState({
    staff: staffList[0]?.name || "Michael Brown",
    date: "",
    startTime: "",
    endTime: "",
    reason: ""
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onBlock) {
      onBlock(form);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Block Calendar Time</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="modal-grid">
            <div className="group">
              <label>Staff *</label>
              <select
                value={form.staff}
                onChange={(e) => setForm({ ...form, staff: e.target.value })}
                required
              >
                {staffList.length > 0 ? (
                  staffList.map((s) => (
                    <option key={s.id || s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Michael Brown">Michael Brown</option>
                    <option value="Sarah Wilson">Sarah Wilson</option>
                    <option value="David Lee">David Lee</option>
                  </>
                )}
              </select>
            </div>

            <div className="group">
              <label>Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            <div className="group">
              <label>Start Time *</label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </div>

            <div className="group">
              <label>End Time *</label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="group" style={{ marginTop: "6px" }}>
            <label>Reason</label>
            <input
              type="text"
              placeholder="Meeting, leave, unavailable, etc."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-primary">
              Block Time
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
