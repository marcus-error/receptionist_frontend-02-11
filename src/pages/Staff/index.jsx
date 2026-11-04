import { useState } from "react";
import Badge from "../../components/ui/Badge.jsx";
import useApi from "../../hooks/useApi.js";
import staffService from "../../services/staff.service.js";
import AddStaffModal from "../../components/modals/AddStaffModal.jsx";
import EditStaffModal from "../../components/modals/EditStaffModal.jsx";
import { useAuthContext } from "../../context/AuthContext.jsx";

const STATUS_COLOR = { Available: "green", Busy: "yellow", Offline: "red" };

export default function Staff() {
  const { data: staff, reload, loading } = useApi(staffService.getAll, [], []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const { user } = useAuthContext();

  // Only admins and super_admins may edit staff
  const canEdit = user?.role === "admin" || user?.role === "super_admin";

  const handleAddStaff = async (newStaffData) => {
    try {
      await staffService.create(newStaffData);
      if (reload) reload();
      setIsAddModalOpen(false);
    } catch (err) {
      console.error("Failed to add staff member:", err);
      throw err;
    }
  };

  const handleEditStaff = async (id, payload) => {
    await staffService.update(id, payload);
    reload();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this staff member?")) return;
    try {
      await staffService.remove(id);
      reload();
    } catch (err) {
      console.error("Failed to delete staff member:", err);
      alert("Failed to delete: " + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <section id="staff" className="page active">
      <div className="header">
        <div>
          <h1 className="title">Staff Management</h1>
          <p className="subtitle">Staff directory and availability for AI appointment bookings</p>
        </div>

        <button className="btn primary" onClick={() => setIsAddModalOpen(true)}>
          + Add Staff
        </button>
      </div>

      <div className="table">
        <table>
          <thead>
            <tr>
              <th>Staff Member</th>
              <th>Department</th>
              <th>Contact</th>
              <th>Working Hours</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id || s.name}>
                <td>
                  <strong style={{ display: "block", color: "var(--heading)", fontWeight: "700" }}>{s.name}</strong>
                </td>
                <td style={{ color: "var(--fg)" }}>{s.department}</td>
                <td>
                  <div style={{ fontSize: "12.5px", lineHeight: "1.5" }}>
                    {s.email && <div style={{ color: "var(--fg)", fontWeight: "500" }}>✉ {s.email}</div>}
                    {s.phone && <div style={{ color: "var(--muted)" }}>📞 {s.phone}</div>}
                    {!s.email && !s.phone && <span style={{ color: "var(--faint)" }}>—</span>}
                  </div>
                </td>
                <td style={{ color: "var(--fg)", fontFamily: "monospace", fontWeight: "600" }}>{s.working_hours || s.hours || "09:00-17:00"}</td>
                <td><span className="badge blue">{s.appointment_duration || s.duration || "30 min"}</span></td>
                <td>
                  <Badge color={STATUS_COLOR[s.status] || "blue"}>{s.status || "Available"}</Badge>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {canEdit && (
                      <button
                        className="btn btn-sm"
                        onClick={() => setEditingStaff(s)}
                        style={{ background: "var(--primary-soft, #e0e7ff)", color: "var(--primary, #4f46e5)" }}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      className="btn btn-sm danger"
                      onClick={() => handleDelete(s.id)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {staff.length === 0 && !loading && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  No staff members found. Click "+ Add Staff" to add one.
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  Loading staff directory...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddStaff={handleAddStaff}
      />

      <EditStaffModal
        isOpen={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        onSave={handleEditStaff}
        editingStaff={editingStaff}
      />
    </section>
  );
}
