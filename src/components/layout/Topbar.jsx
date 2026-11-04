import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";

export default function Topbar({ onToggleSidebar = () => {} }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const userName = user?.name || (user?.role === "super_admin" ? "Super Admin" : "Organization Admin");
  const userOrg = user?.organization_name || "Aminoid Technologies";
  const userInitial = "OA";

  const [theme, setTheme] = useState(() => localStorage.getItem("app_theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search"
            placeholder="Search calls, appointments, users..."
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </div>

      <div className="topbar-right">
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === "light" ? "Dark" : "Light"} Theme`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>

        <div className="notification-bell" title="Notifications">
          🔔
          <span className="notification-dot" />
        </div>

        <div className="profile">
          <div className="avatar">{userInitial}</div>
          <div className="profile-info">
            <strong className="profile-name">{userName}</strong>
            <small className="profile-org">{userOrg}</small>
          </div>
        </div>

        <button
          type="button"
          className="btn primary topbar-action-btn"
          onClick={() => navigate("/admin/live-calls")}
          title="View Live Calls"
        >
          <span>📞</span>
          <span className="topbar-action-text">View Live Calls →</span>
        </button>
      </div>
    </header>
  );
}
