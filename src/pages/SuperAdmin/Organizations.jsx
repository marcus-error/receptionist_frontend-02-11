import { useState, useEffect } from "react";
import api from "../../services/api.js";
import Badge from "../../components/ui/Badge.jsx";
import { ShieldCheck, Building2, Eye, CheckCircle, Clock, AlertTriangle, Trash2 } from "lucide-react";

export default function OrganizationsManager() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKycOrg, setSelectedKycOrg] = useState(null);

  // Delete Organization State
  const [deleteTargetOrg, setDeleteTargetOrg] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [newOrg, setNewOrg] = useState({
    name: "",
    organization_type: "Clinic / Dental",
    admin_name: "",
    admin_email: "",
    admin_password: "",
    official_email: "",
    contact_person: "",
    gst_number: "",
    contact_phone: "",
    full_address: "",
    tax_id: "",
    pan_number: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
    identity_proof_type: "GST Certificate",
    identity_proof_number: ""
  });

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/organizations");
      setOrganizations(res.data || []);
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (orgId, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      await api.put(`/organizations/${orgId}/status?status_value=${nextStatus}`);
      fetchOrganizations();
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleUpdateKycStatus = async (orgId, kycStatus) => {
    try {
      await api.put(`/organizations/${orgId}/kyc-status?kyc_status=${kycStatus}`);
      if (selectedKycOrg && selectedKycOrg.id === orgId) {
        setSelectedKycOrg((prev) => prev ? { ...prev, kyc_status: kycStatus } : null);
      }
      fetchOrganizations();
    } catch (err) {
      alert("Failed to update KYC status: " + err.message);
    }
  };

  const handleDeleteOrganization = async (e) => {
    if (e) e.preventDefault();
    if (!deleteTargetOrg || deleting) return;

    if (deleteConfirmName.trim() !== deleteTargetOrg.name.trim()) {
      setDeleteError("Typed organization name does not match.");
      return;
    }

    try {
      setDeleting(true);
      setDeleteError("");
      await api.delete(`/organizations/${deleteTargetOrg.id}`);
      setDeleteTargetOrg(null);
      setDeleteConfirmName("");
      await fetchOrganizations();
    } catch (err) {
      setDeleteError(err.message || "Failed to delete organization");
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    try {
      await api.post("/organizations/signup", newOrg);
      setShowCreateModal(false);
      setNewOrg({
        name: "",
        organization_type: "Clinic / Dental",
        admin_name: "",
        admin_email: "",
        admin_password: "",
        tax_id: "",
        pan_number: "",
        contact_phone: "",
        address: "",
        city: "",
        state: "",
        postal_code: "",
        identity_proof_type: "GST Certificate",
        identity_proof_number: ""
      });
      fetchOrganizations();
    } catch (err) {
      alert("Failed to create organization: " + err.message);
    }
  };

  const getKycBadge = (status) => {
    const s = (status || "verified").toLowerCase();
    if (s === "verified") return <Badge color="green">✓ Verified</Badge>;
    if (s === "pending") return <Badge color="yellow">⏳ Pending</Badge>;
    return <Badge color="red">✖ Rejected</Badge>;
  };

  return (
    <section id="super-admin-orgs" className="page active">
      <div className="header">
        <div>
          <h1 className="title">🏢 Organizations & KYC Management</h1>
          <p className="subtitle">
            Provision, inspect, and manage tenant organizations and verify business KYC compliance.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn primary"
        >
          + Provision New Organization
        </button>
      </div>

      {/* Organizations Table */}
      <div className="table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Organization Name</th>
              <th>Type</th>
              <th>KYC Status</th>
              <th>Tax ID / Phone</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <tr key={org.id}>
                <td className="text-secondary" style={{ fontFamily: "monospace", opacity: 0.7 }}>#{org.id}</td>
                <td style={{ fontWeight: "600" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>{org.name}</span>
                    {org.is_protected && (
                      <span
                        style={{
                          fontSize: "10.5px",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "#60a5fa",
                          border: "1px solid rgba(59, 130, 246, 0.3)"
                        }}
                        title="Protected Platform System Organization"
                      >
                        System
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-secondary" style={{ opacity: 0.8 }}>{org.organization_type}</td>
                <td>{getKycBadge(org.kyc_status)}</td>
                <td style={{ fontSize: "13px", color: "var(--muted)" }}>
                  <div>{org.tax_id || org.pan_number || "No Tax/PAN"}</div>
                  {org.contact_phone && <div style={{ fontSize: "11.5px", opacity: 0.7 }}>{org.contact_phone}</div>}
                </td>
                <td>
                  <Badge color={org.status === "active" ? "green" : "red"}>
                    {org.status}
                  </Badge>
                </td>
                <td>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button
                      onClick={() => setSelectedKycOrg(org)}
                      className="btn btn-sm"
                      style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                      title="Inspect KYC Details"
                    >
                      <Eye size={14} /> KYC Info
                    </button>
                    <button
                      onClick={() => handleToggleStatus(org.id, org.status)}
                      className={`btn btn-sm ${org.status === "active" ? "danger" : "success"}`}
                    >
                      {org.status === "active" ? "Suspend" : "Activate"}
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTargetOrg(org);
                        setDeleteConfirmName("");
                        setDeleteError("");
                      }}
                      className="btn btn-sm danger"
                      style={{
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        opacity: org.is_protected ? 0.4 : 1,
                        cursor: org.is_protected ? "not-allowed" : "pointer"
                      }}
                      title={org.is_protected ? "Protected System Organization (Cannot be deleted)" : `Delete ${org.name}`}
                      disabled={Boolean(org.is_protected)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {organizations.length === 0 && !loading && (
              <tr>
                <td colSpan="7" className="text-secondary" style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
                  No organizations found. Click "+ Provision New Organization" to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Inspect KYC Details Modal */}
      {selectedKycOrg && (
        <div className="modal-overlay" onClick={() => setSelectedKycOrg(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={20} color="#7c68ff" /> KYC Details: {selectedKycOrg.name}
              </h3>
              <button className="modal-close-btn" onClick={() => setSelectedKycOrg(null)}>✕</button>
            </div>

            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(124, 104, 255, 0.08)", padding: "12px 16px", borderRadius: "10px" }}>
                <div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>Current Verification Status</div>
                  <div style={{ marginTop: "4px" }}>{getKycBadge(selectedKycOrg.kyc_status)}</div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => handleUpdateKycStatus(selectedKycOrg.id, "verified")}
                    className="btn btn-sm success"
                    style={{ fontSize: "12px" }}
                  >
                    Set Verified
                  </button>
                  <button
                    onClick={() => handleUpdateKycStatus(selectedKycOrg.id, "pending")}
                    className="btn btn-sm"
                    style={{ fontSize: "12px" }}
                  >
                    Set Pending
                  </button>
                  <button
                    onClick={() => handleUpdateKycStatus(selectedKycOrg.id, "rejected")}
                    className="btn btn-sm danger"
                    style={{ fontSize: "12px" }}
                  >
                    Reject KYC
                  </button>
                </div>
              </div>

              <div className="modal-grid" style={{ gap: "12px", fontSize: "13px" }}>
                <div style={{ background: "#1e293b", padding: "10px 14px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Company Name</div>
                  <strong style={{ color: "#f8fafc" }}>{selectedKycOrg.name || "Not Provided"}</strong>
                </div>

                <div style={{ background: "#1e293b", padding: "10px 14px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Official Mail ID</div>
                  <strong style={{ color: "#f8fafc" }}>{selectedKycOrg.official_email || selectedKycOrg.admin_email || "Not Provided"}</strong>
                </div>

                <div style={{ background: "#1e293b", padding: "10px 14px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>GST Number</div>
                  <strong style={{ color: "#f8fafc" }}>{selectedKycOrg.gst_number || selectedKycOrg.tax_id || "Not Provided"}</strong>
                </div>

                <div style={{ background: "#1e293b", padding: "10px 14px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Contact Person</div>
                  <strong style={{ color: "#f8fafc" }}>{selectedKycOrg.contact_person || selectedKycOrg.admin_name || "Not Provided"}</strong>
                </div>

                <div style={{ background: "#1e293b", padding: "10px 14px", borderRadius: "8px", gridColumn: "span 2" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Phone Number</div>
                  <strong style={{ color: "#f8fafc" }}>{selectedKycOrg.contact_phone || "Not Provided"}</strong>
                </div>

                <div style={{ background: "#1e293b", padding: "10px 14px", borderRadius: "8px", gridColumn: "span 2" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>Full Address</div>
                  <strong style={{ color: "#f8fafc" }}>
                    {selectedKycOrg.full_address || [selectedKycOrg.address, selectedKycOrg.city, selectedKycOrg.state, selectedKycOrg.postal_code].filter(Boolean).join(", ") || "Not Provided"}
                  </strong>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: "10px" }}>
                <button type="button" onClick={() => setSelectedKycOrg(null)} className="btn">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Organization Confirmation Modal */}
      {deleteTargetOrg && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTargetOrg(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px", border: "1px solid rgba(239, 68, 68, 0.35)" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ef4444" }}>
                <Trash2 size={20} color="#ef4444" /> Delete Organization: {deleteTargetOrg.name}
              </h3>
              <button
                className="modal-close-btn"
                onClick={() => !deleting && setDeleteTargetOrg(null)}
                disabled={deleting}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "14px 16px", borderRadius: "10px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <strong style={{ color: "#f87171", fontSize: "14px" }}>Warning: Permanent & Irreversible Action</strong>
                    <p style={{ fontSize: "12.5px", color: "#fca5a5", marginTop: "6px", lineHeight: "1.5", margin: 0 }}>
                      This action will permanently delete <strong>{deleteTargetOrg.name}</strong> and all associated tenant data across the entire platform. This operation cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ background: "#0f172a", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "600", marginBottom: "6px" }}>
                  The following data will be permanently wiped:
                </div>
                <ul style={{ fontSize: "12px", color: "#cbd5e1", paddingLeft: "18px", margin: 0, lineHeight: "1.6" }}>
                  <li>Admin, staff, and user accounts, roles, and permissions</li>
                  <li>Call records, audio recordings (.wav), and AI conversation transcripts</li>
                  <li>Appointments, calendar sync configs, and reminder schedules</li>
                  <li>Knowledge base documents, receptionist scripts, and vector store embeddings</li>
                  <li>Inbound/outbound SIP telephony, Twilio, WhatsApp, CRM, and webhook configs</li>
                  <li>Workflows, logs, leads, departments, and subscription data</li>
                </ul>
              </div>

              <div>
                <label style={{ fontSize: "12.5px", color: "#e2e8f0", display: "block", marginBottom: "6px" }}>
                  To confirm permanent deletion, type the organization name: <strong style={{ color: "#ef4444" }}>{deleteTargetOrg.name}</strong>
                </label>
                <input
                  type="text"
                  placeholder={`Type "${deleteTargetOrg.name}" to confirm`}
                  value={deleteConfirmName}
                  onChange={(e) => {
                    setDeleteConfirmName(e.target.value);
                    if (deleteError) setDeleteError("");
                  }}
                  disabled={deleting}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: deleteConfirmName.trim() === deleteTargetOrg.name.trim() ? "1px solid #22c55e" : "1px solid rgba(239, 68, 68, 0.4)",
                    background: "rgba(15, 23, 42, 0.8)",
                    color: "#fff",
                    fontSize: "13px"
                  }}
                  autoFocus
                />
              </div>

              {deleteError && (
                <div style={{ color: "#ef4444", fontSize: "12.5px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "8px 12px", borderRadius: "6px" }}>
                  {deleteError}
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setDeleteTargetOrg(null)}
                  className="btn"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteOrganization}
                  className="btn danger"
                  disabled={deleteConfirmName.trim() !== deleteTargetOrg.name.trim() || deleting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: (deleteConfirmName.trim() !== deleteTargetOrg.name.trim() || deleting) ? 0.5 : 1,
                    cursor: (deleteConfirmName.trim() !== deleteTargetOrg.name.trim() || deleting) ? "not-allowed" : "pointer"
                  }}
                >
                  {deleting ? (
                    <>
                      <Clock size={14} className="spin" /> Deleting Organization...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Permanently Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Provision New Organization</h3>
              <button className="modal-close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            
            <form onSubmit={handleCreateOrg} style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="modal-grid" style={{ gap: "12px" }}>
                <div>
                  <label>Organization Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Health Clinic"
                    required
                    value={newOrg.name}
                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  />
                </div>

                <div>
                  <label>Business Type</label>
                  <select
                    value={newOrg.organization_type}
                    onChange={(e) => setNewOrg({ ...newOrg, organization_type: e.target.value })}
                  >
                    <option value="Clinic / Dental">Clinic / Dental</option>
                    <option value="Medical Practice">Medical Practice</option>
                    <option value="Law Firm">Law Firm</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="General">General Business</option>
                  </select>
                </div>

                <div>
                  <label>Admin Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. John Doe"
                    required
                    value={newOrg.admin_name}
                    onChange={(e) => setNewOrg({ ...newOrg, admin_name: e.target.value })}
                  />
                </div>

                <div>
                  <label>Admin Email</label>
                  <input
                    type="email"
                    placeholder="admin@organization.com"
                    required
                    value={newOrg.admin_email}
                    onChange={(e) => setNewOrg({ ...newOrg, admin_email: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label>Admin Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    required
                    value={newOrg.admin_password}
                    onChange={(e) => setNewOrg({ ...newOrg, admin_password: e.target.value })}
                  />
                </div>
              </div>

              {/* Optional KYC section matching Register page */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "12px", marginTop: "6px" }}>
                <h4 style={{ fontSize: "13px", color: "#38bdf8", marginBottom: "10px" }}>Business KYC Information (Optional)</h4>
                <div className="modal-grid" style={{ gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11.5px" }}>Official Mail ID</label>
                    <input
                      type="email"
                      placeholder="official@company.com"
                      value={newOrg.official_email}
                      onChange={(e) => setNewOrg({ ...newOrg, official_email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11.5px" }}>Contact Person Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={newOrg.contact_person}
                      onChange={(e) => setNewOrg({ ...newOrg, contact_person: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11.5px" }}>GST Number</label>
                    <input
                      type="text"
                      placeholder="33AAAAA0000A1Z5"
                      value={newOrg.gst_number}
                      onChange={(e) => setNewOrg({ ...newOrg, gst_number: e.target.value, tax_id: e.target.value })}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11.5px" }}>Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={newOrg.contact_phone}
                      onChange={(e) => setNewOrg({ ...newOrg, contact_phone: e.target.value })}
                    />
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ fontSize: "11.5px" }}>Full Business Address</label>
                    <input
                      type="text"
                      placeholder="Complete registered address with city, state & pincode"
                      value={newOrg.full_address}
                      onChange={(e) => setNewOrg({ ...newOrg, full_address: e.target.value, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn">
                  Cancel
                </button>
                <button type="submit" className="btn primary">
                  Provision Organization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
