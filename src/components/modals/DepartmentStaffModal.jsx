import { useState, useEffect, useMemo } from "react";
import { Users, UserPlus, Trash2, Search, CheckCircle2, AlertCircle, X, Shield, Phone, Mail, Clock } from "lucide-react";
import Badge from "../ui/Badge.jsx";
import departmentService from "../../services/department.service.js";
import staffService from "../../services/staff.service.js";

const STATUS_COLOR = { Available: "green", Busy: "yellow", Offline: "red" };

export default function DepartmentStaffModal({ isOpen, onClose, department, onStaffUpdated }) {
  const [assignedStaff, setAssignedStaff] = useState([]);
  const [allOrgStaff, setAllOrgStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchAssigned, setSearchAssigned] = useState("");
  const [searchAvailable, setSearchAvailable] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [removingStaffId, setRemovingStaffId] = useState(null);
  const [activeTab, setActiveTab] = useState("assigned"); // "assigned" | "add"
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    if (!department?.id) return;
    try {
      setLoading(true);
      setError("");
      const [deptStaff, orgStaff] = await Promise.all([
        departmentService.getStaff(department.id),
        staffService.getAll()
      ]);
      setAssignedStaff(Array.isArray(deptStaff) ? deptStaff : []);
      setAllOrgStaff(Array.isArray(orgStaff) ? orgStaff : []);
      setSelectedStaffIds([]);
    } catch (err) {
      console.error("Failed to load department staff data:", err);
      setError(err?.response?.data?.detail || "Failed to load staff list. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && department?.id) {
      setActiveTab("assigned");
      setSearchAssigned("");
      setSearchAvailable("");
      setError("");
      setSuccessMsg("");
      loadData();
    }
  }, [isOpen, department?.id]);

  // Set of assigned staff IDs
  const assignedStaffIds = useMemo(() => {
    return new Set(assignedStaff.map((s) => s.staff_id || s.id));
  }, [assignedStaff]);

  // Available staff in organization who are not yet assigned to this department
  const availableStaff = useMemo(() => {
    if (!Array.isArray(allOrgStaff)) return [];
    return allOrgStaff.filter((s) => !assignedStaffIds.has(s.id));
  }, [allOrgStaff, assignedStaffIds]);

  // Filtered assigned staff
  const filteredAssigned = useMemo(() => {
    if (!searchAssigned.trim()) return assignedStaff;
    const q = searchAssigned.toLowerCase();
    return assignedStaff.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        String(s.staff_id || s.id).includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.role?.toLowerCase().includes(q)
    );
  }, [assignedStaff, searchAssigned]);

  // Filtered available staff for assignment
  const filteredAvailable = useMemo(() => {
    if (!searchAvailable.trim()) return availableStaff;
    const q = searchAvailable.toLowerCase();
    return availableStaff.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.department?.toLowerCase().includes(q)
    );
  }, [availableStaff, searchAvailable]);

  if (!isOpen || !department) return null;

  const handleToggleSelectStaff = (id) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllAvailable = () => {
    if (selectedStaffIds.length === filteredAvailable.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(filteredAvailable.map((s) => s.id));
    }
  };

  const handleAssignSelected = async () => {
    if (selectedStaffIds.length === 0) return;
    setError("");
    setSuccessMsg("");
    try {
      setIsAssigning(true);
      await departmentService.assignStaff(department.id, selectedStaffIds);
      setSuccessMsg(`Successfully assigned ${selectedStaffIds.length} staff member${selectedStaffIds.length > 1 ? "s" : ""} to ${department.name}.`);
      await loadData();
      setActiveTab("assigned");
      if (onStaffUpdated) onStaffUpdated();
    } catch (err) {
      console.error("Failed to assign staff:", err);
      setError(err?.response?.data?.detail || "Failed to assign staff to department. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignSingle = async (staffId) => {
    setError("");
    setSuccessMsg("");
    try {
      setIsAssigning(true);
      await departmentService.assignStaff(department.id, [staffId]);
      setSuccessMsg("Staff member assigned successfully.");
      await loadData();
      if (onStaffUpdated) onStaffUpdated();
    } catch (err) {
      console.error("Failed to assign staff:", err);
      setError(err?.response?.data?.detail || "Failed to assign staff. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveStaff = async (staffItem) => {
    const targetId = staffItem.staff_id || staffItem.id;
    const confirmPrompt = `Are you sure you want to remove ${staffItem.name} from "${department.name}"?\n\nNote: The employee record will NOT be deleted from the system.`;
    if (!window.confirm(confirmPrompt)) return;

    setError("");
    setSuccessMsg("");
    try {
      setRemovingStaffId(targetId);
      await departmentService.removeStaff(department.id, targetId);
      setSuccessMsg(`Removed ${staffItem.name} from ${department.name}.`);
      await loadData();
      if (onStaffUpdated) onStaffUpdated();
    } catch (err) {
      console.error("Failed to remove staff:", err);
      setError(err?.response?.data?.detail || "Failed to remove staff member. Please try again.");
    } finally {
      setRemovingStaffId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "840px",
          width: "95%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ borderBottom: "1px solid var(--line)" }}>
          <div>
            <h2 className="modal-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Users size={22} color="var(--primary)" />
              <span>Department Staff: <strong>{department.name}</strong></span>
              {department.code && <span className="badge blue" style={{ fontFamily: "monospace" }}>{department.code}</span>}
            </h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13px" }}>
              Manage multiple employees, doctors, nurses, and receptionists assigned to this department.
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} type="button">×</button>
        </div>

        {/* Department Overview Banner */}
        <div
          style={{
            padding: "12px 20px",
            background: "var(--panel-card, #ffffff)",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13px"
          }}
        >
          <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <span style={{ color: "var(--muted)" }}>Head of Dept: </span>
              <strong style={{ color: "var(--heading)" }}>{department.head_of_department || "Not Specified"}</strong>
            </div>
            {department.phone && (
              <div>
                <span style={{ color: "var(--muted)" }}>Phone: </span>
                <span style={{ color: "var(--fg)" }}>{department.phone}</span>
              </div>
            )}
            {department.email && (
              <div>
                <span style={{ color: "var(--muted)" }}>Email: </span>
                <span style={{ color: "var(--fg)" }}>{department.email}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="badge gray" style={{ fontWeight: 700 }}>
              {assignedStaff.length} {assignedStaff.length === 1 ? "Staff Member" : "Staff Members"} Assigned
            </span>
            <Badge color={department.status === "Active" ? "green" : "red"}>{department.status}</Badge>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: "flex", padding: "10px 20px 0", borderBottom: "1px solid var(--line)", background: "var(--line-light)" }}>
          <button
            type="button"
            onClick={() => setActiveTab("assigned")}
            style={{
              padding: "8px 18px",
              border: "none",
              borderBottom: activeTab === "assigned" ? "2px solid var(--primary)" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "assigned" ? "var(--primary)" : "var(--muted)",
              fontWeight: activeTab === "assigned" ? "700" : "500",
              cursor: "pointer",
              fontSize: "13.5px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Users size={16} />
            <span>Assigned Staff ({assignedStaff.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("add")}
            style={{
              padding: "8px 18px",
              border: "none",
              borderBottom: activeTab === "add" ? "2px solid var(--primary)" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "add" ? "var(--primary)" : "var(--muted)",
              fontWeight: activeTab === "add" ? "700" : "500",
              cursor: "pointer",
              fontSize: "13.5px",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <UserPlus size={16} />
            <span>+ Add Staff to Department ({availableStaff.length} Available)</span>
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div style={{ margin: "12px 20px 0", padding: "10px 14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px", color: "#ef4444", fontSize: "13px" }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ margin: "12px 20px 0", padding: "10px 14px", background: "rgba(22, 163, 74, 0.1)", border: "1px solid rgba(22, 163, 74, 0.3)", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px", color: "#16a34a", fontSize: "13px" }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)", fontSize: "14px" }}>
              Loading staff assignments...
            </div>
          ) : activeTab === "assigned" ? (
            /* ================= ASSIGNED STAFF VIEW ================= */
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "6px", padding: "6px 12px" }}>
                  <Search size={14} color="var(--muted)" />
                  <input
                    type="text"
                    placeholder="Filter assigned staff by name, ID, role..."
                    value={searchAssigned}
                    onChange={(e) => setSearchAssigned(e.target.value)}
                    style={{ border: "none", outline: "none", background: "transparent", width: "100%", color: "var(--fg)", fontSize: "13px" }}
                  />
                  {searchAssigned && (
                    <button type="button" onClick={() => setSearchAssigned("")} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setActiveTab("add")}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "6px 14px" }}
                >
                  <UserPlus size={14} />
                  <span>Assign More Staff</span>
                </button>
              </div>

              {filteredAssigned.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 20px", background: "var(--line-light)", borderRadius: "8px", border: "1px dashed var(--line)" }}>
                  <Users size={32} color="var(--muted)" style={{ marginBottom: "8px" }} />
                  <h4 style={{ margin: "0 0 6px", color: "var(--heading)", fontSize: "15px" }}>No Staff Assigned Yet</h4>
                  <p style={{ margin: "0 0 14px", color: "var(--muted)", fontSize: "13px" }}>
                    {searchAssigned ? "No staff match your search criteria." : `Add existing employees to the ${department.name} department to enable AI booking and routing.`}
                  </p>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setActiveTab("add")}
                    style={{ fontSize: "13px" }}
                  >
                    + Add Staff to Department
                  </button>
                </div>
              ) : (
                <div className="table" style={{ border: "1px solid var(--line)", borderRadius: "8px" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Role / Designation</th>
                        <th>Contact</th>
                        <th>Working Hours</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAssigned.map((s) => {
                        const targetId = s.staff_id || s.id;
                        return (
                          <tr key={targetId}>
                            <td style={{ fontFamily: "monospace", color: "var(--muted)", fontSize: "12px" }}>
                              #{targetId}
                            </td>
                            <td>
                              <strong style={{ color: "var(--heading)", display: "block" }}>{s.name}</strong>
                            </td>
                            <td>
                              <span style={{ color: "var(--fg)", fontSize: "12.5px" }}>{s.role || "Staff Member"}</span>
                            </td>
                            <td>
                              <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
                                {s.email && <div style={{ color: "var(--fg)" }}>✉ {s.email}</div>}
                                {s.phone && <div style={{ color: "var(--muted)" }}>📞 {s.phone}</div>}
                                {!s.email && !s.phone && <span style={{ color: "var(--faint)" }}>—</span>}
                              </div>
                            </td>
                            <td style={{ color: "var(--muted)", fontSize: "12px" }}>
                              {s.working_hours || "09:00-18:00"}
                            </td>
                            <td>
                              <Badge color={STATUS_COLOR[s.status] || "blue"}>{s.status || "Available"}</Badge>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <button
                                type="button"
                                className="btn btn-sm danger"
                                onClick={() => handleRemoveStaff(s)}
                                disabled={removingStaffId === targetId}
                                title="Remove staff from this department (does not delete employee)"
                                style={{ padding: "4px 8px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              >
                                <Trash2 size={13} />
                                <span>{removingStaffId === targetId ? "Removing..." : "Remove"}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ================= ASSIGN NEW STAFF VIEW ================= */
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "6px", padding: "6px 12px" }}>
                  <Search size={14} color="var(--muted)" />
                  <input
                    type="text"
                    placeholder="Search available employees by name, ID, email..."
                    value={searchAvailable}
                    onChange={(e) => setSearchAvailable(e.target.value)}
                    style={{ border: "none", outline: "none", background: "transparent", width: "100%", color: "var(--fg)", fontSize: "13px" }}
                  />
                  {searchAvailable && (
                    <button type="button" onClick={() => setSearchAvailable("")} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {filteredAvailable.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={handleSelectAllAvailable}
                      style={{ fontSize: "12px" }}
                    >
                      {selectedStaffIds.length === filteredAvailable.length ? "Deselect All" : "Select All"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn primary"
                    onClick={handleAssignSelected}
                    disabled={selectedStaffIds.length === 0 || isAssigning}
                    style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "6px 16px" }}
                  >
                    <UserPlus size={14} />
                    <span>{isAssigning ? "Assigning..." : `Assign Selected (${selectedStaffIds.length})`}</span>
                  </button>
                </div>
              </div>

              {filteredAvailable.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 20px", background: "var(--line-light)", borderRadius: "8px", border: "1px dashed var(--line)" }}>
                  <CheckCircle2 size={32} color="#16a34a" style={{ marginBottom: "8px" }} />
                  <h4 style={{ margin: "0 0 6px", color: "var(--heading)", fontSize: "15px" }}>All Employees Assigned</h4>
                  <p style={{ margin: "0 0 14px", color: "var(--muted)", fontSize: "13px" }}>
                    {searchAvailable
                      ? "No available employees match your search."
                      : "All current employees in your organization are already assigned to this department."}
                  </p>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setActiveTab("assigned")}
                    style={{ fontSize: "13px" }}
                  >
                    ← Back to Assigned Staff
                  </button>
                </div>
              ) : (
                <div className="table" style={{ border: "1px solid var(--line)", borderRadius: "8px" }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "38px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={filteredAvailable.length > 0 && selectedStaffIds.length === filteredAvailable.length}
                            onChange={handleSelectAllAvailable}
                            style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                          />
                        </th>
                        <th>Employee ID</th>
                        <th>Name</th>
                        <th>Primary Dept</th>
                        <th>Contact</th>
                        <th>Working Hours</th>
                        <th style={{ textAlign: "right" }}>Direct Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAvailable.map((emp) => {
                        const isSelected = selectedStaffIds.includes(emp.id);
                        return (
                          <tr
                            key={emp.id}
                            style={{
                              backgroundColor: isSelected ? "rgba(2, 132, 199, 0.05)" : undefined,
                              cursor: "pointer"
                            }}
                            onClick={() => handleToggleSelectStaff(emp.id)}
                          >
                            <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectStaff(emp.id)}
                                style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                              />
                            </td>
                            <td style={{ fontFamily: "monospace", color: "var(--muted)", fontSize: "12px" }}>
                              #{emp.id}
                            </td>
                            <td>
                              <strong style={{ color: "var(--heading)", display: "block" }}>{emp.name}</strong>
                            </td>
                            <td>
                              <span className="badge gray">{emp.department || "General"}</span>
                            </td>
                            <td>
                              <div style={{ fontSize: "12px", lineHeight: "1.4" }}>
                                {emp.email && <div style={{ color: "var(--fg)" }}>✉ {emp.email}</div>}
                                {emp.phone && <div style={{ color: "var(--muted)" }}>📞 {emp.phone}</div>}
                                {!emp.email && !emp.phone && <span style={{ color: "var(--faint)" }}>—</span>}
                              </div>
                            </td>
                            <td style={{ color: "var(--muted)", fontSize: "12px" }}>
                              {emp.working_hours || "09:00-18:00"}
                            </td>
                            <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="btn btn-sm primary"
                                onClick={() => handleAssignSingle(emp.id)}
                                disabled={isAssigning}
                                style={{ padding: "4px 10px", fontSize: "12px" }}
                              >
                                + Assign
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: "1px solid var(--line)" }}>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

