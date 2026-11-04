import { useState, useMemo } from "react";
import { Building2, Plus, Search, Filter, Edit3, Trash2, Users, CheckCircle2, XCircle } from "lucide-react";
import Badge from "../../components/ui/Badge.jsx";
import useApi from "../../hooks/useApi.js";
import useAuth from "../../hooks/useAuth.js";
import departmentService from "../../services/department.service.js";
import staffService from "../../services/staff.service.js";
import AddDepartmentModal from "../../components/modals/AddDepartmentModal.jsx";

const STATUS_COLOR = { Active: "green", Inactive: "red" };

export default function Departments() {
  const { user } = useAuth();
  const { data: departments, reload: reloadDepts, loading: loadingDepts } = useApi(departmentService.getAll, [], []);

  const { data: staffList } = useApi(staffService.getAll, [], []);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);

  // Map staff count per department
  const staffCountMap = useMemo(() => {
    const map = {};
    if (Array.isArray(staffList)) {
      staffList.forEach((s) => {
        if (s.department) {
          map[s.department] = (map[s.department] || 0) + 1;
        }
      });
    }
    return map;
  }, [staffList]);

  // Filtering
  const filteredDepartments = useMemo(() => {
    if (!Array.isArray(departments)) return [];
    return departments.filter((d) => {
      const matchSearch =
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.code && d.code.toLowerCase().includes(search.toLowerCase())) ||
        (d.head_of_department && d.head_of_department.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === "all" || d.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [departments, search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!Array.isArray(departments)) return { total: 0, active: 0, inactive: 0 };
    return {
      total: departments.length,
      active: departments.filter((d) => d.status === "Active").length,
      inactive: departments.filter((d) => d.status === "Inactive").length,
    };
  }, [departments]);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleSaveDepartment = async (formData) => {
    try {
      if (editingDept) {
        await departmentService.update(editingDept.id, formData);
      } else {
        await departmentService.create(formData);
      }
      if (reloadDepts) reloadDepts();
      setIsModalOpen(false);
      setEditingDept(null);
    } catch (err) {
      console.error("Failed to save department:", err);
      throw err;
    }
  };

  const handleDelete = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete department "${dept.name}"?`)) return;
    try {
      await departmentService.remove(dept.id);
      if (reloadDepts) reloadDepts();
    } catch (err) {
      console.error("Failed to delete department:", err);
      alert("Failed to delete department: " + (err?.response?.data?.detail || err.message));
    }
  };

  return (
    <section id="departments" className="page active">
      {/* Page Header */}
      <div className="header">
        <div>
          <h1 className="title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Building2 size={26} color="var(--primary)" />
            Department Management
          </h1>
          <p className="subtitle">
            Private organizational departments and medical specialties for <strong>{user?.organization_name || user?.name || "your organization"}</strong>
          </p>

        </div>

        <button className="btn primary" onClick={handleOpenAdd} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Plus size={16} />
          Add Department
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="cards" style={{ marginBottom: "20px", gap: "16px" }}>
        <div className="card shadow-sm" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 600 }}>Total Departments</span>
            <Building2 size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--heading)", marginTop: "6px" }}>{stats.total}</div>
        </div>

        <div className="card shadow-sm" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 600 }}>Active Departments</span>
            <CheckCircle2 size={18} color="#16a34a" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#16a34a", marginTop: "6px" }}>{stats.active}</div>
        </div>

        <div className="card shadow-sm" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 600 }}>Inactive Departments</span>
            <XCircle size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "#ef4444", marginTop: "6px" }}>{stats.inactive}</div>
        </div>

        <div className="card shadow-sm" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--muted)", fontSize: "13px", fontWeight: 600 }}>Staff Members</span>
            <Users size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--heading)", marginTop: "6px" }}>{staffList?.length || 0}</div>
        </div>
      </div>

      {/* Toolbar / Search & Filter */}
      <div className="card shadow-sm" style={{ padding: "14px 18px", marginBottom: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1", minWidth: "260px" }}>
            <Search size={16} color="var(--muted)" />
            <input
              type="text"
              placeholder="Search by department name, code, or HOD..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                color: "var(--fg)",
                fontSize: "14px"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Filter size={16} color="var(--muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
                color: "var(--fg)",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <div className="table card shadow-sm">
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Code</th>
              <th>Head of Dept / Contact</th>
              <th>Assigned Staff</th>
              <th>Description</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDepartments.map((d) => {
              const assignedCount = staffCountMap[d.name] || 0;
              return (
                <tr key={d.id}>
                  <td>
                    <strong style={{ color: "var(--heading)", fontWeight: "700", display: "block" }}>{d.name}</strong>
                  </td>
                  <td>
                    {d.code ? (
                      <span className="badge blue" style={{ fontFamily: "monospace", fontWeight: "700" }}>{d.code}</span>
                    ) : (
                      <span style={{ color: "var(--faint)" }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                      {d.head_of_department && <div style={{ color: "var(--heading)", fontWeight: "600" }}>👤 {d.head_of_department}</div>}
                      {d.phone && <div style={{ color: "var(--muted)" }}>📞 {d.phone}</div>}
                      {d.email && <div style={{ color: "var(--muted)" }}>✉ {d.email}</div>}
                      {!d.head_of_department && !d.phone && !d.email && <span style={{ color: "var(--faint)" }}>—</span>}
                    </div>
                  </td>
                  <td>
                    <span className="badge gray" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Users size={12} />
                      {assignedCount} {assignedCount === 1 ? "Staff" : "Staff"}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "13px", maxWidth: "280px" }}>
                    {d.description || <span style={{ color: "var(--faint)" }}>No description provided</span>}
                  </td>
                  <td>
                    <Badge color={STATUS_COLOR[d.status] || "blue"}>{d.status}</Badge>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => handleOpenEdit(d)}
                        title="Edit Department"
                        style={{ padding: "4px 8px" }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="btn btn-sm danger"
                        onClick={() => handleDelete(d)}
                        title="Delete Department"
                        style={{ padding: "4px 8px" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredDepartments.length === 0 && !loadingDepts && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  No departments found. Click "+ Add Department" to create one.
                </td>
              </tr>
            )}

            {loadingDepts && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  Loading departments directory...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Department Modal */}
      <AddDepartmentModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingDept(null); }}
        onSave={handleSaveDepartment}
        editingDept={editingDept}
      />
    </section>
  );
}
