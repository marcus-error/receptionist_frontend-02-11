import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  RefreshCw,
  Clock,
  Play,
  Volume2,
  Calendar,
  X,
  FileText,
  Activity,
  CheckCircle2,
  Phone,
} from "lucide-react";
import callService from "../../services/call.service.js";
import API_BASE_URL from "../../config/api.js";
import useAuth from "../../hooks/useAuth.js";
import "./voiceHistory.css";

const BACKEND_BASE = API_BASE_URL.replace(/\/api(?:\/v1)?\/?$/, "");

export function getCallDirection(call) {
  if (!call) return "INBOUND";
  const dir = String(call.direction || "").toLowerCase();
  const type = String(call.call_type || call.type || "").toLowerCase();
  const name = String(call.caller_name || "").toLowerCase();
  const state = String(call.receptionist_state || "").toLowerCase();

  if (
    dir === "outbound" ||
    type === "outbound" ||
    name.startsWith("outbound") ||
    state.includes("outbound") ||
    Boolean(call.lead_id) ||
    Boolean(call.outbound_script)
  ) {
    return "OUTBOUND";
  }
  return "INBOUND";
}

const getRecordingUrl = (call) => {
  if (!call || !call.recording_url) return null;
  if (call.recording_url.startsWith("http")) return call.recording_url;
  return `${BACKEND_BASE}${call.recording_url.startsWith("/") ? "" : "/"}${call.recording_url}`;
};

const parseDurationSec = (durStr) => {
  if (!durStr || durStr === "—") return 0;
  const parts = String(durStr).split(":").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
};

const formatCallTime = (isoString) => {
  if (!isoString || isoString === "—") return { date: "—", time: "—", full: "—" };
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return { date: isoString, time: "", full: isoString };
  return {
    date: d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    full: d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
};

const getCallTimestamps = (call) => {
  const startRaw = call.created_at || call.start_time || call.started_at;
  if (!startRaw) {
    return {
      start: { date: "—", time: "—", full: "—" },
      end: { date: "—", time: "—", full: "—" },
    };
  }

  const startDate = new Date(startRaw);
  const startFormatted = formatCallTime(startRaw);

  const durSec = parseDurationSec(call.duration);
  const updatedRaw = call.updated_at || call.end_time || call.ended_at;

  let endFormatted;
  if (updatedRaw && new Date(updatedRaw).getTime() - startDate.getTime() > 1500) {
    endFormatted = formatCallTime(updatedRaw);
  } else if (durSec > 0) {
    const endDate = new Date(startDate.getTime() + durSec * 1000);
    endFormatted = formatCallTime(endDate.toISOString());
  } else if (
    String(call.status || "").toLowerCase().includes("in-progress") ||
    String(call.status || "").toLowerCase().includes("ringing")
  ) {
    endFormatted = { date: "In Progress", time: "Active", full: "In Progress..." };
  } else {
    endFormatted = startFormatted;
  }

  return { start: startFormatted, end: endFormatted };
};

const getCustomerDetails = (call) => {
  const direction = getCallDirection(call);
  let phone = String(call.customer_number || call.caller_number || call.caller_phone || call.phone || "").trim();
  let name = String(call.customer_name || call.caller_name || "").trim();

  if (phone === "Private Number" || name === "Private Number") {
    return {
      phone: "Private Number",
      name: "Private Number",
      direction: direction,
    };
  }

  // If inbound, discard internal SIP registration credential
  const disallowedDids = ["09410697548", "9410697548"];
  if (direction === "INBOUND" && disallowedDids.some((d) => phone.replace(/\D/g, "").endsWith(d.replace(/\D/g, "")))) {
    phone = "";
  }

  if (direction === "OUTBOUND") {
    if (!name || name.toLowerCase().startsWith("outbound")) {
      name = "Outbound Call";
    }
  } else {
    if (!name || ["Unknown", "Unknown Caller", "SIP Caller", "Customer Mobile", "Customer"].includes(name)) {
      name = phone ? "Inbound Caller" : "Unknown Caller";
    }
  }

  return {
    phone: phone || "—",
    name: name,
    direction: direction,
  };
};

export default function VoiceHistory() {
  const { user } = useAuth();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("all"); // all | INBOUND | OUTBOUND
  const [outcomeFilter, setOutcomeFilter] = useState("all");
  const [selectedCall, setSelectedCall] = useState(null);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const data = await callService.getAll(user?.organization_id || undefined);
      const allCalls = Array.isArray(data) ? data : [];
      setCalls(allCalls);
    } catch (error) {
      console.error("Failed to load voice history calls:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [user?.organization_id]);

  const stats = useMemo(() => {
    let inboundCount = 0;
    let outboundCount = 0;
    calls.forEach((c) => {
      if (getCallDirection(c) === "OUTBOUND") outboundCount++;
      else inboundCount++;
    });
    return {
      total: calls.length,
      inbound: inboundCount,
      outbound: outboundCount,
    };
  }, [calls]);

  const filteredCalls = useMemo(() => {
    const q = search.trim().toLowerCase();
    return calls.filter((call) => {
      const dir = getCallDirection(call);
      if (directionFilter !== "all" && dir !== directionFilter) {
        return false;
      }

      const outcome = String(call.outcome || call.status || call.call_outcome || "Resolved");
      if (outcomeFilter !== "all" && outcome.toLowerCase() !== outcomeFilter.toLowerCase()) {
        return false;
      }

      if (!q) return true;

      const cust = getCustomerDetails(call);
      const text = [
        cust.phone,
        cust.name,
        dir,
        call.intent,
        call.outcome,
        call.status,
        call.caller_said,
        call.ai_response,
        call.rag_source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [calls, search, directionFilter, outcomeFilter]);

  const uniqueOutcomes = useMemo(() => {
    const set = new Set();
    calls.forEach((c) => {
      const out = c.outcome || c.status || c.call_outcome;
      if (out) set.add(out);
    });
    return Array.from(set);
  }, [calls]);

  const getOutcomeClass = (outcome) => {
    const o = String(outcome || "").toLowerCase();
    if (o.includes("fail") || o.includes("err") || o.includes("miss") || o.includes("cancel") || o.includes("lost")) {
      return "failed";
    }
    if (o.includes("pend") || o.includes("progress") || o.includes("ring")) {
      return "pending";
    }
    return "completed";
  };

  return (
    <section id="voicehistory" className="page active voice-history-page">
      {/* Header */}
      <div className="vh-header">
        <div>
          <h1 className="vh-title">
            <Phone size={24} style={{ color: "var(--primary)" }} /> Voice Call History
          </h1>
          <p className="vh-subtitle">
            Unified real-time records of Inbound AI Receptionist calls and Outbound AI voice sessions
          </p>
        </div>

        <button
          className="vh-refresh-btn"
          onClick={fetchCalls}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Metrics Summary Cards */}
      <div className="vh-metrics-grid">
        <div className="vh-metric-card">
          <div className="vh-metric-label">Total Call History</div>
          <div className="vh-metric-value">{stats.total}</div>
        </div>

        <div className="vh-metric-card">
          <div className="vh-metric-label">
            <span className="vh-metric-dot" style={{ background: "var(--val-inbound, #10b981)" }} />
            Inbound Calls
          </div>
          <div className="vh-metric-value vh-val-inbound">{stats.inbound}</div>
        </div>

        <div className="vh-metric-card">
          <div className="vh-metric-label">
            <span className="vh-metric-dot" style={{ background: "var(--accent, #38bdf8)" }} />
            Outbound Calls
          </div>
          <div className="vh-metric-value vh-val-outbound">{stats.outbound}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="vh-filter-card">
        <div className="vh-filter-row">
          <div className="vh-search-wrap">
            <Search size={16} className="vh-search-icon" />
            <input
              type="text"
              className="vh-search-input"
              placeholder="Search by phone number, customer name, intent, outcome, transcript..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Direction Filter */}
          <select
            className="vh-select"
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
          >
            <option value="all">All Directions</option>
            <option value="INBOUND">Inbound Calls Only</option>
            <option value="OUTBOUND">Outbound Calls Only</option>
          </select>

          {/* Outcome Filter */}
          <select
            className="vh-select"
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
          >
            <option value="all">All Status / Outcomes</option>
            {uniqueOutcomes.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Calls Table */}
      <div className="vh-table-container">
        <div className="vh-table-scroll">
          <table className="vh-table">
            <thead>
              <tr className="vh-thead-row">
                <th className="vh-th">Direction</th>
                <th className="vh-th">Call Start</th>
                <th className="vh-th">Call End</th>
                <th className="vh-th">Duration</th>
                <th className="vh-th">Customer / Mobile</th>
                <th className="vh-th">Intent</th>
                <th className="vh-th">Status / Outcome</th>
                <th className="vh-th">Recording</th>
                <th className="vh-th" style={{ textAlign: "right" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "50px 20px", color: "var(--muted)" }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 10px", display: "block" }} />
                    Loading call history records...
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "50px 20px", color: "var(--muted)" }}>
                    No call records found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => {
                  const cust = getCustomerDetails(call);
                  const times = getCallTimestamps(call);
                  const recUrl = getRecordingUrl(call);
                  const isInbound = cust.direction === "INBOUND";
                  const outcomeText = call.outcome || call.status || "Completed";

                  return (
                    <tr key={call.id || call.call_sid} className="vh-tr">
                      {/* Direction Badge */}
                      <td className="vh-td">
                        {isInbound ? (
                          <span className="vh-badge-inbound">
                            <ArrowDownLeft size={13} /> INBOUND
                          </span>
                        ) : (
                          <span className="vh-badge-outbound">
                            <ArrowUpRight size={13} /> OUTBOUND
                          </span>
                        )}
                      </td>

                      {/* Call Start Date & Time */}
                      <td className="vh-td" style={{ whiteSpace: "nowrap" }}>
                        <div style={{ color: "var(--heading)", fontWeight: 500, fontSize: "13px" }}>{times.start.date}</div>
                        <div style={{ color: "var(--muted)", fontSize: "11.5px" }}>{times.start.time}</div>
                      </td>

                      {/* Call End Date & Time */}
                      <td className="vh-td" style={{ whiteSpace: "nowrap" }}>
                        <div style={{ color: "var(--heading)", fontWeight: 500, fontSize: "13px" }}>{times.end.date}</div>
                        <div style={{ color: "var(--muted)", fontSize: "11.5px" }}>{times.end.time}</div>
                      </td>

                      {/* Duration */}
                      <td className="vh-td">
                        <span className="vh-badge-duration">
                          <Clock size={11} /> {call.duration || "00:00"}
                        </span>
                      </td>

                      {/* Customer Mobile & Name - Phone as Primary Identifier */}
                      <td className="vh-td">
                        <strong style={{ display: "block", color: "var(--heading)", fontSize: "13.5px", fontFamily: "monospace" }}>
                          {cust.phone && cust.phone !== "—" ? cust.phone : "Unknown Caller"}
                        </strong>
                        {cust.name && cust.name !== "Inbound Caller" && cust.name !== "Unknown Caller" && (
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>{cust.name}</span>
                        )}
                      </td>

                      {/* Intent */}
                      <td className="vh-td" style={{ fontSize: "13px" }}>
                        {call.intent || "General Inquiry"}
                      </td>

                      {/* Status / Outcome */}
                      <td className="vh-td">
                        <span className={`vh-badge-outcome ${getOutcomeClass(outcomeText)}`}>
                          {outcomeText}
                        </span>
                      </td>

                      {/* Recording Player */}
                      <td className="vh-td">
                        {recUrl ? (
                          <audio controls preload="none" style={{ width: "170px", height: "30px" }}>
                            <source src={recUrl} />
                            Your browser does not support audio.
                          </audio>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: "12px" }}>Unavailable</span>
                        )}
                      </td>

                      {/* Details Action Button */}
                      <td className="vh-td" style={{ textAlign: "right" }}>
                        <button
                          className="vh-view-btn"
                          onClick={() => setSelectedCall(call)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Details & Telemetry Modal */}
      {selectedCall && (
        <div
          className="vh-modal-overlay"
          onClick={() => setSelectedCall(null)}
        >
          <div
            className="vh-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="vh-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={20} style={{ color: "var(--primary)" }} />
                <h2 className="vh-modal-title">
                  Call #{selectedCall.id || selectedCall.call_sid} Details & AI Telemetry
                </h2>
              </div>
              <button
                className="vh-modal-close"
                onClick={() => setSelectedCall(null)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content Grid */}
            {(() => {
              const cust = getCustomerDetails(selectedCall);
              const times = getCallTimestamps(selectedCall);
              const recUrl = getRecordingUrl(selectedCall);

              return (
                <div>
                  <div className="vh-telemetry-grid">
                    <div className="vh-telemetry-item">
                      <span className="vh-telemetry-label">Direction</span>
                      <strong style={{ color: cust.direction === "INBOUND" ? "var(--badge-green-fg, #059669)" : "var(--primary, #0284c7)", fontSize: "14px" }}>
                        {cust.direction}
                      </strong>
                    </div>

                    <div className="vh-telemetry-item">
                      <span className="vh-telemetry-label">Duration</span>
                      <strong className="vh-telemetry-val">{selectedCall.duration || "00:00"}</strong>
                    </div>

                    <div className="vh-telemetry-item">
                      <span className="vh-telemetry-label">Customer Mobile</span>
                      <strong className="vh-telemetry-val" style={{ fontFamily: "monospace" }}>{cust.phone}</strong>
                    </div>

                    <div className="vh-telemetry-item">
                      <span className="vh-telemetry-label">Customer / Caller</span>
                      <strong className="vh-telemetry-val">{cust.name}</strong>
                    </div>

                    <div className="vh-telemetry-item">
                      <span className="vh-telemetry-label">Call Start</span>
                      <strong className="vh-telemetry-val" style={{ fontSize: "13px" }}>{times.start.full}</strong>
                    </div>

                    <div className="vh-telemetry-item">
                      <span className="vh-telemetry-label">Call End</span>
                      <strong className="vh-telemetry-val" style={{ fontSize: "13px" }}>{times.end.full}</strong>
                    </div>

                    <div className="vh-telemetry-item">
                      <span className="vh-telemetry-label">Intent</span>
                      <strong className="vh-telemetry-val" style={{ fontSize: "13px" }}>{selectedCall.intent || "—"}</strong>
                    </div>

                    <div className="vh-telemetry-item">
                      <span className="vh-telemetry-label">Status / Outcome</span>
                      <span className={`vh-badge-outcome ${getOutcomeClass(selectedCall.outcome || selectedCall.status)}`}>
                        {selectedCall.outcome || selectedCall.status || "Completed"}
                      </span>
                    </div>
                  </div>

                  {/* Customer Transcript */}
                  <div style={{ marginBottom: "16px" }}>
                    <h4 style={{ fontSize: "13px", color: "var(--heading)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Customer Utterance / Transcript
                    </h4>
                    <div className="vh-box-transcript">
                      {selectedCall.caller_said || "No raw customer speech text recorded."}
                    </div>
                  </div>

                  {/* AI Assistant Response */}
                  <div style={{ marginBottom: "16px" }}>
                    <h4 style={{ fontSize: "13px", color: "var(--primary, #0284c7)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      AI Receptionist / Voice Response
                    </h4>
                    <div className="vh-box-ai">
                      {selectedCall.ai_response || "No AI response recorded."}
                    </div>
                  </div>

                  {/* Knowledge Base Sources */}
                  {selectedCall.rag_source && (
                    <div style={{ marginBottom: "16px" }}>
                      <h4 style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Knowledge Base (RAG) Document Sources
                      </h4>
                      <div className="vh-box-transcript">
                        {selectedCall.rag_source}
                      </div>
                    </div>
                  )}

                  {/* Call Audio Recording Playback */}
                  {recUrl && (
                    <div className="vh-box-audio">
                      <h4 style={{ fontSize: "13px", color: "var(--heading)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Volume2 size={16} style={{ color: "var(--primary)" }} /> Call Recording Audio Playback
                      </h4>
                      <audio controls style={{ width: "100%", borderRadius: "8px" }}>
                        <source src={recUrl} />
                        Your browser does not support audio.
                      </audio>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="vh-refresh-btn"
                onClick={() => setSelectedCall(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
