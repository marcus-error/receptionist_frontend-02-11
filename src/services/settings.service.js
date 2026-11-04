import api from "./api.js";

const BASE = "/settings";

export const settingsService = {
  get: () => api.get(BASE).then((res) => res.data),
  update: (payload) => api.put(BASE, payload).then((res) => res.data)
};

export default settingsService;
