import api from "./api.js";

const BASE = "/knowledge";

export const knowledgeService = {
  getAll: ({ scope, document_type, target_org_id } = {}) => {
    const params = new URLSearchParams();
    if (scope) params.set("scope", scope);
    if (document_type) params.set("document_type", document_type);
    if (target_org_id != null) params.set("target_org_id", target_org_id);
    const qs = params.toString();
    return api.get(`${BASE}${qs ? `?${qs}` : ""}`).then((res) => res.data);
  },
  getById: (id) => api.get(`${BASE}/${id}`).then((res) => res.data),
  search: (query) => api.get(`${BASE}/search?q=${encodeURIComponent(query || "")}`).then((res) => res.data),
  create: (payload) => api.post(BASE, payload).then((res) => res.data),
  uploadFile: (file, { scope, document_type, target_org_id, agent_id, assistant_id } = {}) => {
    const formData = new FormData();
    formData.append("file", file);
    if (scope) formData.append("scope", scope);
    if (document_type) formData.append("document_type", document_type);
    if (target_org_id != null) formData.append("target_org_id", String(target_org_id));
    if (agent_id) formData.append("agent_id", agent_id);
    if (assistant_id) formData.append("assistant_id", assistant_id);
    return api.post(`${BASE}/upload`, formData, {
      headers: {
        "Content-Type": undefined
      }
    }).then((res) => res.data);
  },
  queryRag: (query, organizationId = 1, scope = null) => api.post(`${BASE}/query`, { query, organization_id: organizationId, scope }).then((res) => res.data),
  reindexAll: () => api.post(`${BASE}/reindex`).then((res) => res.data),
  update: (id, payload) => api.put(`${BASE}/${id}`, payload).then((res) => res.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then((res) => res.data),
  downloadFile: async (id, title = "document", fileType = "txt") => {
    const response = await api.get(`${BASE}/${id}/file`, {
      responseType: "blob"
    });
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;

    const ext = (fileType || "txt").toLowerCase();
    const filename = title.toLowerCase().endsWith(`.${ext}`) ? title : `${title}.${ext}`;

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
};

export default knowledgeService;
