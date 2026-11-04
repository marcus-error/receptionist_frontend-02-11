import api from "./api.js";

const BASE = "/telephony";

export const telephonyService = {
  getSettings: () => api.get(`${BASE}/settings`).then((res) => res.data),
  updateSettings: (payload) => api.put(`${BASE}/settings`, payload).then((res) => res.data),
  testConnection: (payload) => api.post(`${BASE}/test-connection`, payload).then((res) => res.data),
  validateSip: (payload) => api.post(`${BASE}/validate-sip`, payload).then((res) => res.data),

  // SIP Trunk Configuration
  getSipConfig: (probe = true) => api.get(`${BASE}/sip`, { params: { probe } }).then((res) => res.data),
  updateSipConfig: (payload) => api.post(`${BASE}/sip`, payload).then((res) => res.data),
  testSipConnection: (payload) => api.post(`${BASE}/sip/test`, payload).then((res) => res.data),
  runE2ETest: (payload) => api.post(`${BASE}/sip/test-e2e`, payload).then((res) => res.data),

  // SIP UA Registration (FreeSWITCH / Asterisk)
  registerSip: (payload = {}) => api.post(`${BASE}/sip/register`, payload).then((res) => res.data),
  getRegistrationStatus: () => api.get(`${BASE}/sip/registration-status`).then((res) => res.data),
  unregisterSip: () => api.post(`${BASE}/sip/unregister`, {}).then((res) => res.data),

  // Inbound call lifecycle (webhook-mode providers)
  sipInboundEvent: (payload) => api.post(`${BASE}/sip/inbound`, payload).then((res) => res.data),
  sipHangup: (payload) => api.post(`${BASE}/sip/inbound/hangup`, payload).then((res) => res.data),
  makeOutboundCall: (payload) => api.post(`${BASE}/sip/outbound`, payload).then((res) => res.data),
};

export default telephonyService;
