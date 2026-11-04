import api from "./api.js";

export const getWhatsAppConfig = async () => {
  const response = await api.get("/whatsapp/config");
  return response.data;
};

export const updateWhatsAppConfig = async (config) => {
  const response = await api.post("/whatsapp/config", config);
  return response.data;
};

export const validateWhatsAppConnection = async () => {
  const response = await api.get("/whatsapp/validate");
  return response.data;
};

export const sendTestWhatsAppMessage = async (payload) => {
  const response = await api.post("/whatsapp/messages", payload);
  return response.data;
};

export const triggerReminderTest = async (hoursBefore = 24) => {
  const response = await api.post(`/whatsapp/reminders/${hoursBefore}`);
  return response.data;
};

export const getDeliveryStatus = async () => {
  const response = await api.get("/whatsapp/delivery-status");
  return response.data;
};

