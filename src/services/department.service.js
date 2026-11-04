import api from "./api.js";

const BASE = "/departments";

export const departmentService = {
  getAll: () => api.get(BASE).then((res) => res.data),
  getById: (id) => api.get(`${BASE}/${id}`).then((res) => res.data),
  create: (payload) => api.post(BASE, payload).then((res) => res.data),
  update: (id, payload) => api.put(`${BASE}/${id}`, payload).then((res) => res.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then((res) => res.data)
};

export default departmentService;
