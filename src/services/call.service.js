import api from "./api.js";

const BASE = "/calls";

export const callService = {
  getAll: (orgId) => api.get(BASE, { params: orgId ? { organization_id: orgId } : {} }).then((res) => res.data),
  getLatest: (type, orgId) => {
    const params = {};
    if (type) params.call_type = type;
    if (orgId) params.organization_id = orgId;
    return api.get(`${BASE}/latest`, { params }).then((res) => res.data);
  },
  create: (payload) => api.post(BASE, payload).then((res) => res.data)
};

export default callService;
