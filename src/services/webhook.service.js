import api from "./api.js";

const BASE = "/webhooks";

export const getWebhooks = (params = {}) => api.get(BASE, { params }).then((res) => res.data);
export const getWebhook = (id) => api.get(`${BASE}/${id}`).then((res) => res.data);
export const createWebhook = (payload) => api.post(BASE, payload).then((res) => res.data);
export const updateWebhook = (id, payload) => api.put(`${BASE}/${id}`, payload).then((res) => res.data);
export const deleteWebhook = (id) => api.delete(`${BASE}/${id}`).then((res) => res.data);
export const toggleWebhook = (id) => api.post(`${BASE}/${id}/toggle`).then((res) => res.data);
export const enableWebhook = (id) => api.post(`${BASE}/${id}/enable`).then((res) => res.data);
export const disableWebhook = (id) => api.post(`${BASE}/${id}/disable`).then((res) => res.data);
export const rotateSecret = (id) => api.post(`${BASE}/${id}/rotate-secret`).then((res) => res.data);
export const rotateWebhookSecret = (id) => api.post(`${BASE}/${id}/rotate-secret`).then((res) => res.data);
export const sendWebhookTest = (id, event_name, payload = null) =>
  api.post(`${BASE}/${id}/test`, { event_name, payload }).then((res) => res.data);
export const getWebhookEvents = () => api.get(`${BASE}/events`).then((res) => res.data);
export const getWebhookStats = () => api.get(`${BASE}/stats`).then((res) => res.data);
export const getDeliveries = (params = {}) => api.get(`${BASE}/deliveries`, { params }).then((res) => res.data);
export const getWebhookDeliveries = (id, params = {}) => api.get(`${BASE}/${id}/deliveries`, { params }).then((res) => res.data);
export const getDelivery = (deliveryId) => api.get(`${BASE}/deliveries/${deliveryId}`).then((res) => res.data);
export const retryDelivery = (webhookId, deliveryId) => {
  const delId = deliveryId || webhookId;
  return api.post(`${BASE}/deliveries/${delId}/retry`).then((res) => res.data);
};

export const webhookService = {
  getWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  toggleWebhook,
  enableWebhook,
  disableWebhook,
  rotateSecret,
  rotateWebhookSecret,
  sendWebhookTest,
  getWebhookEvents,
  getWebhookStats,
  getDeliveries,
  getWebhookDeliveries,
  getDelivery,
  retryDelivery,
};

export default webhookService;
