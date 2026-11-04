import { createContext, useContext, useState, useEffect } from "react";
import useLocalStorage from "../hooks/useLocalStorage.js";
import api from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useLocalStorage("token", null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (err) {
      console.error("Failed to verify user session:", err);
      // Clear invalid token
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (nextToken, nextUser) => {
    setToken(nextToken);
    if (nextUser) setUser(nextUser);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  const hasPermission = (permissionName) => {
    if (!user) return false;
    if (user.role === "super_admin") return true;
    if (!user.permissions) return false;
    if (Array.isArray(permissionName)) {
      return permissionName.some(p => user.permissions.includes(p) || (p === "live_calls" && user.permissions.includes("calls")));
    }
    if (permissionName === "live_calls") {
      return user.permissions.includes("live_calls") || user.permissions.includes("calls");
    }
    if (permissionName === "leads") {
      return user.permissions.includes("leads") || user.permissions.includes("appointments") || user.permissions.includes("calls");
    }
    return user.permissions.includes(permissionName);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, hasPermission, fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
