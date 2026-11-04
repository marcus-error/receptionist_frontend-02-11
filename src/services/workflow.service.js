import api from "./api.js";

const BASE = "/workflows";

export const workflowService = {
  getAll: () => api.get(BASE).then((res) => res.data),
  create: (payload) => api.post(BASE, payload).then((res) => res.data),
  update: (id, payload) => api.put(`${BASE}/${id}`, payload).then((res) => res.data),
  toggle: (id) => api.put(`${BASE}/${id}/toggle`).then((res) => res.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then((res) => res.data),
  getLogs: () => api.get(`${BASE}/logs`).then((res) => res.data),
  testRun: (id) => api.post(`${BASE}/${id}/test`).then((res) => res.data),
};

export default workflowService;
