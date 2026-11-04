import { useEffect, useState } from "react";
import Toggle from "../../components/ui/Toggle.jsx";
import appointmentsService from "../../services/appointments.service.js";

const SETTINGS = [
  { title: "Appointment Confirmation", desc: "Send confirmation immediately after booking" },
  { title: "24 Hour Reminder", desc: "Send reminder one day before appointment" },
  { title: "1 Hour Reminder", desc: "Send reminder one hour before appointment" },
  { title: "Cancellation Notification", desc: "Notify staff when customer cancels" }
];

export default function Notifications() {
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    appointmentsService.getAll().then((data) => {
      setAppointments([...data].reverse());
    }).catch(err => console.error("Failed to fetch reminders:", err));
  }, []);

  return (
    <section id="notifications" className="page active">
      <div className="header">
        <div>
          <h1 className="title">Notification Center</h1>
          <p className="subtitle">Configure appointment confirmation and reminders</p>
        </div>
      </div>

      <div className="card">
        {SETTINGS.map((s) => (
          <div className="setting" key={s.title}>
            <div>
              <strong style={{ fontSize: "14px", color: "#fff", display: "block" }}>{s.title}</strong>
              <p style={{ fontSize: "12px", color: "rgba(244, 245, 243, 0.5)", marginTop: "2px" }}>{s.desc}</p>
            </div>

            <Toggle />
          </div>
        ))}
      </div>

      <div className="grid2" style={{ marginTop: "20px" }}>
        <div className="card">
          <div className="card-title">WhatsApp Notification Channel</div>
          <p style={{ fontSize: "13px", color: "rgba(244, 245, 243, 0.85)" }}>✓ Instant appointment confirmation</p>
          <p style={{ fontSize: "13px", color: "rgba(244, 245, 243, 0.85)", marginTop: "10px" }}>✓ 24-hour automated reminder</p>
          <p style={{ fontSize: "13px", color: "rgba(244, 245, 243, 0.85)", marginTop: "10px" }}>✓ 1-hour urgent reminder</p>
        </div>

        <div className="card">
          <div className="card-title">Email Notification Channel</div>
          <p style={{ fontSize: "13px", color: "rgba(244, 245, 243, 0.85)" }}>✓ Immediate booking confirmation</p>
          <p style={{ fontSize: "13px", color: "rgba(244, 245, 243, 0.85)", marginTop: "10px" }}>✓ Calendar .ics invite attachment</p>
          <p style={{ fontSize: "13px", color: "rgba(244, 245, 243, 0.85)", marginTop: "10px" }}>✓ Pre-appointment schedule reminder</p>
        </div>
      </div>
    
      <div className="card" style={{ marginTop: "20px" }}>
        <div className="card-title">Upcoming Reminders</div>
        <div className="table" style={{ marginTop: "15px" }}>
          <table>
            <thead>
              <tr>
                <th>Appointment</th>
                <th>Status</th>
                <th>Message / Template</th>
                <th>Scheduled Time</th>
                <th>Sent Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length > 0 ? appointments.map((appt) => (
                <tr key={appt.id}>
                  <td>
                    <strong style={{ display: "block" }}>{appt.customer}</strong>
                    <span style={{ fontSize: "11.5px", color: "rgba(244, 245, 243, 0.5)" }}>{appt.department}</span>
                  </td>
                  <td>
                    <span className={`badge ${appt.status?.toLowerCase() === "confirmed" ? "green" : "yellow"}`}>
                      {appt.status || "Pending"}
                    </span>
                  </td>
                  <td style={{ color: "rgba(244, 245, 243, 0.8)" }}>{appt.reminder || "Appointment reminder template"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {appt.appointment_date} <br/>
                    <small style={{ color: "rgba(244, 245, 243, 0.5)" }}>{appt.appointment_time}</small>
                  </td>
                  <td style={{ color: "rgba(244, 245, 243, 0.5)" }}>—</td>
                  <td>
                    <button className="btn btn-sm" type="button" onClick={() => setSelectedAppointment(appt)}>View Details</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "30px 20px", color: "rgba(244, 245, 243, 0.4)" }}>No upcoming reminders</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        <div className="card-title">Message / Template Preview</div>
        <div className="modal-notice-box" style={{ marginTop: "12px", whiteSpace: "pre-wrap" }}>
          Your appointment reminder message will be previewed here before it is automatically delivered.
        </div>
        <div style={{ display: "flex", gap: "20px", marginTop: "15px", fontSize: "13px", color: "rgba(244, 245, 243, 0.7)" }}>
          <span><strong>Scheduled time:</strong> —</span>
          <span><strong>Sent time:</strong> —</span>
        </div>
      </div>

      {selectedAppointment && (
        <div className="modal-overlay" onClick={() => setSelectedAppointment(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h2 className="modal-title">Reminder Details</h2>
              <button className="modal-close-btn" onClick={() => setSelectedAppointment(null)}>×</button>
            </div>
            <div className="modal-body" style={{ lineHeight: 1.8 }}>
              <p><strong>Customer:</strong> {selectedAppointment.customer} {selectedAppointment.phone ? `(${selectedAppointment.phone})` : ""}</p>
              <p><strong>Service:</strong> {selectedAppointment.department}</p>
              <p><strong>Status:</strong> {selectedAppointment.status}</p>
              <p><strong>Scheduled Time:</strong> {selectedAppointment.appointment_date} at {selectedAppointment.appointment_time}</p>
              <p><strong>Message Template:</strong> {selectedAppointment.reminder || "Appointment reminder template"}</p>
              <p><strong>Notes:</strong> {selectedAppointment.notes || "None"}</p>
              
              <div className="modal-notice-box" style={{ marginTop: "15px", whiteSpace: "pre-wrap" }}>
                <strong>Preview Message:</strong><br/><br/>
                Hi {selectedAppointment.customer}, this is a reminder for your upcoming {selectedAppointment.department} appointment on {selectedAppointment.appointment_date} at {selectedAppointment.appointment_time}. Please reply YES to confirm.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setSelectedAppointment(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
