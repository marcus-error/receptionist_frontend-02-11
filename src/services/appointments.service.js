import api from "./api.js";

const BASE = "/appointments";

export const appointmentsService = {
  getAll: () => api.get(BASE).then((res) => res.data),
  getById: (id) => api.get(`${BASE}/${id}`).then((res) => res.data),
  create: (payload) => api.post(BASE, payload).then((res) => res.data),
  update: (id, payload) => api.put(`${BASE}/${id}`, payload).then((res) => res.data),
  remove: (id) => api.delete(`${BASE}/${id}`).then((res) => res.data),

  /** Cancel an appointment by setting status = Cancelled */
  cancel: (id) =>
    api.put(`${BASE}/${id}`, { status: "Cancelled" }).then((res) => res.data),

  /** Reschedule an appointment by updating date/time and restoring active status */
  reschedule: (id, { appointment_date, appointment_time, status = "Confirmed", confirmation_status = "Confirmed" }) =>
    api
      .put(`${BASE}/${id}`, { appointment_date, appointment_time, status, confirmation_status })
      .then((res) => res.data),

  /** Trigger bidirectional Google Calendar synchronization */
  syncCalendar: () => api.post(`${BASE}/sync-calendar`).then((res) => res.data),

  /** Check live Google Calendar and DB availability for an exact slot */
  checkSlotAvailability: (payload) =>
    api.post("/availability/check-slot", payload).then((res) => res.data),

  /**
   * Fetch available time slots for a staff member on a given date.
   * @param {{ date: string, staff_id?: number, staff?: string, service?: string }} params
   */
  getAvailability: async ({ date, staff_id, staff: staffName, service }) => {
    try {
      // If we only have a staff name, find the staff_id first.
      let id = staff_id;
      if (!id && staffName) {
        const staffList = await api.get("/staff").then((r) => r.data);
        const found = staffList.find(
          (s) => s.name?.toLowerCase() === staffName?.toLowerCase()
        );
        id = found?.id;
      }
      if (!id) return { available_slots: [], reason: "Staff not found" };

      const params = { selected_date: date };
      if (service) params.service = service;

      return api
        .get(`/availability/${id}/slots`, { params })
        .then((r) => r.data);
    } catch {
      return { available_slots: [], reason: "Could not fetch availability" };
    }
  },
};

export default appointmentsService;
