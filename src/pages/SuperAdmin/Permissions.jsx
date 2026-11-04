import { useState, useEffect } from "react";
import api from "../../services/api.js";

const ALL_AVAILABLE_PERMISSIONS = [
  { id: "dashboard", label: "Dashboard Overview", category: "Core" },
  { id: "calls", label: "Calls & Telephony Streams", category: "Voice" },
  { id: "live_calls", label: "Live Call Answering & Monitoring", category: "Voice" },
  { id: "recordings", label: "Call Recordings & Audio Transcripts", category: "Voice" },
  { id: "appointments", label: "Appointments Booking", category: "Calendar" },
  { id: "calendar", label: "Calendar Synchronization", category: "Calendar" },
  { id: "staff", label: "Staff Directory", category: "Management" },
  { id: "knowledge_base", label: "RAG Knowledge Base & FAQ Documents", category: "AI & RAG" },
  { id: "reports", label: "Overall Analytics & Reports", category: "Analytics" },
  { id: "telephony", label: "Twilio Telephony Config", category: "Integrations" },
  { id: "whatsapp", label: "WhatsApp Channel", category: "Integrations" },
  { id: "email", label: "Email Notifications", category: "Integrations" },
  { id: "crm", label: "CRM Integration", category: "Integrations" },
  { id: "settings", label: "Settings", category: "Core" },
  { id: "user_management", label: "User Management", category: "Management" }
];

export default function PermissionsManager() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [enabledPermissions, setEnabledPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      const list = res.data || [];
      const adminUsers = list.filter(u => u.role === "admin");
      setUsers(adminUsers);
      if (adminUsers.length > 0) {
        selectUser(adminUsers[0]);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectUser = (usr) => {
    setSelectedUser(usr);
    setEnabledPermissions(usr.permissions || []);
    setMessage("");
  };

  const handleTogglePermission = (permId) => {
    if (enabledPermissions.includes(permId)) {
      setEnabledPermissions(enabledPermissions.filter(p => p !== permId));
    } else {
      setEnabledPermissions([...enabledPermissions, permId]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    setMessage("");

    try {
      await api.put(`/users/${selectedUser.id}/permissions`, {
        permissions: enabledPermissions
      });
      setMessage("✅ Permissions updated successfully!");
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, permissions: enabledPermissions } : u));
    } catch (err) {
      setMessage("❌ Failed to save permissions: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="super-admin-permissions" className="page active">
      <div className="header">
        <div>
          <h1 className="title">🔐 Role & Permissions Governance</h1>
          <p className="subtitle">
            Dynamically grant or revoke feature module access for Organization Admins.
          </p>
        </div>
      </div>

      <div className="grid2" style={{ gap: "24px" }}>
        {/* User Selection Sidebar */}
        <div className="card">
          <h3 className="card-title">Select Admin User</h3>

          {loading ? (
            <p className="text-secondary" style={{ fontSize: "13px", opacity: 0.6 }}>Loading admins...</p>
          ) : users.length === 0 ? (
            <p className="text-secondary" style={{ fontSize: "13px", opacity: 0.5 }}>No admin accounts found</p>
          ) : (
            users.map((usr) => (
              <div
                key={usr.id}
                onClick={() => selectUser(usr)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: selectedUser?.id === usr.id ? "rgba(183, 255, 92, 0.12)" : "rgba(244, 245, 243, 0.03)",
                  border: `1px solid ${selectedUser?.id === usr.id ? "rgba(183, 255, 92, 0.3)" : "rgba(244, 245, 243, 0.08)"}`,
                  marginBottom: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <div style={{ fontWeight: "600", color: selectedUser?.id === usr.id ? "var(--text-primary, #b7ff5c)" : "var(--text-primary, inherit)", fontSize: "14px" }}>
                  {usr.name}
                </div>
                <div className="text-secondary" style={{ fontSize: "12px", marginTop: "2px", opacity: 0.8 }}>{usr.email}</div>
                <div className="text-secondary" style={{ fontSize: "11px", marginTop: "4px", opacity: 0.6 }}>
                  Org #{usr.organization_id || "Platform"}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Permission Checkbox Matrix */}
        {selectedUser ? (
          <div className="card">
            <div className="header" style={{ marginBottom: "18px" }}>
              <div>
                <h3 className="card-title">Permissions for {selectedUser.name}</h3>
                <p className="subtitle" style={{ fontSize: "13px", marginTop: "2px" }}>
                  Check modules to grant access. Unchecked modules are hidden from the admin sidebar.
                </p>
              </div>

              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="btn primary"
              >
                {saving ? "Saving..." : "Save Permissions"}
              </button>
            </div>

            {message && (
              <div style={{
                padding: "12px 16px",
                borderRadius: "10px",
                background: message.includes("✅") ? "rgba(183, 255, 92, 0.15)" : "rgba(244, 63, 94, 0.15)",
                border: `1px solid ${message.includes("✅") ? "rgba(183, 255, 92, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                color: message.includes("✅") ? "#b7ff5c" : "#f87171",
                marginBottom: "20px",
                fontSize: "13.5px",
                fontWeight: "600"
              }}>
                {message}
              </div>
            )}

            <div className="form-grid" style={{ gap: "12px" }}>
              {ALL_AVAILABLE_PERMISSIONS.map((perm) => {
                const isChecked = enabledPermissions.includes(perm.id);
                return (
                  <label
                    key={perm.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      background: isChecked ? "rgba(183, 255, 92, 0.08)" : "rgba(7, 8, 9, 0.6)",
                      border: `1px solid ${isChecked ? "rgba(183, 255, 92, 0.25)" : "rgba(244, 245, 243, 0.1)"}`,
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePermission(perm.id)}
                      style={{ width: "18px", height: "18px", minHeight: "18px", accentColor: "#b7ff5c", flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: "600", color: "var(--text-primary, inherit)", fontSize: "13.5px" }}>{perm.label}</div>
                      <div className="text-secondary" style={{ fontSize: "11px", opacity: 0.6 }}>Key: {perm.id}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card text-secondary" style={{ padding: "40px", textAlign: "center", opacity: 0.6 }}>
            No Admin user selected.
          </div>
        )}
      </div>
    </section>
  );
}
