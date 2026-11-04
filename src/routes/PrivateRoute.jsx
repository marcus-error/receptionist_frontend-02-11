import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../hooks/useAuth.js";

/**
 * Route guard requiring an authenticated session.
 */
export default function PrivateRoute() {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#090d16", color: "#fff" }}>
        Loading session...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * Route guard requiring Super Admin role.
 */
export function SuperAdminRoute() {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#090d16", color: "#fff" }}>
        Loading session...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/super-admin/login" replace />;
  }

  if (user.role !== "super_admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}

/**
 * Route guard requiring Admin role (or Super Admin).
 */
export function AdminRoute() {
  const { token, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#090d16", color: "#fff" }}>
        Loading session...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

/**
 * Component guard checking specific feature permission.
 */
export function PermissionGuard({ permission, children }) {
  const { user, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(permission)) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
        <h2>Access Denied</h2>
        <p style={{ color: "#94a3b8", marginTop: "8px" }}>
          You do not have the required permission (<code>{permission}</code>) to view this module.
        </p>
      </div>
    );
  }

  return children;
}
