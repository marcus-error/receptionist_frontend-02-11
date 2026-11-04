import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";
import {
  Crown,
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  Radio,
  BarChart3,
  Settings,
  ClipboardList,
  BookOpen,
  LogOut
} from "lucide-react";

export default function SuperAdminSidebar({ isOpen = false, onClose = () => {} }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    onClose();
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <div className={`sidebar-backdrop${isOpen ? " open" : ""}`} onClick={onClose} />
      <aside
        className={`sidebar${isOpen ? " open" : ""}`}
        style={{ background: "#0b0f19", borderRight: "1px solid rgba(124, 104, 255, 0.25)" }}
      >
        <div className="logo" style={{ color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
          <Crown size={22} color="#f59e0b" />
          <span style={{ fontSize: "17px", fontWeight: "700" }}>Super Admin</span>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>

        <div className="sidebar-user-badge" style={{ padding: "0 20px 14px", fontSize: "12px", color: "#94a3b8" }}>
          Logged in as: <strong style={{ color: "#a78bfa" }}>{user?.name || "Super Admin"}</strong>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/super-admin/dashboard" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon"><LayoutDashboard size={18} /></span>
            <span>Platform Overview</span>
          </NavLink>

          <NavLink to="/super-admin/organizations" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon"><Building2 size={18} /></span>
            <span>Organizations</span>
          </NavLink>

          <NavLink to="/super-admin/admins" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon"><Users size={18} /></span>
            <span>Admins & Users</span>
          </NavLink>

          <NavLink to="/super-admin/permissions" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon"><ShieldCheck size={18} /></span>
            <span>Permissions Matrix</span>
          </NavLink>

          <NavLink to="/super-admin/subscriptions" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon"><CreditCard size={18} /></span>
            <span>Subscriptions</span>
          </NavLink>

          <NavLink to="/super-admin/calls" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon"><Radio size={18} /></span>
            <span>Call Monitoring</span>
          </NavLink>

          <NavLink to="/super-admin/reports" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon"><BarChart3 size={18} /></span>
            <span>Platform Reports</span>
          </NavLink>

          <NavLink to="/super-admin/audit-logs" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon"><ClipboardList size={18} /></span>
            <span>Audit Logs</span>
          </NavLink>

          <NavLink to="/super-admin/rag-upload" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon"><BookOpen size={18} /></span>
            <span>Platform RAG Upload</span>
          </NavLink>

          <NavLink to="/super-admin/settings" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
            <span className="nav-icon"><Settings size={18} /></span>
            <span>System Settings</span>
          </NavLink>
        </nav>

        <div className="sidebar-logout">
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <LogOut size={16} />
            <span>Logout Super Admin</span>
          </button>
        </div>
      </aside>
    </>
  );
}

