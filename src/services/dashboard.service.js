import api from "./api.js";

export const dashboardService = {
  getOverview: () => api.get("/dashboard/overview").then((res) => res.data),
  getStats: () => api.get("/dashboard/stats").then((res) => res.data),
  getRecentCalls: () => api.get("/dashboard/recent-calls").then((res) => res.data),
  getSchedule: () => api.get("/dashboard/schedule").then((res) => res.data),
  getLeads: () => api.get("/dashboard/leads").then((res) => res.data),
  getStaff: () => api.get("/dashboard/staff").then((res) => res.data),
  getStatus: () => api.get("/dashboard/status").then((res) => res.data),
  getInsights: () => api.get("/dashboard/insights").then((res) => res.data),
};

export default dashboardService;

