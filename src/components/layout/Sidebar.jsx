import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";
import {
  LayoutDashboard,
  PhoneCall,
  Radio,
  Disc,
  MessageSquare,
  Headphones,
  Bot,
  CalendarCheck,
  CalendarDays,
  Users,
  Building2,
  Mic,

  Brain,
  BarChart3,
  TrendingUp,
  Lightbulb,
  Plug,
  Calendar,
  PhoneForwarded,
  MessageCircle,
  Mail,
  RefreshCw,
  UserCheck,
  Settings,
  Zap,
  LogOut,
  ChevronDown,
  ChevronRight,
  AudioWaveform,
  History,
  Webhook
} from "lucide-react";

function renderSidebarIcon(Icon, size = 18) {
  if (!Icon) return null;
  if (typeof Icon === "string") return Icon;
  const Component = Icon;
  return <Component size={size} />;
}

function ExpandableMenu({ icon: Icon, label, children, childPaths = [] }) {
  const location = useLocation();
  const isChildActive = childPaths.some((path) => location.pathname.startsWith(path));
  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) {
      setOpen(true);
    }
  }, [location.pathname, isChildActive]);

  return (
    <div className={`menu-group${open ? " open" : ""}${isChildActive ? " child-active" : ""}`}>
      <button className="menu-group-header" onClick={() => setOpen(!open)} type="button">
        <span className="nav-icon">{renderSidebarIcon(Icon, 18)}</span>
        <span className="menu-group-label">{label}</span>
        <span className={`chevron${open ? " open" : ""}`}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open && <div className="menu-group-children">{children}</div>}
    </div>
  );
}

function SubItem({ to, icon: Icon, label, onClick }) {
  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => "sub-nav-item" + (isActive ? " active" : "")}>
      <span className="sub-nav-icon">{renderSidebarIcon(Icon, 15)}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user, hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile sidebar on route change
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
      <aside className={`sidebar${isOpen ? " open" : ""}`}>
        <div className="logo">
          <div className="logo-icon">
            <AudioWaveform size={20} color="#ffffff" />
          </div>
          <div>
            <div className="logo-brand">Call<span>zenza</span></div>
            <div className="logo-tagline">Conversations that Work</div>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {/* Dashboard */}
          {hasPermission("dashboard") && (
            <NavLink to="/admin/dashboard" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <span className="nav-icon">
                <LayoutDashboard size={18} />
              </span>
              <span>Dashboard</span>
            </NavLink>
          )}

          {/* Calls — expandable */}
          {(hasPermission("calls") || hasPermission("live_calls") || hasPermission("recordings")) && (
            <div className="sidebar-section">
              <ExpandableMenu
                icon={PhoneCall}
                label="Calls"
                childPaths={["/admin/live-calls", "/admin/dialer", "/admin/call-recordings", "/admin/voice-history", "/admin/campaigns"]}
              >
                {(hasPermission("live_calls") || hasPermission("calls")) && <SubItem to="/admin/live-calls" icon={Radio} label="Live Inbound Calls" />}
                {hasPermission("calls") && <SubItem to="/admin/dialer" icon={PhoneCall} label="SIP Dialer" />}
                {hasPermission("calls") && <SubItem to="/admin/campaigns" icon={PhoneCall} label="Outbound Campaigns" />}
                {hasPermission("recordings") && <SubItem to="/admin/call-recordings" icon={Disc} label="Call Recordings" />}
                {hasPermission("calls") && <SubItem to="/admin/voice-history" icon={Headphones} label="Voice History" />}
              </ExpandableMenu>
            </div>
          )}


          {/* Receptionist / Appointments — expandable */}
          {(hasPermission("leads") || hasPermission("appointments") || hasPermission("calendar") || hasPermission("staff") || hasPermission("ai_config") || hasPermission("knowledge_base")) && (
            <div className="sidebar-section">
              <ExpandableMenu
                icon={Bot}
                label="AI Receptionist"
                childPaths={["/admin/leads", "/admin/appointments", "/admin/calendar", "/admin/staff", "/admin/departments", "/admin/voice", "/admin/knowledge"]}
              >
                {(hasPermission("leads") || hasPermission("appointments") || hasPermission("calls")) && <SubItem to="/admin/leads" icon={UserCheck} label="Leads Management" />}
                {hasPermission("appointments") && <SubItem to="/admin/appointments" icon={CalendarCheck} label="Appointments" />}
                {hasPermission("calendar") && <SubItem to="/admin/calendar" icon={CalendarDays} label="Calendar Sync" />}
                {hasPermission("staff") && <SubItem to="/admin/staff" icon={Users} label="Staff Directory" />}
                {hasPermission("staff") && <SubItem to="/admin/departments" icon={Building2} label="Departments" />}
                {hasPermission("ai_config") && <SubItem to="/admin/voice" icon={Mic} label="Voice Assistant" />}
                {hasPermission("knowledge_base") && <SubItem to="/admin/knowledge" icon={Brain} label="Knowledge Base (RAG)" />}
              </ExpandableMenu>
            </div>
          )}

          {/* Reports — expandable */}
          {hasPermission("reports") && (
            <div className="sidebar-section">
              <ExpandableMenu
                icon={BarChart3}
                label="Reports"
                childPaths={["/admin/overall-reports"]}
              >
                {hasPermission("reports") && <SubItem to="/admin/overall-reports" icon={TrendingUp} label="Overall Reports" />}
              </ExpandableMenu>
            </div>
          )}

          {/* Integrations — expandable */}
          {(hasPermission("telephony") || hasPermission("whatsapp") || hasPermission("email") || hasPermission("crm") || hasPermission("calendar")) && (
            <div className="sidebar-section">
              <ExpandableMenu
                icon={Plug}
                label="Integrations"
                childPaths={["/admin/calendar-integration", "/admin/crm-integration", "/admin/telephony", "/admin/notifications", "/admin/notification-logs", "/admin/email", "/admin/whatsapp", "/admin/webhooks", "/webhooks"]}
              >
                {hasPermission("calendar") && <SubItem to="/admin/calendar-integration" icon={Calendar} label="Google Calendar" />}
                {hasPermission("telephony") && <SubItem to="/admin/telephony" icon={PhoneForwarded} label="SIP Trunk Configuration" />}
                {hasPermission("whatsapp") && <SubItem to="/admin/whatsapp" icon={MessageCircle} label="WhatsApp" />}
                {hasPermission("email") && <SubItem to="/admin/email" icon={Mail} label="Email Notifications" />}
                {hasPermission("email") && <SubItem to="/admin/notification-logs" icon={History} label="Auto Message Logs" />}
                {hasPermission("crm") && <SubItem to="/admin/crm-integration" icon={RefreshCw} label="CRM Sync" />}
                <SubItem to="/admin/webhooks" icon={Webhook} label="Webhooks" />
              </ExpandableMenu>
            </div>
          )}

          {/* User Management */}
          {hasPermission("user_management") && (
            <NavLink to="/admin/user-management" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <span className="nav-icon">
                <UserCheck size={18} />
              </span>
              <span>User Management</span>
            </NavLink>
          )}

          {/* Workflow Automation */}
          {hasPermission("settings") && (
            <NavLink to="/admin/workflows" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <span className="nav-icon">
                <Zap size={18} />
              </span>
              <span>Workflow Automation</span>
            </NavLink>
          )}

          {/* Settings */}
          {hasPermission("settings") && (
            <NavLink to="/admin/settings" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <span className="nav-icon">
                <Settings size={18} />
              </span>
              <span>Settings</span>
            </NavLink>
          )}
        </nav>

        {/* Sidebar Promo Card */}
        <div className="sidebar-promo-card">
          <div className="promo-title">Smarter Conversations</div>
          <div className="promo-subtitle">for a Better Business</div>
          <div className="promo-wave">⚡ AI Voice Engine</div>
        </div>

        {/* Logout */}
        <div className="sidebar-logout">
          <button onClick={handleLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

