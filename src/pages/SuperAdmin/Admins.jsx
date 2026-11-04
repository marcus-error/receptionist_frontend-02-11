import { useState, useEffect } from "react";
import api from "../../services/api.js";
import Badge from "../../components/ui/Badge.jsx";

export default function AdminsManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="super-admin-admins" className="page active">
      <div className="header">
        <div>
          <h1 className="title">👥 Admin User Accounts</h1>
          <p className="subtitle">
            View and manage admin accounts associated with platform tenant organizations.
          </p>
        </div>
      </div>

      <div className="table">
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Organization ID</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="text-secondary" style={{ fontFamily: "monospace", opacity: 0.7 }}>#{u.id}</td>
                <td style={{ fontWeight: "600" }}>{u.name}</td>
                <td className="text-secondary" style={{ opacity: 0.8 }}>{u.email}</td>
                <td>
                  <Badge color={u.role === "super_admin" ? "purple" : "blue"}>
                    {u.role?.toUpperCase()}
                  </Badge>
                </td>
                <td className="text-secondary" style={{ opacity: 0.7 }}>
                  {u.organization_id ? `#${u.organization_id}` : "Platform (Global)"}
                </td>
                <td>
                  <Badge color={u.is_active ? "green" : "red"}>
                    {u.is_active ? "Active" : "Disabled"}
                  </Badge>
                </td>
              </tr>
            ))}

            {users.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="text-secondary" style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
                  No admin accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
