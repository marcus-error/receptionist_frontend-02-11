import api from "./api.js";

// ------------------------------------------------------------------ //
// Calendar Config (provider connection status)                         //
// ------------------------------------------------------------------ //

export const getCalendarConfig = async () => {
  const response = await api.get("/calendar/config");
  return response.data;
};

export const updateCalendarConfig = async (config) => {
  const response = await api.post("/calendar/config", config);
  return response.data;
};

// ------------------------------------------------------------------ //
// Google OAuth                                                         //
// ------------------------------------------------------------------ //

/**
 * Get the Google OAuth authorization URL from the backend.
 * Redirects the user's browser to complete the OAuth flow.
 */
export const getGoogleAuthUrl = async () => {
  const response = await api.get("/calendar/oauth/authorize");
  return response.data; // { authorization_url: "https://accounts.google.com/..." }
};

export const disconnectGoogle = async () => {
  const response = await api.post("/calendar/disconnect");
  return response.data;
};

export const getGoogleConnectionStatus = async () => {
  const response = await api.get("/calendar/connection");
  return response.data;
};

// ------------------------------------------------------------------ //
// Microsoft OAuth                                                      //
// ------------------------------------------------------------------ //

export const getMicrosoftAuthUrl = async () => {
  const response = await api.get("/microsoft-calendar/oauth/authorize");
  return response.data;
};

export const getMicrosoftConnectionStatus = async () => {
  const response = await api.get("/microsoft-calendar/connection");
  return response.data;
};

export const disconnectMicrosoft = async () => {
  const response = await api.post("/microsoft-calendar/disconnect");
  return response.data;
};

// ------------------------------------------------------------------ //
// Calendar Events                                                      //
// ------------------------------------------------------------------ //

/**
 * Fetch events from the connected calendar provider.
 * @param {string} start - ISO 8601 datetime string
 * @param {string} end   - ISO 8601 datetime string
 * @param {string} calendarId - defaults to "primary"
 */
export const getCalendarEvents = async (start, end, calendarId = "primary") => {
  const response = await api.get("/calendar/events", {
    params: { start, end, calendar_id: calendarId },
  });
  return response.data;
};

export const createCalendarEvent = async ({ summary, start, end, description, calendarId }) => {
  const response = await api.post("/calendar/events", {
    summary,
    start,
    end,
    description: description || "",
    calendar_id: calendarId || "primary",
  });
  return response.data;
};

export const updateCalendarEvent = async (eventId, { summary, start, end, description, calendarId }) => {
  const response = await api.put(`/calendar/events/${eventId}`, {
    summary,
    start,
    end,
    description,
    calendar_id: calendarId || "primary",
  });
  return response.data;
};

export const deleteCalendarEvent = async (eventId, calendarId = "primary") => {
  const response = await api.delete(`/calendar/events/${eventId}`, {
    params: { calendar_id: calendarId },
  });
  return response.data;
};

export const checkCalendarConflict = async (start, end, calendarId = "primary", excludeEventId) => {
  const params = { start, end, calendar_id: calendarId };
  if (excludeEventId) params.exclude_event_id = excludeEventId;
  const response = await api.get("/calendar/events/conflicts", { params });
  return response.data; // { conflict: true/false }
};

// ------------------------------------------------------------------ //
// Available Staff Slots                                                //
// ------------------------------------------------------------------ //

/**
 * Get available appointment slots for a given staff member on a date.
 * @param {number} staffId
 * @param {string} selectedDate - YYYY-MM-DD
 * @param {string|null} service
 */
export const getStaffSlots = async (staffId, selectedDate, service = null) => {
  const params = { selected_date: selectedDate };
  if (service) params.service = service;
  const response = await api.get(`/availability/${staffId}/slots`, { params });
  return response.data;
};
