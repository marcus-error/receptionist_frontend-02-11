import api from "./api.js";

export const getGeminiAccounts = async () => {
  const response = await api.get("/gemini/accounts");
  return response.data;
};

export const addGeminiAccount = async (accountData) => {
  const response = await api.post("/gemini/accounts", accountData);
  return response.data;
};
