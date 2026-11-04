import { useState, useEffect } from "react";
import api from "../../services/api";
import Badge from "../../components/ui/Badge.jsx";

export default function OrganizationManagement() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await api.get("/organizations");
      setOrganizations(res.data || []);
    } catch (err) {
      console.error("Failed to fetch organizations", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orgId, currentStatus) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await api.put(`/organizations/${orgId}/status?status_value=${newStatus}`);
      alert(`Organization status updated to ${newStatus}`);
      fetchOrganizations();
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  return (
    <section id="organization-management" className="page active">
      <div className="header">
        <div>
          <h1 className="title">Organization Management</h1>
          <p className="subtitle">
            Platform control: Monitor registered company tenants, organizations and operational status.
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", padding: "40px", color: "rgba(244, 245, 243, 0.5)" }}>Loading organizations...</p>
      ) : (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Organization Name</th>
                <th>Business Type</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td style={{ color: "rgba(244, 245, 243, 0.5)", fontFamily: "monospace" }}>#{org.id}</td>
                  <td style={{ fontWeight: 600 }}>{org.name}</td>
                  <td style={{ color: "rgba(244, 245, 243, 0.8)" }}>{org.organization_type}</td>
                  <td>
                    <Badge color={org.status === "active" ? "green" : "red"}>
                      {org.status?.toUpperCase() || "ACTIVE"}
                    </Badge>
                  </td>
                  <td style={{ color: "rgba(244, 245, 243, 0.7)", whiteSpace: "nowrap" }}>
                    {org.created_at ? new Date(org.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    <button
                      onClick={() => handleStatusChange(org.id, org.status)}
                      className={`btn btn-sm ${org.status === "active" ? "danger" : "success"}`}
                    >
                      {org.status === "active" ? "Suspend Tenant" : "Activate Tenant"}
                    </button>
                  </td>
                </tr>
              ))}

              {organizations.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "rgba(244, 245, 243, 0.4)" }}>
                    No organizations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
