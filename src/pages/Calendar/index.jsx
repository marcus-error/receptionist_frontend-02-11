import { useState, useMemo, useEffect, useCallback } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";
import BlockTimeModal from "../../components/modals/BlockTimeModal.jsx";
import useApi from "../../hooks/useApi.js";
import staffService from "../../services/staff.service.js";
import appointmentsService from "../../services/appointments.service.js";
import { getCalendarEvents, getCalendarConfig, getGoogleAuthUrl, disconnectGoogle } from "../../services/calendar.service.js";
import { useCall } from "../../context/CallContext.jsx";
import { useNavigate } from "react-router-dom";

const localizer = momentLocalizer(moment);

export default function CalendarPage() {
  const { data: staffList } = useApi(staffService.getAll, [], []);
  const [appointments, setAppointments] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [calendarConfig, setCalendarConfig] = useState(null);

  const { socket } = useCall();
  
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [googleAuthError, setGoogleAuthError] = useState(null);
  const [blockedEvents, setBlockedEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [staffFilter, setStaffFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");

  const loadData = useCallback(async () => {
    try {
      setIsSyncing(true);
      const [apptsData, cfg] = await Promise.allSettled([
        appointmentsService.getAll(),
        getCalendarConfig()
      ]);

      if (apptsData.status === "fulfilled" && apptsData.value) {
        const rawAppts = Array.isArray(apptsData.value)
          ? apptsData.value
          : Array.isArray(apptsData.value?.data)
          ? apptsData.value.data
          : [];
        setAppointments(rawAppts);
      }

      const activeCfg = cfg.status === "fulfilled" ? cfg.value : null;
      setCalendarConfig(activeCfg);

      if (activeCfg && activeCfg.connected === "connected") {
        const start = moment(currentDate).startOf("month").subtract(7, "days").toISOString();
        const end = moment(currentDate).endOf("month").add(7, "days").toISOString();
        try {
          const gEvents = await getCalendarEvents(start, end);
          if (Array.isArray(gEvents)) {
            setGoogleEvents(gEvents);
            setGoogleAuthError(null);
          }
        } catch (err) {
          console.warn("Could not load Google Calendar events:", err);
          if (err?.message?.includes("expired") || err?.response?.status === 401 || err?.message?.includes("401")) {
            setGoogleAuthError("Google Calendar authentication expired. Please reconnect in Calendar Settings.");
          }
        }
      } else {
        setGoogleEvents([]);
        setGoogleAuthError(null);
      }
    } catch (err) {
      console.error("Failed to sync calendar data:", err);
    } finally {
      setIsSyncing(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Real-time synchronization when inbound AI call schedules an appointment
  useEffect(() => {
    if (!socket) return;

    const handleAppointmentEvent = (payload) => {
      console.log("[Calendar] Received real-time appointment event:", payload);
      loadData();
    };

    socket.on("appointment_created", handleAppointmentEvent);
    socket.on("appointment_updated", handleAppointmentEvent);
    socket.on("appointment_cancelled", handleAppointmentEvent);

    return () => {
      socket.off("appointment_created", handleAppointmentEvent);
      socket.off("appointment_updated", handleAppointmentEvent);
      socket.off("appointment_cancelled", handleAppointmentEvent);
    };
  }, [socket, loadData]);

  // Convert appointments, Google events, and blocked/leave data into calendar events.
  const departments = [...new Set((staffList || []).map(s => s.department).filter(Boolean))];
  const providers = ["all", "Google Calendar", "Microsoft Calendar", "Private Calendar"];

  const events = useMemo(() => {
    const apptEvents = (appointments || [])
      .filter(appt => {
        const staffMatch = staffFilter === "all" || appt.staff === staffFilter || appt.staff_id === staffFilter;
        const deptMatch = departmentFilter === "all" ||
          appt.department === departmentFilter ||
          (staffList || []).some(s => (s.name === appt.staff || s.id === appt.staff_id) && s.department === departmentFilter);
        const providerMatch = providerFilter === "all" || appt.provider === providerFilter || appt.calendar_provider === providerFilter;
        return staffMatch && deptMatch && providerMatch;
      })
      .map(appt => {
        const dateStr = `${appt.appointment_date || ""} ${appt.appointment_time || ""}`.trim();
        const dateFormats = [
          "DD MMM YYYY hh:mm A",
          "DD MMM YYYY h:mm A",
          "DD MMM YYYY HH:mm",
          "DD MMMM YYYY hh:mm A",
          "YYYY-MM-DD HH:mm",
          "YYYY-MM-DD hh:mm A",
          "YYYY-MM-DD h:mm A",
          "DD-MM-YYYY hh:mm A",
          "DD-MM-YYYY h:mm A",
          "DD-MM-YYYY HH:mm",
          "MM/DD/YYYY hh:mm A",
          "DD/MM/YYYY hh:mm A",
          "YYYY-MM-DD",
          "DD MMM YYYY"
        ];
        let startMoment = moment(dateStr, dateFormats, true);
        if (!startMoment.isValid()) {
          startMoment = moment(dateStr, dateFormats, false);
        }
        if (!startMoment.isValid() && appt.appointment_date) {
          startMoment = moment(appt.appointment_date, ["DD MMM YYYY", "YYYY-MM-DD", "DD-MM-YYYY"]);
        }
        const start = startMoment.isValid() ? startMoment.toDate() : new Date();
        const durationMins = Number(appt.duration) || (appt.duration && parseInt(appt.duration)) || 30;
        const end = moment(start).add(durationMins, "minutes").toDate();
        return {
          id: `appt-${appt.id}`,
          title: `📅 ${appt.customer || "Customer"} - ${appt.staff || "Staff"} (${appt.appointment_time || "30m"})`,
          start,
          end,
          resource: { ...appt, eventType: "booked" }
        };
      });

    // Map external Google Calendar events (excluding ones already matching local appointment IDs)
    const externalGoogleEvents = (googleEvents || [])
      .filter(gEv => {
        if (providerFilter !== "all" && providerFilter !== "Google Calendar") return false;
        // Exclude if already represented by an appointment
        const isAlreadyAppt = (appointments || []).some(a => 
          (a.notes && a.notes.includes(gEv.id)) ||
          (gEv.description && gEv.description.includes(`Appointment ID: ${a.id}`))
        );
        return !isAlreadyAppt;
      })
      .map(gEv => {
        const start = gEv.start ? new Date(gEv.start) : new Date();
        const end = gEv.end ? new Date(gEv.end) : moment(start).add(30, "minutes").toDate();
        return {
          id: `google-${gEv.id}`,
          title: `🌐 [Google] ${gEv.summary || "Event"}`,
          start,
          end,
          resource: { ...gEv, eventType: "google" }
        };
      });

    return [...apptEvents, ...externalGoogleEvents, ...blockedEvents];
  }, [appointments, googleEvents, blockedEvents, staffFilter, departmentFilter, providerFilter, staffList]);

  const staffNames = [...new Set((staffList || []).map(s => s.name).filter(Boolean))];

  const handleBlockTime = (blockData) => {
    // Add blocked time to local state for demo purposes
    // Note: The previous modal implementation likely passes simple values. 
    // We mock a duration here.
    const start = blockData.date ? moment(blockData.date).toDate() : new Date();
    const end = moment(start).add(1, 'hour').toDate(); // Default 1 hour block
    
    const newBlock = {
      id: `block-${Date.now()}`,
      title: `BLOCKED: ${blockData.staff} ${blockData.reason ? "("+blockData.reason+")" : ""}`,
      start,
      end,
      isBlocked: true
    };
    
    setBlockedEvents(prev => [...prev, newBlock]);
  };

  const eventStyleGetter = (event) => {
    const type = event.resource?.eventType || (event.isBlocked ? "blocked" : "booked");
    const isBlocked = type === "blocked";
    const isLeave = type === "leave";
    const isAvailable = type === "available";
    const isGoogle = type === "google";
    const style = {
      backgroundColor: isBlocked 
        ? "var(--danger-bg)" 
        : isLeave 
        ? "var(--badge-yellow-bg)" 
        : isAvailable 
        ? "var(--badge-green-bg)" 
        : isGoogle
        ? "#f3e8ff"
        : "var(--badge-blue-bg)",
      color: isBlocked 
        ? "var(--danger)" 
        : isLeave 
        ? "var(--badge-yellow-fg)" 
        : isAvailable 
        ? "var(--badge-green-fg)" 
        : isGoogle
        ? "#7e22ce"
        : "var(--badge-blue-fg)",
      borderRadius: '6px',
      border: isBlocked 
        ? "1px solid var(--danger-border)" 
        : isLeave 
        ? "1px solid rgba(245, 158, 11, 0.3)" 
        : isAvailable 
        ? "1px solid rgba(22, 101, 52, 0.3)" 
        : isGoogle
        ? "1px solid #c084fc"
        : "1px solid rgba(7, 89, 133, 0.3)",
      padding: '3px 8px',
      fontWeight: '700',
      fontSize: '0.85em',
      display: 'block'
    };
    return { style };
  };

  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedYear(now.getFullYear());
  };

  const changePeriod = (direction) => {
    const amount = direction === "next" ? 1 : -1;
    if (calendarView === "year") {
      const year = selectedYear + amount;
      setSelectedYear(year);
      setCurrentDate(new Date(year, currentDate.getMonth(), 1));
    } else if (calendarView === "day") {
      const nextDate = moment(currentDate).add(amount, "day").toDate();
      setCurrentDate(nextDate);
      setSelectedYear(nextDate.getFullYear());
    } else if (calendarView === "week") {
      const nextDate = moment(currentDate).add(amount, "week").toDate();
      setCurrentDate(nextDate);
      setSelectedYear(nextDate.getFullYear());
    } else {
      const nextDate = moment(currentDate).add(amount, "month").toDate();
      setCurrentDate(nextDate);
      setSelectedYear(nextDate.getFullYear());
    }
  };

  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectGoogle = async () => {
    try {
      setIsConnecting(true);
      const data = await getGoogleAuthUrl();
      if (data && data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err) {
      alert("Failed to start Google Calendar authorization: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <section id="calendar" className="page active" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {googleAuthError && (
        <div style={{
          background: "rgba(245, 158, 11, 0.15)",
          color: "#f59e0b",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          padding: "10px 16px",
          borderRadius: "8px",
          marginBottom: "15px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "13px"
        }}>
          <span>⚠️ {googleAuthError}</span>
          <button
            className="btn"
            style={{ fontSize: "12px", padding: "4px 10px" }}
            onClick={() => setGoogleAuthError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="header" style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h1 className="title">Appointment Calendar</h1>
          <p className="subtitle">Dynamic staff availability, appointments, blocks and Google Calendar sync</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {calendarConfig && calendarConfig.connected === "connected" ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ 
                background: "rgba(34, 197, 94, 0.15)", 
                color: "#22c55e", 
                border: "1px solid rgba(34, 197, 94, 0.3)", 
                padding: "6px 12px", 
                borderRadius: "6px", 
                fontSize: "13px", 
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                Google Connected ({calendarConfig.email || "Active"})
              </span>
              <button 
                className="btn" 
                onClick={() => navigate("/admin/calendar-integration")}
                title="Calendar Settings"
              >
                ⚙ Settings
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ 
                background: "rgba(239, 68, 68, 0.15)", 
                color: "#ef4444", 
                border: "1px solid rgba(239, 68, 68, 0.3)", 
                padding: "6px 12px", 
                borderRadius: "6px", 
                fontSize: "13px", 
                fontWeight: "600" 
              }}>
                Google: Not Connected
              </span>
              <button
                className="btn primary"
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
                onClick={handleConnectGoogle}
                disabled={isConnecting}
              >
                {isConnecting ? "Connecting..." : "🔗 Connect Google Calendar"}
              </button>
            </div>
          )}

          <button
            className="btn"
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
            onClick={loadData}
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing..." : "🔄 Sync Calendar"}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "15px", padding: "12px 16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <button className="btn" onClick={() => changePeriod("prev")}>‹ Previous</button>
          <button className="btn" onClick={goToday}>Today</button>
          <button className="btn" onClick={() => changePeriod("next")}>Next ›</button>

          <select className="btn" style={{ width: "auto", minWidth: "110px" }} value={calendarView} onChange={e => setCalendarView(e.target.value)}>
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
            <option value="agenda">Agenda</option>
            <option value="year">Year</option>
          </select>

          <select className="btn" style={{ width: "auto", minWidth: "90px" }} value={selectedYear}
            onChange={e => {
              const y = Number(e.target.value);
              setSelectedYear(y);
              setCurrentDate(new Date(y, currentDate.getMonth(), 1));
            }}>
            {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y =>
              <option key={y} value={y}>{y}</option>
            )}
          </select>

          <select className="btn" style={{ width: "auto", minWidth: "130px" }} value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
            <option value="all">All Staff</option>
            {staffNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>

          <select className="btn" style={{ width: "auto", minWidth: "140px" }} value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select className="btn" style={{ width: "auto", minWidth: "160px" }} value={providerFilter} onChange={e => setProviderFilter(e.target.value)}>
            {providers.map(p => <option key={p} value={p}>{p === "all" ? "All Calendar Providers" : p}</option>)}
          </select>

          <button className="btn primary" style={{ marginLeft: "auto" }} onClick={() => setIsBlockModalOpen(true)}>+ Block Time</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "15px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", fontSize: "13px", fontWeight: "600" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#38bdf8", display: "inline-block" }}></span>
            Booked Appointments
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#c084fc", display: "inline-block" }}></span>
            Google Calendar Events
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#ef4444", display: "inline-block" }}></span>
            Blocked Slots
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#f59e0b", display: "inline-block" }}></span>
            Leave
          </span>
        </div>
      </div>

      <div className="calendar-container card" style={{ flex: 1, padding: "20px", minHeight: "600px" }}>
        {calendarView === "year" ? (
          <YearView
            year={selectedYear}
            events={events}
            onSelectMonth={(monthIdx) => {
              setCurrentDate(new Date(selectedYear, monthIdx, 1));
              setCalendarView("month");
            }}
            onSelectDate={(date) => {
              setCurrentDate(date);
              setCalendarView("day");
            }}
          />
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            eventPropGetter={eventStyleGetter}
            date={currentDate}
            onNavigate={(newDate) => {
              setCurrentDate(newDate);
              setSelectedYear(newDate.getFullYear());
            }}
            view={["month", "week", "day", "agenda"].includes(calendarView) ? calendarView : "month"}
            onView={(newView) => setCalendarView(newView)}
            views={["month", "week", "day", "agenda"]}
            popup
            selectable
            onSelectEvent={(event) => setSelectedEvent(event)}
          />
        )}
      </div>

      <BlockTimeModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        onBlock={handleBlockTime}
        staffList={staffList}
      />

      <AppointmentDetailsModal
        isOpen={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </section>
  );
}

function YearView({ year, events, onSelectMonth, onSelectDate }) {
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIdx) => {
      const monthStart = moment([year, monthIdx, 1]);
      const monthName = monthStart.format("MMMM");
      const daysInMonth = monthStart.daysInMonth();
      const firstDayOfWeek = monthStart.day(); // 0 for Sunday
      
      const monthEvents = (events || []).filter(e => {
        const start = moment(e.start);
        return start.isValid() && start.year() === year && start.month() === monthIdx;
      });

      const eventsByDay = {};
      monthEvents.forEach(e => {
        const d = moment(e.start).date();
        if (!eventsByDay[d]) eventsByDay[d] = [];
        eventsByDay[d].push(e);
      });

      return {
        monthIdx,
        monthName,
        daysInMonth,
        firstDayOfWeek,
        eventCount: monthEvents.length,
        eventsByDay
      };
    });
  }, [year, events]);

  const weekDayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const today = new Date();
  const isCurrentYear = today.getFullYear() === year;
  const currentMonth = today.getMonth();
  const currentDateNum = today.getDate();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px", gap: "10px" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--heading)", margin: 0 }}>
          Year Overview — {year}
        </h2>
        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          Click any month header to view that month or click any date to jump to that day
        </span>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: "16px"
      }}>
        {months.map(m => (
          <div
            key={m.monthIdx}
            style={{
              background: "var(--panel)",
              border: (isCurrentYear && currentMonth === m.monthIdx) ? "1.5px solid var(--primary)" : "1px solid var(--line)",
              borderRadius: "var(--radius-lg, 10px)",
              padding: "12px 14px",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => onSelectMonth(m.monthIdx)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  fontSize: "0.95rem",
                  fontWeight: "700",
                  color: (isCurrentYear && currentMonth === m.monthIdx) ? "var(--primary)" : "var(--heading)",
                  cursor: "pointer",
                  textAlign: "left"
                }}
                title={`Open ${m.monthName} ${year}`}
              >
                {m.monthName} ↗
              </button>
              {m.eventCount > 0 ? (
                <span style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "2px 7px",
                  borderRadius: "12px",
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8"
                }}>
                  {m.eventCount} {m.eventCount === 1 ? "event" : "events"}
                </span>
              ) : (
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>—</span>
              )}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              fontSize: "11px",
              fontWeight: "600",
              color: "var(--muted)",
              marginBottom: "2px"
            }}>
              {weekDayLabels.map(dayLabel => (
                <div key={dayLabel} style={{ padding: "2px 0" }}>{dayLabel}</div>
              ))}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              gap: "2px",
              fontSize: "11px"
            }}>
              {Array.from({ length: m.firstDayOfWeek }).map((_, i) => (
                <div key={`blank-${i}`} style={{ height: "26px" }} />
              ))}
              {Array.from({ length: m.daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isToday = isCurrentYear && currentMonth === m.monthIdx && currentDateNum === dayNum;
                const dayEvents = m.eventsByDay[dayNum] || [];
                const hasEvents = dayEvents.length > 0;
                const dateObj = new Date(year, m.monthIdx, dayNum);

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => onSelectDate(dateObj)}
                    title={hasEvents ? `${dayEvents.length} event(s) on ${m.monthName} ${dayNum}` : `${m.monthName} ${dayNum}`}
                    style={{
                      height: "26px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "4px",
                      border: "none",
                      background: isToday ? "var(--primary)" : hasEvents ? "rgba(56, 189, 248, 0.15)" : "transparent",
                      color: isToday ? "#ffffff" : "var(--fg)",
                      fontWeight: isToday || hasEvents ? "700" : "500",
                      cursor: "pointer",
                      position: "relative",
                      padding: 0
                    }}
                  >
                    <span>{dayNum}</span>
                    {hasEvents && !isToday && (
                      <span style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        background: "#38bdf8",
                        position: "absolute",
                        bottom: "2px"
                      }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentDetailsModal({ isOpen, onClose, event }) {
  if (!isOpen || !event) return null;

  const res = event.resource || {};
  const isGoogle = res.eventType === "google";
  const isBlocked = event.isBlocked || res.eventType === "blocked";
  const isBooked = !isGoogle && !isBlocked;

  const customerName = res.customer || res.patient_name || res.caller_name || event.title?.replace(/^📅\s*/, '').split('-')[0]?.trim() || "Customer";
  const staffName = res.staff || res.doctor || res.staff_name || "Assigned Staff";
  const department = res.department || res.specialty || res.service || "General";
  const phone = res.phone || res.contact_number || res.caller_phone || "Not provided";
  const email = res.email || "Not provided";
  const appointmentDate = res.appointment_date || moment(event.start).format("DD MMM YYYY");
  const appointmentTime = res.appointment_time || moment(event.start).format("hh:mm A");
  const duration = res.duration || "30 Minutes";
  const status = res.status || "Confirmed";
  const notes = res.notes || (isBooked ? "Booked via AI Voice Receptionist Inbound Call" : "");
  const appointmentId = res.id || event.id;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--panel, #18181b)",
          border: "1px solid var(--line, #27272a)",
          borderRadius: "12px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          padding: "24px",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
          <div>
            <span style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
              background: isGoogle ? "rgba(192, 132, 252, 0.15)" : isBlocked ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 189, 248, 0.15)",
              color: isGoogle ? "#c084fc" : isBlocked ? "#ef4444" : "#38bdf8",
              marginBottom: "8px"
            }}>
              {isGoogle ? "🌐 Google Calendar Event" : isBlocked ? "⛔ Blocked Time Slot" : "📅 Booked Appointment"}
            </span>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--heading, #fff)" }}>
              {isGoogle ? (res.summary || event.title) : isBlocked ? event.title : customerName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn"
            style={{ padding: "4px 10px", fontSize: "16px", lineHeight: "1" }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {isBooked && (
          <div className="modal-grid" style={{ gap: "14px", fontSize: "13px" }}>
            <div>
              <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Customer
              </span>
              <strong style={{ color: "var(--heading, #fff)" }}>{customerName}</strong>
            </div>

            <div>
              <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Booking Status
              </span>
              <span style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: "600",
                background: status === "Cancelled" ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                color: status === "Cancelled" ? "#ef4444" : "#22c55e"
              }}>
                {status}
              </span>
            </div>

            <div>
              <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Phone Number
              </span>
              <span style={{ color: "var(--fg, #e2e8f0)" }}>{phone}</span>
            </div>

            <div>
              <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Email Address
              </span>
              <span style={{ color: "var(--fg, #e2e8f0)" }}>{email}</span>
            </div>

            <div>
              <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Staff / Doctor
              </span>
              <span style={{ color: "var(--fg, #e2e8f0)" }}>{staffName}</span>
            </div>

            <div>
              <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Department / Service
              </span>
              <span style={{ color: "var(--fg, #e2e8f0)" }}>{department}</span>
            </div>

            <div>
              <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Date & Time
              </span>
              <span style={{ color: "var(--fg, #e2e8f0)" }}>{appointmentDate} at {appointmentTime}</span>
            </div>

            <div>
              <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Duration & Reference
              </span>
              <span style={{ color: "var(--fg, #e2e8f0)" }}>{duration} (Ref #{appointmentId})</span>
            </div>

            {notes && (
              <div style={{ gridColumn: "span 2", marginTop: "6px", background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "6px", border: "1px solid var(--line, #27272a)" }}>
                <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Notes & Details
                </span>
                <span style={{ color: "var(--fg, #e2e8f0)", fontSize: "12px", whiteSpace: "pre-wrap" }}>{notes}</span>
              </div>
            )}
          </div>
        )}

        {isGoogle && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", fontSize: "13px" }}>
            <div>
              <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Start & End Time
              </span>
              <span style={{ color: "var(--fg, #e2e8f0)" }}>
                {moment(event.start).format("DD MMM YYYY, hh:mm A")} - {moment(event.end).format("hh:mm A")}
              </span>
            </div>
            {res.description && (
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "6px", border: "1px solid var(--line, #27272a)" }}>
                <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                  Description
                </span>
                <span style={{ color: "var(--fg, #e2e8f0)", fontSize: "12px", whiteSpace: "pre-wrap" }}>{res.description}</span>
              </div>
            )}
            {res.htmlLink && (
              <div>
                <a href={res.htmlLink} target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", textDecoration: "underline", fontSize: "12px" }}>
                  Open in Google Calendar ↗
                </a>
              </div>
            )}
          </div>
        )}

        {isBlocked && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", fontSize: "13px" }}>
            <div>
              <span style={{ color: "var(--muted, #94a3b8)", display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Time Range
              </span>
              <span style={{ color: "var(--fg, #e2e8f0)" }}>
                {moment(event.start).format("DD MMM YYYY, hh:mm A")} - {moment(event.end).format("hh:mm A")}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
          <button className="btn primary" onClick={onClose} style={{ padding: "8px 20px" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
