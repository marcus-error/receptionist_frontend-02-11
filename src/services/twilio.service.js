import api from "./api.js";

export const getTwilioConfig = async () => {
  const response = await api.get("/twilio/config");
  return response.data;
};

export const updateTwilioConfig = async (config) => {
  const response = await api.post("/twilio/config", config);
  return response.data;
};
