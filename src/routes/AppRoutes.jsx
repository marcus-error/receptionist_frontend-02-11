import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout.jsx";
import SuperAdminLayout from "../layouts/SuperAdminLayout.jsx";
import { SuperAdminRoute, AdminRoute, PermissionGuard } from "./PrivateRoute.jsx";

// Public Pages
import Landing from "../pages/Landing/index.jsx";
import SuperAdminLogin from "../pages/SuperAdminLogin/index.jsx";
import AdminLogin from "../pages/AdminLogin/index.jsx";
import CompanySignup from "../pages/CompanySignup/index.jsx";
import NotFound from "../pages/NotFound/index.jsx";

// Super Admin Pages
import SuperAdminDashboard from "../pages/SuperAdmin/Dashboard.jsx";
import OrganizationsManager from "../pages/SuperAdmin/Organizations.jsx";
import AdminsManager from "../pages/SuperAdmin/Admins.jsx";
import PermissionsManager from "../pages/SuperAdmin/Permissions.jsx";
import PlatformSettings from "../pages/SuperAdmin/PlatformSettings.jsx";
import Subscriptions from "../pages/SuperAdmin/Subscriptions.jsx";
import AuditLogs from "../pages/SuperAdmin/AuditLogs.jsx";
import SuperAdminRagUpload from "../pages/SuperAdmin/RagUpload.jsx";

// Admin Pages
import Dashboard from "../pages/Dashboard/index.jsx";
import LiveCall from "../pages/LiveCall/index.jsx";
import Dialer from "../pages/Dialer/index.jsx";
import LeadsPage from "../pages/Leads/LeadsPage.jsx";
import LeadsManagementPage from "../pages/LeadsManagement/LeadsManagementPage.jsx";
import CallRecordings from "../pages/CallRecordings/index.jsx";
import Voice from "../pages/Voice/index.jsx";
import Appointments from "../pages/Appointments/index.jsx";
import CalendarPage from "../pages/Calendar/index.jsx";
import Staff from "../pages/Staff/index.jsx";
import Departments from "../pages/Departments/index.jsx";
import Knowledge from "../pages/Knowledge/index.jsx";
import VoiceHistory from "../pages/VoiceHistory/index.jsx";
import OverallReports from "../pages/OverallReports/index.jsx";
import UserManagement from "../pages/UserManagement/index.jsx";
import OrganizationManagement from "../pages/OrganizationManagement/index.jsx";
import Telephony from "../pages/Telephony/index.jsx";
import CalendarConfig from "../pages/CalendarConfig/index.jsx";
import PrivateCalendar from "../pages/PrivateCalendar/index.jsx";
import Notifications from "../pages/Notifications/index.jsx";
import Email from "../pages/Email/index.jsx";
import WhatsApp from "../pages/WhatsApp/index.jsx";
import CrmIntegration from "../pages/CrmIntegration/index.jsx";
import Gemini from "../pages/Gemini/index.jsx";
import Settings from "../pages/Settings/index.jsx";
import Workflows from "../pages/Workflows/index.jsx";

import NotificationLogs from "../pages/NotificationLogs/index.jsx";
import Webhooks from "../pages/Webhooks/index.jsx";
import WebhookDetail from "../pages/Webhooks/WebhookDetail.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ================= PUBLIC ROUTES ================= */}
      <Route path="/" element={<Landing />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/demo" element={<LiveCall isDemo={true} />} />
      <Route path="/demo/live-calls" element={<LiveCall isDemo={true} />} />
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/super-admin/login" element={<AdminLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/signup/company" element={<CompanySignup />} />

      {/* ================= SUPER ADMIN PROTECTED ROUTES ================= */}
      <Route element={<SuperAdminRoute />}>
        <Route element={<SuperAdminLayout />}>
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/organizations" element={<OrganizationsManager />} />
          <Route path="/super-admin/admins" element={<AdminsManager />} />
          <Route path="/super-admin/permissions" element={<PermissionsManager />} />
          <Route path="/super-admin/subscriptions" element={<Subscriptions />} />
          <Route path="/super-admin/calls" element={<LiveCall />} />
          <Route path="/super-admin/reports" element={<OverallReports />} />
          <Route path="/super-admin/audit-logs" element={<AuditLogs />} />
          <Route path="/super-admin/rag-upload" element={<SuperAdminRagUpload />} />
          <Route path="/super-admin/settings" element={<PlatformSettings />} />
        </Route>
      </Route>

      {/* ================= ADMIN PROTECTED ROUTES ================= */}
      <Route element={<AdminRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/admin/dashboard" element={<PermissionGuard permission="dashboard"><Dashboard /></PermissionGuard>} />
          <Route path="/admin/live-calls" element={<PermissionGuard permission="live_calls"><LiveCall /></PermissionGuard>} />
          <Route path="/admin/dialer" element={<PermissionGuard permission="calls"><Dialer /></PermissionGuard>} />
          <Route path="/admin/call-recordings" element={<PermissionGuard permission="recordings"><CallRecordings /></PermissionGuard>} />
          <Route path="/admin/voice" element={<PermissionGuard permission="ai_config"><Voice /></PermissionGuard>} />
          <Route path="/admin/leads" element={<PermissionGuard permission="leads"><LeadsManagementPage /></PermissionGuard>} />
          <Route path="/admin/leads-management" element={<PermissionGuard permission="leads"><LeadsManagementPage /></PermissionGuard>} />
          <Route path="/admin/appointments" element={<PermissionGuard permission="appointments"><Appointments /></PermissionGuard>} />
          <Route path="/admin/calendar" element={<PermissionGuard permission="calendar"><CalendarPage /></PermissionGuard>} />
          <Route path="/admin/staff" element={<PermissionGuard permission="staff"><Staff /></PermissionGuard>} />
          <Route path="/admin/departments" element={<PermissionGuard permission="staff"><Departments /></PermissionGuard>} />
          <Route path="/admin/knowledge" element={<PermissionGuard permission="knowledge_base"><Knowledge /></PermissionGuard>} />
          <Route path="/admin/voice-history" element={<PermissionGuard permission="calls"><VoiceHistory /></PermissionGuard>} />
          <Route path="/admin/campaigns" element={<PermissionGuard permission="calls"><LeadsPage /></PermissionGuard>} />
          <Route path="/admin/overall-reports" element={<PermissionGuard permission="reports"><OverallReports /></PermissionGuard>} />
          <Route path="/admin/user-management" element={<PermissionGuard permission="user_management"><UserManagement /></PermissionGuard>} />
          <Route path="/admin/organization-management" element={<PermissionGuard permission="user_management"><OrganizationManagement /></PermissionGuard>} />
          <Route path="/admin/crm-integration" element={<PermissionGuard permission="crm"><CrmIntegration /></PermissionGuard>} />
          <Route path="/admin/telephony" element={<PermissionGuard permission="telephony"><Telephony /></PermissionGuard>} />
          <Route path="/admin/calendar-integration" element={<PermissionGuard permission="calendar"><CalendarConfig /></PermissionGuard>} />
          <Route path="/admin/calendar-integration/private" element={<PermissionGuard permission="calendar"><PrivateCalendar /></PermissionGuard>} />
          <Route path="/admin/notifications" element={<PermissionGuard permission="email"><Notifications /></PermissionGuard>} />
          <Route path="/admin/notification-logs" element={<PermissionGuard permission="email"><NotificationLogs /></PermissionGuard>} />
          <Route path="/admin/email" element={<PermissionGuard permission="email"><Email /></PermissionGuard>} />
          <Route path="/admin/whatsapp" element={<PermissionGuard permission="whatsapp"><WhatsApp /></PermissionGuard>} />
          <Route path="/admin/gemini" element={<PermissionGuard permission="ai_config"><Gemini /></PermissionGuard>} />
          <Route path="/admin/workflows" element={<PermissionGuard permission="settings"><Workflows /></PermissionGuard>} />
          <Route path="/admin/webhooks" element={<PermissionGuard permission="settings"><Webhooks /></PermissionGuard>} />
          <Route path="/admin/webhooks/:id" element={<PermissionGuard permission="settings"><WebhookDetail /></PermissionGuard>} />
          <Route path="/admin/settings" element={<PermissionGuard permission="settings"><Settings /></PermissionGuard>} />

          {/* Backward compatibility redirects for legacy un-prefixed paths */}
          <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/live-calls" element={<Navigate to="/admin/live-calls" replace />} />
          <Route path="/call-recordings" element={<Navigate to="/admin/call-recordings" replace />} />
          <Route path="/voice" element={<Navigate to="/admin/voice" replace />} />
          <Route path="/appointments" element={<Navigate to="/admin/appointments" replace />} />
          <Route path="/calendar" element={<Navigate to="/admin/calendar" replace />} />
          <Route path="/staff" element={<Navigate to="/admin/staff" replace />} />
          <Route path="/departments" element={<Navigate to="/admin/departments" replace />} />
          <Route path="/knowledge" element={<Navigate to="/admin/knowledge" replace />} />
          <Route path="/webhooks" element={<Navigate to="/admin/webhooks" replace />} />
          <Route path="/webhooks/:id" element={<Navigate to="/admin/webhooks/:id" replace />} />

          <Route path="/voice-history" element={<Navigate to="/admin/voice-history" replace />} />
          <Route path="/overall-reports" element={<Navigate to="/admin/overall-reports" replace />} />
          <Route path="/user-management" element={<Navigate to="/admin/user-management" replace />} />
          <Route path="/organization-management" element={<Navigate to="/admin/organization-management" replace />} />
          <Route path="/crm-integration" element={<Navigate to="/admin/crm-integration" replace />} />
          <Route path="/telephony" element={<Navigate to="/admin/telephony" replace />} />
          <Route path="/notifications" element={<Navigate to="/admin/notifications" replace />} />
          <Route path="/notification-logs" element={<Navigate to="/admin/notification-logs" replace />} />
          <Route path="/email" element={<Navigate to="/admin/email" replace />} />
          <Route path="/whatsapp" element={<Navigate to="/admin/whatsapp" replace />} />
          <Route path="/gemini" element={<Navigate to="/admin/gemini" replace />} />
          <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
        </Route>
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
