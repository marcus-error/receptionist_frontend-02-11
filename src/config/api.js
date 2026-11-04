/**
 * Centralized API configuration.
 *
 * This is the ONLY place that reads the backend base URL from the
 * environment. Every other file must import from here (or from
 * services/api.js, which uses this) instead of hardcoding a URL.
 *
 * Changing frontend/.env (or providing a different .env.staging /
 * .env.production file to Vite) switches the whole app to a different
 * backend environment with no source code changes.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";

if (!import.meta.env.VITE_API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "VITE_API_BASE_URL is not set in env. Defaulting to http://127.0.0.1:8000/api/v1"
  );
}

export const API_TIMEOUT_MS = 90000;

export default API_BASE_URL;

