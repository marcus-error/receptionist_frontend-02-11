import api from "./api.js";

export const getEmailConfig = async () => {
  const response = await api.get("/email/config");
  return response.data;
};

export const updateEmailConfig = async (config) => {
  const response = await api.post("/email/config", config);
  return response.data;
};

export const validateEmailConnection = async () => {
  const response = await api.get("/email/validate");
  return response.data;
};

export const sendTestEmail = async (payload) => {
  const response = await api.post("/email/send", payload);
  return response.data;
};

export const getRecentEmailLogs = async () => {
  try {
    const response = await api.get("/notification-logs?channel=email&limit=8");
    return response.data?.logs || response.data || [];
  } catch (err) {
    console.error("Failed to fetch email logs", err);
    return [];
  }
};

