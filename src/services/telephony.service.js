import api from "./api.js";

const BASE = "/telephony";

export const telephonyService = {
  getSettings: () => api.get(`${BASE}/settings`).then((res) => res.data),
  updateSettings: (payload) => api.put(`${BASE}/settings`, payload).then((res) => res.data),
  testConnection: (payload) => api.post(`${BASE}/test-connection`, payload).then((res) => res.data),
  validateSip: (payload) => api.post(`${BASE}/validate-sip`, payload).then((res) => res.data),

  // SIP Trunk Configuration
  listSipConfigs: () => api.get(`${BASE}/sip/list`).then((res) => res.data),
  getSipConfig: (probe = true, params = {}) => api.get(`${BASE}/sip`, { params: { probe, ...params } }).then((res) => res.data),
  getSipConfigById: (id, probe = true) => api.get(`${BASE}/sip/${id}`, { params: { probe } }).then((res) => res.data),
  createSipConfig: (payload) => api.post(`${BASE}/sip`, payload).then((res) => res.data),
  updateSipConfig: (payload) => api.post(`${BASE}/sip`, payload).then((res) => res.data),
  updateSipConfigById: (id, payload) => api.put(`${BASE}/sip/${id}`, payload).then((res) => res.data),
  deleteSipConfig: (id) => api.delete(`${BASE}/sip/${id}`).then((res) => res.data),
  activateSipConfig: (id) => api.post(`${BASE}/sip/${id}/activate`).then((res) => res.data),
  deactivateSipConfig: (id) => id ? api.post(`${BASE}/sip/${id}/deactivate`).then((res) => res.data) : api.post(`${BASE}/sip/deactivate`).then((res) => res.data),
  testSipConnection: (payload) => api.post(`${BASE}/sip/test`, payload).then((res) => res.data),
  runE2ETest: (payload) => api.post(`${BASE}/sip/test-e2e`, payload).then((res) => res.data),

  // SIP UA Registration (FreeSWITCH / Asterisk)
  registerSip: (payload = {}) => api.post(`${BASE}/sip/register`, payload).then((res) => res.data),
  getRegistrationStatus: (params = {}) => api.get(`${BASE}/sip/registration-status`, { params }).then((res) => res.data),
  unregisterSip: () => api.post(`${BASE}/sip/unregister`, {}).then((res) => res.data),

  // Inbound call lifecycle (webhook-mode providers)
  sipInboundEvent: (payload) => api.post(`${BASE}/sip/inbound`, payload).then((res) => res.data),
  sipHangup: (payload) => api.post(`${BASE}/sip/inbound/hangup`, payload).then((res) => res.data),
  makeOutboundCall: (payload) => api.post(`${BASE}/sip/outbound`, payload).then((res) => res.data),
};

export default telephonyService;
