import axios from "axios";
import API_BASE_URL, { API_TIMEOUT_MS } from "../config/api.js";

/**
 * Common API client.
 * All frontend API requests must go through this instance instead of
 * calling axios / fetch directly with a hardcoded URL.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json"
  }
});

// Attach auth token automatically if one is present.
api.interceptors.request.use((config) => {
  let token = localStorage.getItem("token");
  if (token) {
    // Strip quotes or whitespace if stringified
    token = token.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
    if (token && token !== "null" && token !== "undefined") {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Normalize error responses.
api.interceptors.response.use(
  (response) => {
    if (typeof response.data === "string" && response.data.trim().startsWith("<!DOCTYPE")) {
      return Promise.reject(new Error("Received HTML instead of JSON API response"));
    }
    return response;
  },
  (error) => {
    let message = "Something went wrong";
    if (error?.response?.data) {
      if (typeof error.response.data.detail === "string") {
        message = error.response.data.detail;
      } else if (typeof error.response.data.detail === "object") {
        message = JSON.stringify(error.response.data.detail);
      } else if (error.response.data.message) {
        message = error.response.data.message;
      }
    } else if (error.message) {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

export default api;
