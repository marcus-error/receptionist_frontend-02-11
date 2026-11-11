import api from "./api.js";

const BASE = "/departments";

export const departmentService = {
  getAll: () => api.get(BASE).then((res) => res.data),
  getById: (id) => api.get(`${BASE}/${id}`).then((res) => res.data),
  create: (payload) => api.post(BASE, payload).then((res) => res.data),
  update: (id, payload) => api.put(`${BASE}/${id}`, payload).then((res) => res.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then((res) => res.data),
  getStaff: (deptId) => api.get(`${BASE}/${deptId}/staff`).then((res) => res.data),
  assignStaff: (deptId, staffIds) => {
    const ids = Array.isArray(staffIds) ? staffIds : [staffIds];
    return api.post(`${BASE}/${deptId}/staff`, { staff_ids: ids }).then((res) => res.data);
  },
  removeStaff: (deptId, staffId) => api.delete(`${BASE}/${deptId}/staff/${staffId}`).then((res) => res.data)
};

export default departmentService;
