import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./calendarConfig.css";
import ConnectMicrosoftCalendarModal from "../../components/modals/ConnectMicrosoftCalendarModal.jsx";
import { 
  getCalendarConfig, 
  updateCalendarConfig, 
  getGoogleAuthUrl, 
  disconnectGoogle 
} from "../../services/calendar.service.js";

// SVG Icons
const GoogleCalendarIcon = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#FFFFFF" />
    <path d="M35 14H33V11H29V14H19V11H15V14H13C11.8954 14 11 14.8954 11 16V36C11 37.1046 11.8954 38 13 38H35C36.1046 38 37 37.1046 37 36V16C37 14.8954 36.1046 14 35 14Z" fill="#E8EAED" />
    <path d="M35 14H13C11.8954 14 11 14.8954 11 16V21H37V16C37 14.8954 36.1046 14 35 14Z" fill="#4285F4" />
    <path d="M11 21H37V36C37 37.1046 36.1046 38 35 38H13C11.8954 38 11 37.1046 11 36V21Z" fill="#FFFFFF" />
    <circle cx="19" cy="27" r="2.5" fill="#EA4335" />
    <circle cx="29" cy="27" r="2.5" fill="#FBBC04" />
    <circle cx="19" cy="33" r="2.5" fill="#34A853" />
    <circle cx="29" cy="33" r="2.5" fill="#4285F4" />
  </svg>
);

const MicrosoftCalendarIcon = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="10" fill="#0078D4" fillOpacity="0.15" />
    <rect x="8" y="10" width="32" height="30" rx="4" stroke="#60A5FA" strokeWidth="2.5" />
    <path d="M8 18H40" stroke="#60A5FA" strokeWidth="2.5" />
    <path d="M16 7V12" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 7V12" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
    <text x="24" y="32" fill="#60A5FA" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">1</text>
  </svg>
);

const PrivateCalendarIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function CalendarConfig() {
  const navigate = useNavigate();
  const [isMicrosoftModalOpen, setIsMicrosoftModalOpen] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [activeCalendar, setActiveCalendar] = useState({
    name: "Not Connected",
    email: "",
    connected: false
  });

  const [schedule, setSchedule] = useState({
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    startTime: "09:00",
    endTime: "17:00",
    breakStart: "13:00",
    breakEnd: "14:00",
    servicesHandledByStaff: true,
    defaultAppointmentDuration: 30,
    staffAppointmentDuration: 30,
    onlineBooking: true,
    staffAvailability: true,
    leaveManagement: true,
    holidayBlocking: true
  });

  const updateSchedule = (field, value) => {
    setSchedule(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const toggleDay = (day) => {
    setSchedule(prev => {
      const exists = prev.workingDays.includes(day);
      const updated = exists
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day];
      return { ...prev, workingDays: updated };
    });
    setSaveSuccess(false);
  };

  const [savedMsg, setSavedMsg] = useState("");

  const loadLiveConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getCalendarConfig();
      if (data) {
        const isConnected = data.connected === "connected";
        setActiveCalendar({
          name: data.provider || (isConnected ? "Google Calendar" : "Not Connected"),
          email: data.email || "",
          connected: isConnected
        });

        // Populate live schedule and availability from DB
        setSchedule({
          workingDays: data.working_days ? data.working_days.split(",").map(d => d.trim()).filter(Boolean) : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          startTime: data.start_time || "09:00",
          endTime: data.end_time || "17:00",
          breakStart: data.break_start || "13:00",
          breakEnd: data.break_end || "14:00",
          servicesHandledByStaff: data.services_handled_by_staff !== undefined ? data.services_handled_by_staff : true,
          defaultAppointmentDuration: data.default_appointment_duration || 30,
          staffAppointmentDuration: data.staff_appointment_duration || 30,
          onlineBooking: data.online_booking !== undefined ? data.online_booking : true,
          staffAvailability: data.staff_availability !== undefined ? data.staff_availability : true,
          leaveManagement: data.leave_management !== undefined ? data.leave_management : true,
          holidayBlocking: data.holiday_blocking !== undefined ? data.holiday_blocking : true
        });
      }
    } catch (err) {
      console.error("Failed to load live calendar config:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Load saved working hours & availability schedule
    const saved = localStorage.getItem("receptionist_calendar_schedule");
    if (saved) {
      try {
        setSchedule(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {
        console.error("Failed to parse cached schedule", e);
      }
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "connected") {
      const email = params.get("email") || "";
      setActiveCalendar({
        name: "Google Calendar",
        email: email,
        connected: true
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get("status") === "error") {
      const errorMsg = params.get("error") || "OAuth connection failed";
      alert(`Google Calendar Connection Error: ${errorMsg}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    loadLiveConfig();
  }, [loadLiveConfig]);

  const handleSaveSchedule = () => {
    localStorage.setItem("receptionist_calendar_schedule", JSON.stringify(schedule));
    setSavedMsg("Calendar & Working Hours Saved Successfully!");
    setTimeout(() => setSavedMsg(""), 3500);
  };

  // Initiate LIVE Google OAuth Flow
  const handleConnectGoogle = async () => {
    try {
      setIsConnectingGoogle(true);
      const data = await getGoogleAuthUrl();
      if (data && data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error("No authorization URL returned by server");
      }
    } catch (err) {
      console.error("Failed to start Google OAuth flow:", err);
      alert("Failed to initiate Google Calendar connection: " + (err.response?.data?.detail || err.message));
      setIsConnectingGoogle(false);
    }
  };

  // Live Disconnect
  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect Google Calendar?")) return;
    try {
      setIsDisconnecting(true);
      await disconnectGoogle();
      setActiveCalendar({
        name: "Not Connected",
        email: "",
        connected: false
      });
      await loadLiveConfig();
    } catch (err) {
      console.error("Disconnect failed:", err);
      alert("Failed to disconnect calendar: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Save Working Hours & Settings to DB
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      await updateCalendarConfig({
        working_days: schedule.workingDays.join(","),
        start_time: schedule.startTime,
        end_time: schedule.endTime,
        break_start: schedule.breakStart,
        break_end: schedule.breakEnd,
        default_appointment_duration: Number(schedule.defaultAppointmentDuration) || 30,
        staff_appointment_duration: Number(schedule.staffAppointmentDuration) || 30,
        services_handled_by_staff: Boolean(schedule.servicesHandledByStaff),
        staff_availability: Boolean(schedule.staffAvailability),
        leave_management: Boolean(schedule.leaveManagement),
        holiday_blocking: Boolean(schedule.holidayBlocking),
        online_booking: Boolean(schedule.onlineBooking)
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to save schedule settings:", err);
      alert("Failed to save settings: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectMicrosoft = async (data) => {
    try {
      await updateCalendarConfig({
        provider: "Microsoft Calendar",
        email: data.email || "admin@company.com",
        connected: "connected"
      });
      await loadLiveConfig();
    } catch (err) {
      console.error(err);
    }
  };

  const isGoogleConnected = activeCalendar.connected && activeCalendar.name.toLowerCase().includes("google");

  return (
    <section id="calendarconfig" className="page active calendar-config-page">
      {/* Header */}
      <div className="calendar-config-header">
        <div>
          <h1 className="title">Calendar Integration</h1>
          <p className="subtitle">Choose where the AI receptionist checks availability</p>
        </div>
      </div>

      {/* 3 Provider Cards */}
      <div className="calendar-providers-grid">
        {/* Google Calendar Card */}
        <div className={`provider-card ${isGoogleConnected ? "active-border" : ""}`}>
          <div className="provider-icon-wrapper google-icon-bg">
            <GoogleCalendarIcon />
          </div>
          <h3 className="provider-card-title">Google Calendar</h3>
          <p className="provider-card-desc">
            Connect Google Calendar to automatically check availability and create appointments.
          </p>
          <button
            type="button"
            className="provider-card-btn btn-lime"
            onClick={handleConnectGoogle}
            disabled={isConnectingGoogle}
          >
            {isConnectingGoogle 
              ? "Connecting to Google..." 
              : isGoogleConnected 
              ? "Re-authorize Google" 
              : "Connect Google Calendar"}
          </button>
        </div>

        {/* Microsoft Calendar Card */}
        <div className="provider-card">
          <div className="provider-icon-wrapper">
            <MicrosoftCalendarIcon />
          </div>
          <h3 className="provider-card-title">Microsoft Calendar</h3>
          <p className="provider-card-desc">
            Connect Microsoft 365 / Outlook calendar for appointment management.
          </p>
          <button
            type="button"
            className="provider-card-btn btn-lime"
            onClick={() => setIsMicrosoftModalOpen(true)}
          >
            Connect Microsoft Calendar
          </button>
        </div>

        {/* Private Calendar Card */}
        <div className="provider-card">
          <div className="provider-icon-wrapper">
            <PrivateCalendarIcon />
          </div>
          <h3 className="provider-card-title">Private Calendar</h3>
          <p className="provider-card-desc">
            Use your own calendar system through API integration.
          </p>
          <button
            type="button"
            className="provider-card-btn btn-outline"
            onClick={() => navigate("/admin/calendar-integration/private")}
          >
            Configure Private Calendar
          </button>
        </div>
      </div>

      {/* Active Calendar Section */}
      <div className="config-section-card">
        <div className="config-section-title">
          <span>Active Calendar</span>
        </div>

        {activeCalendar.connected ? (
          <div className="active-calendar-row">
            <div className="active-calendar-info">
              <h4>{activeCalendar.name}</h4>
              <p>{activeCalendar.email ? `Connected as ${activeCalendar.email}` : "Active authorized account"}</p>
            </div>
            <div className="active-calendar-actions">
              <span className="status-badge-connected">CONNECTED</span>
              <button
                type="button"
                className="btn-disconnect"
                disabled={isDisconnecting}
                onClick={handleDisconnect}
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <div className="active-calendar-row">
            <div className="active-calendar-info">
              <h4>No Calendar Connected</h4>
              <p>Please connect a calendar above to enable real-time booking synchronization.</p>
            </div>
            <div className="active-calendar-actions">
              <span className="status-badge-disconnected">DISCONNECTED</span>
            </div>
          </div>
        )}
      </div>

      {/* Working Hours & Availability Section */}
      <div className="config-section-card">
        <div className="config-section-title">
          <span>Working Hours &amp; Availability</span>
        </div>

        {/* Working Days */}
        <label className="working-days-label">Working Days</label>
        <div className="days-pills-row">
          {ALL_DAYS.map(day => {
            const isActive = schedule.workingDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                className={`day-pill-btn ${isActive ? "active" : "inactive"}`}
                onClick={() => toggleDay(day)}
              >
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>

        {/* Start / End & Break Hours */}
        <div className="form-grid-2">
          <div className="config-input-group">
            <label>Start working time</label>
            <input
              type="time"
              className="config-input-control"
              value={schedule.startTime}
              onChange={e => updateSchedule("startTime", e.target.value)}
            />
          </div>
          <div className="config-input-group">
            <label>End working time</label>
            <input
              type="time"
              className="config-input-control"
              value={schedule.endTime}
              onChange={e => updateSchedule("endTime", e.target.value)}
            />
          </div>
          <div className="config-input-group">
            <label>Break start</label>
            <input
              type="time"
              className="config-input-control"
              value={schedule.breakStart}
              onChange={e => updateSchedule("breakStart", e.target.value)}
            />
          </div>
          <div className="config-input-group">
            <label>Break end</label>
            <input
              type="time"
              className="config-input-control"
              value={schedule.breakEnd}
              onChange={e => updateSchedule("breakEnd", e.target.value)}
            />
          </div>
        </div>

        {/* Booking & Staff Settings Toggles */}
        <div style={{ marginTop: "10px" }}>
          <label className="working-days-label" style={{ marginBottom: "14px" }}>Booking &amp; Staff Settings</label>
          <div className="settings-toggles-container">
            {[
              ["servicesHandledByStaff", "Services handled by staff"],
              ["staffAvailability", "Staff-specific availability"],
              ["leaveManagement", "Leave management"],
              ["holidayBlocking", "Holiday / blocked dates"],
              ["onlineBooking", "Enable online booking"]
            ].map(([key, labelText]) => (
              <div 
                key={key} 
                className="setting-toggle-row"
                onClick={() => updateSchedule(key, !schedule[key])}
              >
                <span className="setting-toggle-label">{labelText}</span>
                <label className="switch-wrapper" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={Boolean(schedule[key])}
                    onChange={e => updateSchedule(key, e.target.checked)}
                  />
                  <span className="switch-slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Durations */}
        <div className="form-grid-2" style={{ marginTop: "20px" }}>
          <div className="config-input-group">
            <label>Default appointment duration (minutes)</label>
            <input
              type="number"
              min="5"
              step="5"
              className="config-input-control"
              value={schedule.defaultAppointmentDuration}
              onChange={e => updateSchedule("defaultAppointmentDuration", Number(e.target.value))}
            />
          </div>
          <div className="config-input-group">
            <label>Staff-specific appointment duration (minutes)</label>
            <input
              type="number"
              min="5"
              step="5"
              className="config-input-control"
              value={schedule.staffAppointmentDuration}
              onChange={e => updateSchedule("staffAppointmentDuration", Number(e.target.value))}
            />
          </div>
        </div>

        {/* Staff Calendar Connection Notice */}
        <div className="info-callout-banner">
          <h5>Staff Calendar Connection</h5>
          <p>
            {activeCalendar.connected
              ? `${activeCalendar.name} is currently connected for ${activeCalendar.email || "your account"}. Inbound calls and web bookings check real-time availability.`
              : "Connect Google or Microsoft Calendar above to enable automatic staff calendar availability and booking sync."}
          </p>
        </div>

        {/* Save Changes Bar */}
        <div className="save-actions-bar">
          {saveSuccess && (
            <span className="save-success-msg">
              ✓ Availability settings saved successfully!
            </span>
          )}
          <button
            type="button"
            className="provider-card-btn btn-lime"
            style={{ width: "auto", minWidth: "160px" }}
            onClick={handleSaveSettings}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Microsoft Modal */}
      <ConnectMicrosoftCalendarModal
        isOpen={isMicrosoftModalOpen}
        onClose={() => setIsMicrosoftModalOpen(false)}
        onConnect={handleConnectMicrosoft}
      />
    


    </section>
  );
}
