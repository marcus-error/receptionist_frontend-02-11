import api from "./api.js";

const leadsService = {
  getLeads: async (params = {}) => {
    const res = await api.get("/leads", { params });
    return res.data;
  },

  getMetrics: async () => {
    const res = await api.get("/leads/metrics");
    return res.data;
  },

  getServices: async () => {
    const res = await api.get("/leads/services");
    return res.data;
  },

  getLeadDetails: async (leadId) => {
    const res = await api.get(`/leads/${leadId}`);
    return res.data;
  },

  updateLead: async (leadId, data) => {
    const res = await api.patch(`/leads/${leadId}`, data);
    return res.data;
  },

  addActivity: async (leadId, data) => {
    const res = await api.post(`/leads/${leadId}/activities`, data);
    return res.data;
  },

  syncLeads: async () => {
    const res = await api.post("/leads/sync");
    return res.data;
  },
};

export default leadsService;
