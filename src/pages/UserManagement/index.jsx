import { useState, useEffect } from "react";
import api from "../../services/api";

// Default permissions for staff role (limited access)
const STAFF_PERMISSIONS = [
  "dashboard", "calls", "recordings", "appointments", "calendar", "staff"
];

const ALL_PERMISSIONS = [
  { id: "dashboard", label: "Dashboard Metrics" },
  { id: "calls", label: "Call History & Logs" },
  { id: "recordings", label: "Call Recordings" },
  { id: "live_calls", label: "Live Call Monitoring" },
  { id: "reports", label: "Overall Operational Reports" },
  { id: "appointments", label: "Appointments Management" },
  { id: "calendar", label: "Calendar View" },
  { id: "staff", label: "Staff Roster & Hours" },
  { id: "knowledge_base", label: "Knowledge Base / RAG" },
  { id: "ai_config", label: "AI Configuration" },
  { id: "telephony", label: "Telephony / SIP Settings" },
  { id: "whatsapp", label: "WhatsApp Messaging" },
  { id: "email", label: "Email Integration" },
  { id: "crm", label: "CRM Integration" },
  { id: "integrations", label: "Calendar Integrations" },
  { id: "settings", label: "Business Settings" },
  { id: "user_management", label: "User & Permission Management" }
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [userPerms, setUserPerms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "admin" });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePerm = (permId) => {
    setUserPerms((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const savePermissions = async () => {
    if (!editingUser) return;
    try {
      await api.put(`/users/${editingUser.id}/permissions`, { permissions: userPerms });
      alert(`Permissions updated for ${editingUser.name || editingUser.email}`);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert("Failed to update permissions: " + err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // Give staff limited permissions by default, admins get full access
      const defaultPerms = newUser.role === "staff"
        ? STAFF_PERMISSIONS
        : ALL_PERMISSIONS.map((p) => p.id);
      await api.post("/users", {
        ...newUser,
        permissions: defaultPerms
      });
      alert("User created successfully!");
      setShowCreateModal(false);
      setNewUser({ name: "", email: "", password: "", role: "admin" });
      fetchUsers();
    } catch (err) {
      alert("Failed to create user: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <section id="user-management" className="page active">
      <div className="header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="title">User & Permission Management</h1>
          <p className="subtitle">
            Manage Organization Admins, Staff users, and assign granular feature permissions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn primary"
        >
          + Add New User
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>Loading user accounts...</p>
      ) : (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Active Permissions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: "700", color: "var(--heading)" }}>
                    {u.name || u.full_name || u.email?.split("@")[0] || "User"}
                  </td>
                  <td style={{ color: "var(--fg)", fontWeight: 500 }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === "super_admin" ? "yellow" : "blue"}`}>
                      {(u.role || "admin").toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {u.role === "super_admin" ? (
                      <span style={{ color: "var(--primary)", fontWeight: "700" }}>ALL PERMISSIONS (Super Admin)</span>
                    ) : (
                      <span style={{ color: "var(--fg)", fontWeight: 600 }}>{u.permissions?.length || 0} / {ALL_PERMISSIONS.length} Enabled</span>
                    )}
                  </td>
                  <td>
                    {u.role !== "super_admin" && (
                      <button
                        onClick={() => { setEditingUser(u); setUserPerms(u.permissions || []); }}
                        className="btn"
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                      >
                        ⚙ Edit Permissions
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h2 className="modal-title">Configure Permissions for {editingUser.name || editingUser.email}</h2>
              <button onClick={() => setEditingUser(null)} className="modal-close-btn">×</button>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "12px", marginBottom: "20px" }}>
              Select which modules and features this user is authorized to access:
            </p>

            <div className="modal-grid" style={{ gap: "12px", marginBottom: "24px" }}>
              {ALL_PERMISSIONS.map((perm) => (
                <label key={perm.id} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", cursor: "pointer", background: "var(--line-light)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)", color: "var(--heading)", fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={userPerms.includes(perm.id)}
                    onChange={() => handleTogglePerm(perm.id)}
                    style={{ width: "auto", cursor: "pointer" }}
                  />
                  {perm.label}
                </label>
              ))}
            </div>

            <div className="modal-footer">
              <button onClick={() => setEditingUser(null)} className="modal-btn-cancel">Cancel</button>
              <button onClick={savePermissions} className="modal-btn-primary">Save Permissions</button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h2 className="modal-title">Add New User Account</h2>
              <button onClick={() => setShowCreateModal(false)} className="modal-close-btn">×</button>
            </div>

            <form onSubmit={handleCreateUser} style={{ marginTop: "16px" }}>
              <div className="group">
                <label style={{ color: "var(--heading)" }}>Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>

              <div className="group">
                <label style={{ color: "var(--heading)" }}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@company.com"
                />
              </div>

              <div className="group">
                <label style={{ color: "var(--heading)" }}>Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••••••"
                  minLength={6}
                />
              </div>

              <div className="group">
                <label style={{ color: "var(--heading)" }}>Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="modal-btn-cancel">Cancel</button>
                <button type="submit" className="modal-btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
