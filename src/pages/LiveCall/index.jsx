import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import Badge from "../../components/ui/Badge.jsx";
import callService from "../../services/call.service.js";
import telephonyService from "../../services/telephony.service.js";
import { useCall } from "../../context/CallContext.jsx";
import useAuth from "../../hooks/useAuth.js";
import api from "../../services/api.js";
import {
  AudioWaveformBars,
  CenterpieceAvatar,
  AiHeadProfileSvg,
  AiRobotAssistantSvg
} from "./LiveCallVisuals.jsx";
import "./livecall.css";

// Mask caller phone number for privacy in public demo mode
function maskPhone(val) {
  if (!val) return "";
  const str = String(val).trim();
  if (["Unknown", "Unknown Caller", "Private Number", "Standby", "Customer Line", "Anonymous", "SIP Trunk Line"].includes(str)) {
    return str;
  }
  const d = str.replace(/\D/g, "");
  if (d.length >= 10) {
    const last3 = d.slice(-3);
    const prefix = d.length > 10 ? `+${d.slice(0, 2)} ` : "+91 ";
    const first2 = d.length > 10 ? d.slice(2, 4) : d.slice(0, 2);
    return `${prefix}${first2}••• ••${last3}`;
  }
  return str.length > 4 ? `${str.slice(0, 2)}••••${str.slice(-2)}` : "••••";
}

// Mask caller name for privacy in public demo mode
function maskName(val) {
  if (!val) return "";
  const str = String(val).trim();
  const parts = str.split(" ");
  if (parts.length > 1) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  return str.length > 4 ? `${str.slice(0, 3)}•••` : str;
}

// Extract real caller phone number dynamically from call metadata
function getCustomerPhone(data) {
  if (!data) return "";
  
  const formatPhone = (val) => {
    if (!val) return "";
    const str = String(val).trim();
    if (["Unknown", "Unknown Caller", "SIP Trunk Line", "Anonymous", "Customer Mobile", "SIP Caller", "Private Number"].includes(str)) {
      return str;
    }
    const d = str.replace(/\D/g, "");
    if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
    if (d.startsWith("91") && d.length === 12) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
    if (d.startsWith("0") && d.length === 11) return `+91 ${d.slice(1, 6)} ${d.slice(6)}`;
    if (str.startsWith("+") && d.length >= 7) return str;
    if (d.length >= 10) return `+${d}`;
    return str;
  };

  const candidates = [
    data.caller_phone,
    data.customer_number,
    data.caller_number,
    data.phone,
    data.from,
    data.caller?.caller_phone,
    data.caller?.customer_number,
    data.caller?.phone
  ];

  for (const c of candidates) {
    if (!c) continue;
    const str = String(c).trim();
    if (str === "Private Number") return "Private Number";
    if (["Unknown", "Unknown Caller", "SIP Trunk Line", "Anonymous", "Customer Mobile", "SIP Caller"].includes(str)) continue;
    const d = str.replace(/\D/g, "");
    const d10 = d.length >= 10 ? d.slice(-10) : d;
    if (["9410697548"].includes(d10)) continue;
    if (d.length >= 7) {
      return formatPhone(str);
    }
  }

  const nameCandidates = [data.customer_name, data.caller_name, data.name, data.caller?.name];
  for (const n of nameCandidates) {
    if (!n) continue;
    const str = String(n).trim();
    if (str === "Private Number") return "Private Number";
    const d = str.replace(/\D/g, "");
    const d10 = d.length >= 10 ? d.slice(-10) : d;
    if (["9410697548"].includes(d10)) continue;
    if (d.length >= 10) {
      return formatPhone(d);
    }
  }

  for (const c of [...candidates, ...nameCandidates]) {
    if (c && String(c).toLowerCase().includes("private")) return "Private Number";
  }

  return "";
}

// Extract real caller name from call metadata
function getCustomerName(data) {
  if (!data) return "";
  const name = String(data.customer_name || data.caller?.customer_name || data.caller?.name || data.caller_name || data.name || "").trim();
  const phone = getCustomerPhone(data);
  
  const generic = [
    "Name", "name", "Customer Mobile", "SIP Caller", "SIP Trunk Line",
    "Unknown", "Unknown Caller", "Anonymous", "Customer", "Incoming Customer",
    "Private Number", "Unknown Lead", "None", "null"
  ];

  if (!name || generic.includes(name)) return "";
  if (name === phone || name.replace(/\D/g, "").length >= 10) return "";
  return name;
}

// Format any date or ISO string to clean localized 12-hour time "hh:mm:ss AM/PM"
function formatCallTime(val) {
  if (!val) return "";
  const str = String(val).trim();
  if (/^\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM|am|pm)?$/i.test(str)) {
    return str;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  return str;
}

// Parse duration to seconds (handles "00:24", "02:14", "24", 24, etc.)
function parseDurationSeconds(val) {
  if (val == null) return 0;
  if (typeof val === "number") return Math.max(0, Math.floor(val));
  const str = String(val).trim();
  if (!str) return 0;
  if (str.includes(":")) {
    const parts = str.split(":").map(p => parseInt(p, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }
  const num = parseInt(str, 10);
  return isNaN(num) ? 0 : Math.max(0, num);
}

// Format duration seconds to "00:00:00"
function formatDurationClock(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

// Clean status formatter
function formatCallStatus(status) {
  if (!status) return "Standby";
  const s = String(status).toLowerCase();
  if (s.includes("completed")) return "Completed";
  if (s.includes("failed")) return "Failed";
  if (s.includes("progress")) return "In Progress";
  if (s.includes("connected")) return "Completed";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function LiveCall({ isDemo: isDemoProp = false }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const location = useLocation();
  const isDemoMode = Boolean(isDemoProp || location?.pathname?.startsWith("/demo"));

  const { activeCall, callState, conversationHistory = [], setConversationHistory, declineCall } = useCall();
  const [dbCall, setDbCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [barging, setBarging] = useState(false);
  const [bargeStatus, setBargeStatus] = useState(null);

  // Call Control Action States
  const [isHolding, setIsHolding] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState("");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [callNote, setCallNote] = useState("");
  const [noteSuccess, setNoteSuccess] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isChatCleared, setIsChatCleared] = useState(false);

  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");

  const [sipConnectionStatus, setSipConnectionStatus] = useState("unknown"); // "connected" | "disconnected" | "unknown"
  const [sipTrunkUri, setSipTrunkUri] = useState("");

  const dialogueStreamRef = useRef(null);

  const isLive = Boolean(activeCall && (callState === "in-progress" || callState === "connected"));
  const callData = isLive ? activeCall : null;

  // Live SIP Trunk registration / connection check
  useEffect(() => {
    let isMounted = true;

    async function checkSip() {
      // If a call is currently live, SIP connection is guaranteed active
      if (isLive) {
        if (isMounted) setSipConnectionStatus("connected");
        return;
      }

      try {
        const params = selectedOrg ? { organization_id: selectedOrg } : {};
        const reg = await telephonyService.getRegistrationStatus(params);
        if (!isMounted) return;

        if (reg && (reg.status === "registered" || reg.status === "connected")) {
          setSipConnectionStatus("connected");
          if (reg.sip_username && reg.sip_host) {
            setSipTrunkUri(`sip:${reg.sip_username}@${reg.sip_host}`);
          }
          return;
        }

        // Secondary fallback to SIP config
        const cfg = await telephonyService.getSipConfig(false, params);
        if (!isMounted) return;

        if (cfg && (cfg.status === "connected" || cfg.registration_status === "registered")) {
          setSipConnectionStatus("connected");
          if (cfg.sip_username && cfg.sip_host) {
            setSipTrunkUri(`sip:${cfg.sip_username}@${cfg.sip_host}`);
          }
          return;
        }

        setSipConnectionStatus("disconnected");
      } catch (err) {
        if (!isMounted) return;
        // In case of restricted demo or fallback mode, probe demo-status
        try {
          const demoRes = await api.get("/telephony/demo-status");
          if (!isMounted) return;
          if (demoRes?.data?.sip_registered || demoRes?.data?.phone_system_connected) {
            setSipConnectionStatus("connected");
          } else {
            setSipConnectionStatus("disconnected");
          }
        } catch {
          if (isMounted) {
            setSipConnectionStatus("disconnected");
          }
        }
      }
    }

    checkSip();
    const interval = setInterval(checkSip, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedOrg, isLive]);

  // Determine dynamic SIP connection state
  const isSipConnected = Boolean(
    isLive ||
    activeCall?.sip_connected === true ||
    activeCall?.sip_status === "connected" ||
    activeCall?.sip_status === "registered" ||
    sipConnectionStatus === "connected"
  );

  // Caller identification
  const rawCustomerPhone = isLive ? getCustomerPhone(activeCall) : (getCustomerPhone(dbCall) || "");
  const rawCustomerName = isLive ? getCustomerName(activeCall) : (getCustomerName(dbCall) || "");
  const customerPhone = isDemoMode
    ? maskPhone(rawCustomerPhone)
    : (rawCustomerPhone || (isLive ? "Incoming Caller" : (dbCall ? "Past Caller" : "Standby")));
  const customerName = isDemoMode ? maskName(rawCustomerName) : rawCustomerName;

  // Business Name and dynamic SIP Trunk URI (without dummy fallbacks)
  const businessName = activeCall?.organization_name || dbCall?.organization_name || user?.organization_name || "AI Receptionist";
  const rawSipTrunk = activeCall?.sip_trunk || dbCall?.sip_trunk || sipTrunkUri || "";
  const cleanSipTrunk = (rawSipTrunk && !rawSipTrunk.includes("callzenza.local")) ? rawSipTrunk : "";

  // Reset cleared state when new conversation events stream in
  useEffect(() => {
    if (conversationHistory && conversationHistory.length > 0) {
      setIsChatCleared(false);
    }
  }, [conversationHistory]);

  // Parse dbCall.messages if conversationHistory is empty
  const displayHistory = useMemo(() => {
    if (isChatCleared) {
      return [];
    }
    if (conversationHistory && conversationHistory.length > 0) {
      return conversationHistory.map(m => ({
        ...m,
        timestamp: formatCallTime(m.timestamp)
      }));
    }
    if (dbCall?.messages) {
      try {
        const parsed = typeof dbCall.messages === "string" ? JSON.parse(dbCall.messages) : dbCall.messages;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m, idx) => {
            const isCust = m.role === "user" || m.role === "customer" || m.speaker === "customer";
            return {
              id: `db_${idx}`,
              utterance_id: `db_${idx}`,
              role: isCust ? "customer" : "assistant",
              speaker: isCust ? "customer" : "ai",
              source: isCust ? "CUSTOMER" : "AI",
              text: m.text || m.message || "",
              is_partial: false,
              timestamp: formatCallTime(m.timestamp || dbCall.created_at)
            };
          });
        }
      } catch (e) {
        console.warn("Failed to parse dbCall.messages:", e);
      }
    }
    return [];
  }, [isChatCleared, conversationHistory, dbCall?.messages, dbCall?.created_at]);

  // Duration Timer (Live incrementing clock, parsed dbCall duration, or 00:00:00)
  useEffect(() => {
    if (!isLive) {
      setLiveElapsed(0);
      return;
    }

    const startTimestamp = activeCall?.start_time
      ? (typeof activeCall.start_time === "number" ? activeCall.start_time : new Date(activeCall.start_time).getTime())
      : (activeCall?.created_at ? new Date(activeCall.created_at).getTime() : Date.now());

    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - startTimestamp) / 1000));
      setLiveElapsed(diffSecs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isLive, activeCall?.start_time, activeCall?.created_at]);

  const formattedDuration = useMemo(() => {
    if (isLive) {
      return formatDurationClock(liveElapsed);
    }
    if (dbCall?.duration) {
      return formatDurationClock(parseDurationSeconds(dbCall.duration));
    }
    return "00:00:00";
  }, [isLive, liveElapsed, dbCall?.duration]);

  // Call Start Time
  const displayStartTime = useMemo(() => {
    if (isLive) {
      const val = activeCall?.created_at || activeCall?.start_time;
      if (val) return formatCallTime(val);
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    if (dbCall?.created_at) {
      return formatCallTime(dbCall.created_at);
    }
    return "--:--:--";
  }, [isLive, activeCall?.created_at, activeCall?.start_time, dbCall?.created_at]);

  const currentPhase = isLive ? (activeCall?.phase || "speaking") : "standby";

  // Auto-scroll conversation stream when autoScroll is enabled
  useEffect(() => {
    if (autoScroll && dialogueStreamRef.current) {
      dialogueStreamRef.current.scrollTop = dialogueStreamRef.current.scrollHeight;
    }
  }, [displayHistory, autoScroll]);

  // Load organizations if super admin
  useEffect(() => {
    if (isSuperAdmin) {
      api.get("/organizations")
        .then(res => setOrganizations(res.data || []))
        .catch(err => console.error("Failed to fetch orgs:", err));
    }
  }, [isSuperAdmin]);

  // Load latest call from DB
  useEffect(() => {
    async function loadCall() {
      try {
        setLoading(true);
        const data = await callService.getLatest("Inbound", selectedOrg || null);
        setDbCall(data);
      } catch (err) {
        console.error("Failed to load live call details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCall();
  }, [selectedOrg]);

  // Call Control Handlers
  const handleHoldToggle = () => {
    if (isDemoMode) {
      alert("Call hold is restricted in public demo mode.");
      return;
    }
    setIsHolding(prev => !prev);
  };

  const handleMuteToggle = () => {
    if (isDemoMode) {
      alert("Microphone muting is restricted in public demo mode.");
      return;
    }
    setIsMuted(prev => !prev);
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transferTarget.trim()) return;
    alert(`Transferring live call to ${transferTarget}...`);
    setShowTransferModal(false);
    setTransferTarget("");
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!callNote.trim()) return;
    setNoteSuccess(true);
    setTimeout(() => {
      setNoteSuccess(false);
      setShowNoteModal(false);
      setCallNote("");
    }, 1200);
  };

  const handleClearChat = () => {
    setIsChatCleared(true);
    if (setConversationHistory) {
      setConversationHistory([]);
    }
    if (setDbCall) {
      setDbCall(prev => prev ? { ...prev, messages: "[]" } : null);
    }
  };

  const handleBargeCall = async () => {
    if (isDemoMode) {
      alert("Call barging is restricted in public demo mode.");
      return;
    }
    const callSid = activeCall?.call_sid || dbCall?.call_sid || activeCall?.id || dbCall?.id;
    if (!callSid) {
      alert("No active call available to barge into.");
      return;
    }

    setBarging(true);
    try {
      const res = await api.post(`/telephony/calls/${callSid}/barge`);
      setBargeStatus(res.data?.message || "Super Admin successfully joined live call.");
    } catch (err) {
      alert("Barge call failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setBarging(false);
    }
  };

  const handleEndCall = async () => {
    if (isDemoMode) {
      alert("Ending live calls is restricted in public demo mode.");
      return;
    }
    if (confirm("Are you sure you want to end this live inbound call?")) {
      await declineCall();
    }
  };

  return (
    <section id="livecall" className="page active livecall-page">
      {/* Demo Mode Top Banner if enabled */}
      {isDemoMode && (
        <div className="livecall-demo-banner">
          <div className="demo-banner-left">
            <span className="demo-icon">⚡</span>
            <div>
              <strong>Public Live Call Observer (Demo)</strong>
              <span>Real-time speech stream active. Caller PII masked and admin controls restricted.</span>
            </div>
          </div>
          <div className="demo-banner-right">
            <Link to="/" className="btn-demo-link">← Home</Link>
            <Link to="/login" className="btn-demo-login">Sign In</Link>
          </div>
        </div>
      )}

      {/* Top Header Bar with Metrics */}
      <header className="livecall-top-header">
        <div className="livecall-title-group">
          <div className="livecall-heading-row">
            <h1 className="livecall-title">Live Inbound Calls</h1>
            <span className={`live-pill-badge ${isLive ? "live" : "standby"}`}>
              <span className={isLive ? "live-green-dot" : "standby-dot"} />
              {isLive ? "Live" : (dbCall ? "Completed" : "Standby")}
            </span>
            {isSuperAdmin && !isDemoMode && (
              <select
                className="livecall-org-select"
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
              >
                <option value="">All Organizations</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            )}
          </div>
          <p className="livecall-subtitle">
            AI receptionist receiving and actively answering inbound SIP phone calls
          </p>
        </div>
      </header>

      {/* Barge Status Alert */}
      {bargeStatus && (
        <div className="barge-status-alert">
          <span>🚨</span> {bargeStatus}
        </div>
      )}

      {/* 2-COLUMN MAIN DASHBOARD LAYOUT */}
      <div className="livecall-dashboard-grid">
        {/* LEFT COLUMN: Main Call Card + Live Conversation */}
        <div className="livecall-col-left">
          {/* 1. MAIN LIVE CALL CARD */}
          <div className="card-glass-panel main-live-call-card">
            {/* Ambient Lighting Layers */}
            <div className="main-call-ambient-glow" />

            {/* Top Bar: Inbound Call Badge + Timer */}
            <div className="main-call-top-row">
              <div className="inbound-call-pill">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1.02 1.02 0 00-1.02.24l-2.2 2.2a15.05 15.05 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1A11.36 11.36 0 018.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM19 12h2a9 9 0 00-9-9v2c3.87 0 7 3.13 7 7zm-4 0h2c0-2.76-2.24-5-5-5v2c1.66 0 3 1.34 3 3z" />
                </svg>
                <span>{isLive ? "INBOUND CALL • LIVE" : (dbCall ? "LAST INBOUND CALL" : "INBOUND CALL STANDBY")}</span>
              </div>

              <div className="call-recording-timer-pill">
                <span className={isLive ? "red-record-dot" : "timer-idle-dot"} />
                <span className="timer-digits">{formattedDuration}</span>
              </div>
            </div>

            {/* Centerpiece & Audio Waveforms Flanks */}
            <div className="main-call-centerpiece-section">
              {/* Left Waveform Bars (Cyan - Caller Voice) */}
              <AudioWaveformBars
                color="cyan"
                isLive={isLive && (currentPhase === "listening" || currentPhase === "caller")}
              />

              {/* Glowing Center Robot Headset Avatar */}
              <CenterpieceAvatar isLive={isLive} phase={currentPhase} />

              {/* Right Waveform Bars (Purple - AI Voice) */}
              <AudioWaveformBars
                color="purple"
                isLive={isLive && currentPhase === "speaking"}
              />
            </div>

            {/* Status Titles */}
            <div className="main-call-status-block">
              <h2 className="main-call-heading">
                {isLive
                  ? "Live Conversation in Progress"
                  : (dbCall ? "Last Inbound Call" : "AI Receptionist Standby")}
              </h2>
              <p className="main-call-subheading">
                {isLive ? (
                  currentPhase === "speaking" ? "AI Receptionist is Speaking..." :
                  currentPhase === "listening" ? "Listening to Caller..." :
                  currentPhase === "processing" ? "AI Generating Response..." :
                  "Call Connected"
                ) : (
                  dbCall ? "Call Completed • Conversation Logged" : "AI Receptionist Ready • Awaiting Calls"
                )}
              </p>
            </div>

            {/* Caller Metadata Cards (3-Column Grid) */}
            <div className="main-call-metadata-row">
              {/* Caller */}
              <div className="meta-info-box">
                <div className="meta-icon-circle meta-blue">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <div className="meta-text-col">
                  <span className="meta-label">Caller</span>
                  <strong className="meta-value">{customerPhone}</strong>
                </div>
              </div>

              {/* Business */}
              <div className="meta-info-box">
                <div className="meta-icon-circle meta-cyan">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                  </svg>
                </div>
                <div className="meta-text-col">
                  <span className="meta-label">Business</span>
                  <strong className="meta-value">{businessName}</strong>
                </div>
              </div>

              {/* SIP Trunk */}
              <div
                className="meta-info-box"
                title={cleanSipTrunk ? `SIP Trunk: ${cleanSipTrunk} (${isSipConnected ? "Connected" : "Not Connected"})` : (isSipConnected ? "SIP Trunk Connected" : "SIP Trunk Not Connected")}
              >
                <div className={`meta-icon-circle ${isSipConnected ? "meta-purple" : "meta-gray"}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
                <div className="meta-text-col">
                  <span className="meta-label">SIP Trunk</span>
                  <strong
                    className={`meta-value sip-status-badge ${isSipConnected ? "sip-status-connected" : "sip-status-disconnected"}`}
                  >
                    <span className={`sip-status-dot ${isSipConnected ? "dot-connected" : "dot-disconnected"}`} />
                    {isSipConnected ? "Connected" : "Not Connected"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="main-call-actions-row">
              {/* Hold */}
              <button
                type="button"
                className={`call-action-btn ${isHolding ? "active-hold" : ""}`}
                onClick={handleHoldToggle}
                title={isHolding ? "Resume Call" : "Hold Live Call"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                <span>{isHolding ? "Unhold" : "Hold"}</span>
              </button>

              {/* Mute */}
              <button
                type="button"
                className={`call-action-btn ${isMuted ? "active-mute" : ""}`}
                onClick={handleMuteToggle}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9l4.19 4.18L21 19.73 4.27 3z" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                  </svg>
                )}
                <span>{isMuted ? "Unmute" : "Mute"}</span>
              </button>

              {/* Transfer */}
              <button
                type="button"
                className="call-action-btn"
                onClick={() => setShowTransferModal(true)}
                title="Transfer Call to Staff / Extension"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z" />
                </svg>
                <span>Transfer</span>
              </button>

              {/* Add Note */}
              <button
                type="button"
                className="call-action-btn"
                onClick={() => setShowNoteModal(true)}
                title="Add Call Note"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
                <span>Add Note</span>
              </button>

              {/* End Call */}
              <button
                type="button"
                className="call-action-btn btn-end-call"
                onClick={handleEndCall}
                title="End Live Phone Call"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.58.9-1.2.55-2.28 1.34-3.21 2.31-.22.23-.53.37-.86.37-.33 0-.64-.14-.86-.37L.37 14.51c-.24-.24-.37-.56-.37-.89 0-.33.13-.65.37-.89C3.76 9.4 7.64 7.5 12 7.5s8.24 1.9 11.63 5.23c.24.24.37.56.37.89 0 .33-.13.65-.37.89l-1.52 1.52c-.22.23-.53.37-.86.37-.33 0-.64-.14-.86-.37-.93-.97-2.01-1.76-3.21-2.31-.35-.16-.58-.51-.58-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                </svg>
                <span>End Call</span>
              </button>
            </div>
          </div>

          {/* 2. LIVE CONVERSATION STREAM CARD */}
          <div className="card-glass-panel live-conversation-card">
            {/* Header: Title, Real-time badge, Auto Scroll Switch */}
            <div className="conversation-header-row">
              <div className="conv-title-left">
                <div className="conv-icon-tag">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                  </svg>
                  <h3>Live Conversation</h3>
                </div>
                <span className="realtime-pill">Real-time</span>
              </div>

              <div className="conv-controls-right">
                <button
                  id="livecall-clear-conversation"
                  type="button"
                  className="btn-clear-chat"
                  onClick={handleClearChat}
                  title="Clear Conversation Stream"
                >
                  <span className="clear-trash-icon">🗑</span>
                  <span>Clear</span>
                </button>

                <label className="autoscroll-toggle-label">
                  <span>Auto Scroll</span>
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="toggle-checkbox-hidden"
                  />
                  <span className={`autoscroll-switch-track ${autoScroll ? "on" : "off"}`}>
                    <span className="autoscroll-switch-thumb" />
                  </span>
                </label>
              </div>
            </div>

            {/* Conversation Messages Container */}
            <div className="conversation-messages-scroll" ref={dialogueStreamRef}>
              {displayHistory.length > 0 ? (
                displayHistory.map((item, index) => {
                  const isAi = item.role === "assistant" || item.role === "ai" || item.source === "AI" || item.speaker === "ai";
                  return (
                    <div
                      key={item.id || item.utterance_id || index}
                      className={`dialogue-message-item ${isAi ? "ai" : "caller"}`}
                    >
                      {/* Avatar Circle */}
                      <div className={`dialogue-avatar ${isAi ? "ai-avatar" : "caller-avatar"}`}>
                        {isAi ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        )}
                      </div>

                      {/* Speech Box */}
                      <div className="dialogue-speech-bubble">
                        <div className="dialogue-bubble-header">
                          <span className="bubble-speaker-label">
                            {isAi ? "AI Response" : "Caller"}
                          </span>
                          <span className="bubble-time-stamp">
                            {formatCallTime(item.timestamp)}
                          </span>
                        </div>
                        <p className="bubble-text-content">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="livecall-empty-conversation">
                  <div className="empty-conv-icon">💬</div>
                  <strong className="empty-conv-title">
                    {isLive ? "Listening to caller..." : "No active conversation"}
                  </strong>
                  <p className="empty-conv-subtitle">
                    {isLive ? "Speech will appear here in real time as the caller speaks." : "Waiting for next inbound SIP call..."}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Subtle Ambient Waves Overlay */}
            <div className="conversation-bottom-wave" />
          </div>
        </div>

        {/* RIGHT COLUMN: 3 Stacked Cards */}
        <div className="livecall-col-right">
          {/* CARD 1: LIVE AI ANALYSIS */}
          <div className="card-glass-panel right-analysis-card">
            <div className="analysis-card-top-header">
              <div className="analysis-title-tag">
                <span className="sparkle-icon">✦</span>
                <h3>Live AI Analysis</h3>
              </div>
            </div>

            {/* Glowing Cybernetic AI Head Silhouette Vector Illustration */}
            <AiHeadProfileSvg />

            {/* Analysis Rows List */}
            <div className="analysis-rows-container">
              {/* Intent */}
              <div className="analysis-data-row">
                <div className="analysis-label-cell">
                  <span className="row-icon-purple">🎯</span>
                  <span>Intent</span>
                </div>
                <div className="analysis-pill-badge pill-blue">
                  {activeCall?.intent || dbCall?.intent || (isLive ? "General Inquiry" : "None")}
                </div>
              </div>

              {/* Emotion */}
              <div className="analysis-data-row">
                <div className="analysis-label-cell">
                  <span className="row-icon-yellow">😊</span>
                  <span>Emotion</span>
                </div>
                <div className="analysis-pill-badge pill-green">
                  {activeCall?.emotion || dbCall?.emotion || (isLive ? "Neutral" : "None")}
                </div>
              </div>

              {/* Language */}
              <div className="analysis-data-row">
                <div className="analysis-label-cell">
                  <span className="row-icon-cyan">🌐</span>
                  <span>Language</span>
                </div>
                <div className="analysis-pill-badge pill-purple">
                  {activeCall?.language || dbCall?.language || (isLive ? "English" : "None")}
                </div>
              </div>

              {/* RAG Source */}
              <div className="analysis-data-row">
                <div className="analysis-label-cell">
                  <span className="row-icon-blue">📚</span>
                  <span>RAG Source</span>
                </div>
                <div
                  className="analysis-pill-badge dark-blue"
                  title={activeCall?.rag_source || dbCall?.rag_source || (isLive ? "Active Knowledge Base" : "None")}
                >
                  {activeCall?.rag_source || dbCall?.rag_source || (isLive ? "Active Knowledge Base" : "None")}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: RECEPTIONIST STATE */}
          <div className="card-glass-panel right-state-card">
            <div className="state-card-top-header">
              <div className="state-title-tag">
                <span className="headset-icon">🎧</span>
                <h3>Receptionist State</h3>
              </div>
            </div>

            {/* 3D Cute AI Receptionist Robot Illustration on Right */}
            <AiRobotAssistantSvg />

            {/* Stepper Progress Items on Left */}
            <div className="state-stepper-container">
              {/* Step 1: SIP Connection */}
              <div className={`stepper-item-row ${isLive || isSipConnected || dbCall ? "completed" : "pending"}`}>
                <div className={isLive || isSipConnected || dbCall ? "stepper-check-circle" : "stepper-idle-circle"}>
                  {isLive || isSipConnected || dbCall ? "✓" : <span className="idle-inner-dot" />}
                </div>
                <span className="stepper-step-text">
                  {isLive ? "SIP Call Connected" : (dbCall ? "SIP Call Completed" : (isSipConnected ? "SIP Trunk Connected" : "SIP Not Connected"))}
                </span>
              </div>

              {/* Step 2: Speech-to-Text */}
              {isLive && currentPhase === "listening" ? (
                <div className="stepper-item-row active-step">
                  <div className="stepper-pulse-circle">
                    <span className="pulse-inner-ring" />
                  </div>
                  <span className="stepper-step-text active-glow">
                    Listening to Caller (STT Live)...
                  </span>
                </div>
              ) : (
                <div className={`stepper-item-row ${displayHistory.some(m => m.role === "customer" || m.speaker === "customer") || dbCall ? "completed" : "pending"}`}>
                  <div className={displayHistory.some(m => m.role === "customer" || m.speaker === "customer") || dbCall ? "stepper-check-circle" : "stepper-idle-circle"}>
                    {displayHistory.some(m => m.role === "customer" || m.speaker === "customer") || dbCall ? "✓" : <span className="idle-inner-dot" />}
                  </div>
                  <span className="stepper-step-text">
                    {displayHistory.some(m => m.role === "customer" || m.speaker === "customer") || dbCall ? "Speech-to-Text Transcribed" : "Speech-to-Text Ready"}
                  </span>
                </div>
              )}

              {/* Step 3: AI Response Generation */}
              {isLive && currentPhase === "processing" ? (
                <div className="stepper-item-row active-step">
                  <div className="stepper-pulse-circle">
                    <span className="pulse-inner-ring" />
                  </div>
                  <span className="stepper-step-text active-glow">
                    AI Generating Response (RAG + LLM)...
                  </span>
                </div>
              ) : (
                <div className={`stepper-item-row ${displayHistory.some(m => m.role === "assistant" || m.speaker === "ai") || dbCall ? "completed" : "pending"}`}>
                  <div className={displayHistory.some(m => m.role === "assistant" || m.speaker === "ai") || dbCall ? "stepper-check-circle" : "stepper-idle-circle"}>
                    {displayHistory.some(m => m.role === "assistant" || m.speaker === "ai") || dbCall ? "✓" : <span className="idle-inner-dot" />}
                  </div>
                  <span className="stepper-step-text">
                    {displayHistory.some(m => m.role === "assistant" || m.speaker === "ai") || dbCall ? "AI Response Generated" : "AI Response Engine Ready"}
                  </span>
                </div>
              )}

              {/* Step 4: Voice Speech to Caller */}
              {isLive && currentPhase === "speaking" ? (
                <div className="stepper-item-row active-step">
                  <div className="stepper-pulse-circle">
                    <span className="pulse-inner-ring" />
                  </div>
                  <span className="stepper-step-text active-glow">
                    Speaking to Caller (Murf TTS)...
                  </span>
                </div>
              ) : (
                <div className={`stepper-item-row ${isLive ? "completed" : (dbCall ? "completed" : "pending")}`}>
                  <div className={isLive || dbCall ? "stepper-check-circle" : "stepper-idle-circle"}>
                    {isLive || dbCall ? "✓" : <span className="idle-inner-dot" />}
                  </div>
                  <span className="stepper-step-text">
                    {isLive ? "Audio Streaming to Phone" : (dbCall ? "Call Session Completed" : "Ready for Inbound Calls")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CARD 3: CALL DETAILS */}
          <div className="card-glass-panel right-details-card">
            <div className="details-card-top-header">
              <div className="details-title-tag">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="details-phone-icon">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
                <h3>Call Details</h3>
              </div>
              <span className={`details-live-badge ${isLive ? "live" : "standby"}`}>
                <span className={isLive ? "live-green-dot" : "standby-dot"} />
                {isLive ? "Live" : (dbCall ? "Completed" : "Standby")}
              </span>
            </div>

            {/* 2x2 Grid of Detail Tiles */}
            <div className="details-2x2-grid">
              {/* Tile 1: Call Type */}
              <div className="detail-tile-box">
                <div className="detail-tile-icon-row">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#13B8FF" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="17" y1="7" x2="7" y2="17" />
                    <polyline points="17 17 7 17 7 7" />
                  </svg>
                </div>
                <span className="detail-tile-label">Call Type</span>
                <strong className="detail-tile-value">{activeCall?.call_type || dbCall?.call_type || "Inbound"}</strong>
              </div>

              {/* Tile 2: Call Status */}
              <div className="detail-tile-box">
                <div className="detail-tile-icon-row">
                  <span className={`status-solid-dot ${isLive ? "live" : (dbCall ? "completed" : "idle")}`} />
                </div>
                <span className="detail-tile-label">Call Status</span>
                <strong className="detail-tile-value">{isLive ? "In Progress" : (dbCall ? formatCallStatus(dbCall.status) : "Standby")}</strong>
              </div>

              {/* Tile 3: Start Time */}
              <div className="detail-tile-box">
                <div className="detail-tile-icon-row">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#13B8FF" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <span className="detail-tile-label">Start Time</span>
                <strong className="detail-tile-value">{displayStartTime}</strong>
              </div>

              {/* Tile 4: Duration */}
              <div className="detail-tile-box">
                <div className="detail-tile-icon-row">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#13B8FF" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 2h14v4l-4 4 4 4v4H5v-4l4-4-4-4V2z" />
                  </svg>
                </div>
                <span className="detail-tile-label">Duration</span>
                <strong className="detail-tile-value">{formattedDuration}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Call Modal */}
      {showTransferModal && (
        <div className="livecall-modal-backdrop" onClick={() => setShowTransferModal(false)}>
          <div className="livecall-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transfer Live Call</h3>
              <button className="modal-close-btn" onClick={() => setShowTransferModal(false)}>✕</button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <p className="modal-description">
                Warm or cold transfer the current caller ({customerPhone}) to a department or internal extension:
              </p>
              <div className="modal-input-group">
                <label>Department / Extension Number</label>
                <input
                  type="text"
                  placeholder="e.g. 102 (Reception) or +91 98765 43210"
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-actions-row">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowTransferModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Transfer Call →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Call Note Modal */}
      {showNoteModal && (
        <div className="livecall-modal-backdrop" onClick={() => setShowNoteModal(false)}>
          <div className="livecall-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Call Note</h3>
              <button className="modal-close-btn" onClick={() => setShowNoteModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveNote}>
              <p className="modal-description">
                Record an internal operational note for caller {customerPhone}:
              </p>
              <div className="modal-input-group">
                <label>Call Summary / Customer Request</label>
                <textarea
                  rows="4"
                  placeholder="Customer inquired about naturopathy consultations. Advised available slots..."
                  value={callNote}
                  onChange={(e) => setCallNote(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              {noteSuccess && (
                <div className="modal-success-msg">✓ Note saved successfully to call history</div>
              )}
              <div className="modal-actions-row">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowNoteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-modal-submit">
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
