import { useEffect, useState, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import Badge from "../../components/ui/Badge.jsx";
import callService from "../../services/call.service.js";
import { useCall } from "../../context/CallContext.jsx";
import useAuth from "../../hooks/useAuth.js";
import api from "../../services/api.js";
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
    if (d.length === 10) return `+91${d}`;
    if (d.startsWith("91") && d.length === 12) return `+${d}`;
    if (d.startsWith("0") && d.length === 11) return `+91${d.slice(1)}`;
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
    // Strictly prevent SIP PBX registration extension (9410697548) from showing as customer phone
    if (["9410697548"].includes(d10)) continue;
    if (d.length >= 7) {
      return formatPhone(str);
    }
  }

  // Check if name has a phone number
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

  // Check if private is explicitly indicated
  for (const c of [...candidates, ...nameCandidates]) {
    if (c && String(c).toLowerCase().includes("private")) return "Private Number";
  }

  return "Unknown Caller";
}

// Extract real caller name from call metadata
function getCustomerName(data) {
  if (!data) return "";
  const name = String(data.customer_name || data.caller?.customer_name || data.caller?.name || data.caller_name || data.name || "").trim();
  const phone = getCustomerPhone(data);
  
  const generic = [
    "Name",
    "name",
    "Customer Mobile",
    "SIP Caller",
    "SIP Trunk Line",
    "Unknown",
    "Unknown Caller",
    "Anonymous",
    "Customer",
    "Incoming Customer",
    "Private Number",
    "Unknown Lead",
    "None",
    "null"
  ];

  if (!name || generic.includes(name)) {
    return "";
  }
  if (name === phone || name.replace(/\D/g, "").length >= 10) {
    return "";
  }
  return name;
}

export default function LiveCall({ isDemo: isDemoProp = false }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const location = useLocation();
  const isDemoMode = Boolean(isDemoProp || location?.pathname?.startsWith("/demo"));

  const { activeCall, callState, conversationHistory = [], setConversationHistory, declineCall } = useCall();
  const [dbCall, setDbCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(0); // seconds
  const [barging, setBarging] = useState(false);
  const [bargeStatus, setBargeStatus] = useState(null);
  
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState("");

  const dialogueStreamRef = useRef(null);

  const isLive = Boolean(activeCall && (callState === "in-progress" || callState === "connected"));
  const callData = isLive ? activeCall : null;

  // Caller identification with PII masking in demo mode
  const rawCustomerPhone = isLive ? getCustomerPhone(activeCall) : "";
  const rawCustomerName = isLive ? getCustomerName(activeCall) : "";
  const rawLastCustomerPhone = getCustomerPhone(dbCall);
  const rawLastCustomerName = getCustomerName(dbCall);

  const customerPhone = isDemoMode ? maskPhone(rawCustomerPhone) : rawCustomerPhone;
  const customerName = isDemoMode ? maskName(rawCustomerName) : rawCustomerName;
  const lastCustomerPhone = isDemoMode ? maskPhone(rawLastCustomerPhone) : rawLastCustomerPhone;
  const lastCustomerName = isDemoMode ? maskName(rawLastCustomerName) : rawLastCustomerName;
  const historyPhone = customerPhone || lastCustomerPhone;
  const historyName = customerName || lastCustomerName;

  // Parse dbCall.messages if conversationHistory is empty (e.g. on page refresh or after call completes)
  const displayHistory = useMemo(() => {
    if (conversationHistory && conversationHistory.length > 0) {
      return conversationHistory;
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
              timestamp: m.timestamp || (dbCall.created_at ? new Date(dbCall.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "")
            };
          });
        }
      } catch (e) {
        console.warn("Failed to parse dbCall.messages:", e);
      }
    }
    return [];
  }, [conversationHistory, dbCall?.messages, dbCall?.created_at]);

  // Timer for active call duration
  useEffect(() => {
    let interval;
    if (isLive) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  // Auto-scroll conversation stream to bottom on new messages
  useEffect(() => {
    if (dialogueStreamRef.current) {
      dialogueStreamRef.current.scrollTop = dialogueStreamRef.current.scrollHeight;
    }
  }, [displayHistory]);

  // Load organizations if super admin
  useEffect(() => {
    if (isSuperAdmin) {
      api.get("/organizations").then(res => {
        setOrganizations(res.data || []);
      }).catch(err => console.error("Failed to fetch orgs:", err));
    }
  }, [isSuperAdmin]);

  // Load latest from DB when selectedOrg changes or on mount
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

  const handleBargeCall = async () => {
    if (isDemoMode) {
      alert("Call barging is restricted in public demo mode. Please sign in to join live calls.");
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
      alert(res.data?.message || "Super Admin Barged into Live Call!");
    } catch (err) {
      alert("Barge call failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setBarging(false);
    }
  };

  const handleEndCall = async () => {
    if (isDemoMode) {
      alert("Ending live calls is restricted in public demo mode. Please sign in as an administrator.");
      return;
    }
    if (confirm("Are you sure you want to end this live inbound call?")) {
      await declineCall();
    }
  };

  const formattedDuration = isLive 
    ? `${Math.floor(duration / 60).toString().padStart(2, '0')}:${(duration % 60).toString().padStart(2, '0')}`
    : "00:00";

  const getPhaseBadge = () => {
    if (!isLive) return <Badge color="gray">STANDBY</Badge>;
    const phase = activeCall?.phase;
    if (phase === "speaking") return <Badge color="red">🔊 AI SPEAKING</Badge>;
    if (phase === "processing") return <Badge color="yellow">⏳ AI PROCESSING</Badge>;
    if (phase === "listening") return <Badge color="green">🎙 LISTENING TO CALLER</Badge>;
    return <Badge color="green"><span className="live-status-dot" /> LIVE CALL ACTIVE</Badge>;
  };

  return (
    <section id="livecall" className="page active livecall-page" style={isDemoMode ? { maxWidth: "1280px", margin: "0 auto", padding: "24px 20px" } : undefined}>
      {/* Demo Mode Top Header Banner */}
      {isDemoMode && (
        <div style={{
          background: "linear-gradient(90deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))",
          border: "1px solid rgba(56, 189, 248, 0.35)",
          borderRadius: "14px",
          padding: "14px 20px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
              <span style={{ fontSize: "20px" }}>⚡</span>
              <span style={{ fontWeight: 800, fontSize: "16px", color: "#ffffff", letterSpacing: "-0.01em" }}>CallZenza</span>
            </Link>
            <span style={{ height: "18px", width: "1px", background: "rgba(255,255,255,0.2)" }} />
            <div>
              <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#38bdf8", marginRight: "6px" }}>
                Public Live Call Observer (Demo)
              </span>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Real-time speech stream active. Caller PII masked and admin controls restricted.
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <Link to="/" style={{ color: "var(--muted)", fontSize: "13px", textDecoration: "none", padding: "6px 10px" }}>
              ← Back to Home
            </Link>
            <Link to="/login" style={{ padding: "6px 14px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", color: "#ffffff", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}>
              Sign In
            </Link>
            <Link to="/signup/company" style={{ padding: "6px 14px", borderRadius: "8px", background: "#38bdf8", color: "#0f172a", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
              Start Free Trial
            </Link>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="livecall-header">
        <div>
          <div className="livecall-header-title-row">
            <h1 className="title" style={{ margin: 0, letterSpacing: "-0.02em" }}>
              {isDemoMode ? "Live Call Observer" : "Live Inbound Calls"}
            </h1>
            <Badge color={isLive ? "green" : "gray"}>
              {isLive ? (
                <>
                  <span className="live-status-dot" />
                  LIVE CALL ACTIVE
                </>
              ) : (
                "PHONE SYSTEM ONLINE"
              )}
            </Badge>
            {getPhaseBadge()}
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
          <p className="subtitle" style={{ marginTop: "6px", color: "var(--muted)", fontSize: "14px" }}>
            {isDemoMode 
              ? "Preview live speech-to-text dialogue and AI responses as real inbound phone calls arrive" 
              : "AI receptionist receiving and actively answering inbound SIP phone calls"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {isLive && (
            <>
              {isDemoMode ? (
                <span
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  🔒 Demo Observer Mode (Controls Protected)
                </span>
              ) : (
                <>
                  <button
                    onClick={handleBargeCall}
                    disabled={barging}
                    style={{
                      backgroundColor: "#dc2626",
                      color: "white",
                      padding: "9px 18px",
                      borderRadius: "10px",
                      border: "none",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                      letterSpacing: "0.03em",
                      boxShadow: "0 0 16px rgba(220, 38, 38, 0.45)",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {barging ? "Connecting..." : "🎙 BARGE CALL"}
                  </button>

                  <button
                    onClick={handleEndCall}
                    className="btn danger"
                    style={{
                      padding: "9px 18px",
                      borderRadius: "10px",
                      fontWeight: "700",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      cursor: "pointer",
                      boxShadow: "0 0 16px rgba(239, 68, 68, 0.35)"
                    }}
                  >
                    🔴 End Call
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {bargeStatus && (
        <div style={{ background: "rgba(244, 63, 94, 0.12)", border: "1px solid rgba(244, 63, 94, 0.3)", color: "#f87171", padding: "12px 18px", borderRadius: "12px", marginBottom: "8px", fontWeight: "600", fontSize: "13.5px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🚨</span> {bargeStatus}
        </div>
      )}

      {loading && !isLive ? (
        <div className="live-card" style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
          <div style={{ fontSize: "28px", marginBottom: "10px", opacity: 0.6 }}>📡</div>
          <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--heading)" }}>Loading live call details...</div>
          <p style={{ fontSize: "13px", marginTop: "4px" }}>Synchronizing telephony and AI speech channels</p>
        </div>
      ) : (
        <div className="call-layout">
          {/* Main Left Hero Call Panel */}
          <div className={`livecall-panel ${isLive ? 'is-active' : ''}`}>
            <div className="livecall-ambient-glow" />

            <div className="call-status" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
              <Badge color={isLive ? "green" : "gray"}>
                {isLive ? (
                  <>
                    <span className="live-status-dot" />
                    {`INBOUND CALL • ${callState.toUpperCase()}`}
                  </>
                ) : (
                  (callData?.status || "STANDBY").toUpperCase()
                )}
              </Badge>
              <span className="livecall-duration-pill">
                <span style={{ fontSize: "12px", opacity: 0.8 }}>⏱</span> {formattedDuration}
              </span>
            </div>

            {/* Central Animated Holographic Call Avatar */}
            <div className="call-circle-wrapper">
              <div className="call-circle-outer-pulse" />
              <div className="call-circle-glow-ring" />
              <div className={`call-circle-main ${isLive ? 'live-pulse' : ''}`}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </div>
            </div>

            {/* Dynamic Soundwave Spectrum Visualizer */}
            <div className="audio-visualizer">
              <span className="visualizer-bar" />
              <span className="visualizer-bar" />
              <span className="visualizer-bar" />
              <span className="visualizer-bar" />
              <span className="visualizer-bar" />
              <span className="visualizer-bar" />
              <span className="visualizer-bar" />
              <span className="visualizer-bar" />
              <span className="visualizer-bar" />
              <span className="visualizer-bar" />
              <span className="visualizer-bar" />
              <span className="visualizer-bar" />
            </div>

            {/* Caller Header Info - Primary Display: Customer Caller ID */}
            {customerPhone && customerPhone !== "Unknown Caller" && customerPhone !== "Private Number" ? (
              <>
                <h2 id="livecall-customer-heading" className="livecall-heading">
                  {customerPhone}
                </h2>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "16px", position: "relative", zIndex: 1, flexWrap: "wrap" }}>
                  <div className="livecall-info-pill">
                    <span>📞</span>
                    <span>Caller ID: <strong id="livecall-customer-phone">{customerPhone}</strong></span>
                  </div>
                  {customerName && (
                    <div className="livecall-info-pill">
                      <span>👤</span>
                      <span>Contact: <strong>{customerName}</strong></span>
                    </div>
                  )}
                </div>
              </>
            ) : customerPhone === "Private Number" ? (
              <>
                <h2 id="livecall-customer-heading" className="livecall-heading">
                  Private Number
                </h2>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px", position: "relative", zIndex: 1 }}>
                  <div className="livecall-info-pill">
                    <span>🔒</span>
                    <span>Caller: <strong id="livecall-customer-phone" style={{ color: "#ef4444" }}>Private / Withheld Number</strong></span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 id="livecall-customer-heading" className="livecall-heading">
                  {isLive ? "Unknown Caller" : "Waiting for Inbound Call..."}
                </h2>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "16px", position: "relative", zIndex: 1, flexWrap: "wrap" }}>
                  <div className="livecall-info-pill">
                    <span>📞</span>
                    <span>Caller: <strong id="livecall-customer-phone" style={{ color: isLive ? "#f59e0b" : "var(--fg)" }}>{isLive ? "Unknown Caller" : "Standby"}</strong></span>
                  </div>
                  {!isLive && lastCustomerPhone && (
                    <div className="livecall-info-pill">
                      <span>📱</span>
                      <span>Last Inbound: <strong>{lastCustomerPhone}</strong></span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Live Speech Recognition Box */}
            <div className="speech-box caller">
              <div className="speech-box-header">
                <div className="speech-box-tag">
                  <span>🗣️</span>
                  <span>Caller Said</span>
                </div>
                {isLive && activeCall?.phase === "listening" && (
                  <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span className="live-status-dot" style={{ width: "6px", height: "6px" }} /> Listening
                  </span>
                )}
              </div>
              <p className="speech-box-content">
                "{callData?.caller_said || (isLive ? "Listening to caller..." : (dbCall?.caller_said || "Waiting for speech..."))}"
              </p>
            </div>

            {/* Live AI Response Generation Box */}
            <div className="speech-box ai">
              <div className="speech-box-header">
                <div className="speech-box-tag">
                  <span>🤖</span>
                  <span>AI Response</span>
                </div>
                {isLive && activeCall?.phase === "speaking" && (
                  <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span className="live-status-dot" style={{ width: "6px", height: "6px", background: "#34d399" }} /> Speaking
                  </span>
                )}
              </div>
              <p className="speech-box-content">
                "{callData?.ai_response || (isLive ? "Generating response..." : (dbCall?.ai_response || "AI ready..."))}"
              </p>
            </div>

            {isLive && !isDemoMode && (
              <button
                className="end-call"
                onClick={handleEndCall}
                title="Hangup Live Inbound Call"
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  cursor: "pointer",
                  marginTop: "16px",
                  boxShadow: "0 0 18px rgba(220, 38, 38, 0.5)",
                  position: "relative",
                  zIndex: 1,
                  transition: "transform 0.2s ease"
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.58.9-1.2.55-2.28 1.34-3.21 2.31-.22.23-.53.37-.86.37-.33 0-.64-.14-.86-.37L.37 14.51c-.24-.24-.37-.56-.37-.89 0-.33.13-.65.37-.89C3.76 9.4 7.64 7.5 12 7.5s8.24 1.9 11.63 5.23c.24.24.37.56.37.89 0 .33-.13.65-.37.89l-1.52 1.52c-.22.23-.53.37-.86.37-.33 0-.64-.14-.86-.37-.93-.97-2.01-1.76-3.21-2.31-.35-.16-.58-.51-.58-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Right Column: AI Analysis & Receptionist State */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Live AI Analysis Card */}
            <div className="live-card">
              <div className="live-card-title">
                <span>⚡</span>
                <span>Live AI Analysis</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "14px" }}>
                <div className="analysis-row">
                  <span className="analysis-label">
                    <span className="analysis-icon">🎯</span> Intent
                  </span>
                  <Badge color="blue">{callData?.intent || dbCall?.intent || "Appointment Booking"}</Badge>
                </div>

                <div className="analysis-row">
                  <span className="analysis-label">
                    <span className="analysis-icon">😊</span> Emotion
                  </span>
                  <Badge color="green">{callData?.emotion || dbCall?.emotion || "Neutral — 91%"}</Badge>
                </div>

                <div className="analysis-row">
                  <span className="analysis-label">
                    <span className="analysis-icon">🌐</span> Language
                  </span>
                  <Badge color="purple">{callData?.language || dbCall?.language || "English"}</Badge>
                </div>

                <div className="analysis-row">
                  <span className="analysis-label">
                    <span className="analysis-icon">📚</span> RAG Source
                  </span>
                  <span className="rag-pill" title={callData?.rag_source || dbCall?.rag_source || "legal-services.pdf"}>
                    {callData?.rag_source || dbCall?.rag_source || "legal-services.pdf"}
                  </span>
                </div>
              </div>
            </div>

            {/* Receptionist State Card */}
            <div className="live-card">
              <div className="live-card-title">
                <span>🤖</span>
                <span>Receptionist State</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
                {callData?.receptionist_state ? (
                  callData.receptionist_state.split(", ").map((step, idx) => (
                    <div key={idx} className="state-step-item">
                      <div className="state-check-icon">✓</div>
                      <span>{step}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="state-step-item">
                      <div className="state-check-icon">✓</div>
                      <span>SIP CALL COMPLETED</span>
                    </div>
                    <div className="state-step-item">
                      <div className="state-check-icon">✓</div>
                      <span>Speech-to-Text transcribed</span>
                    </div>
                    <div className="state-step-item">
                      <div className="state-pulse-icon">●</div>
                      <span style={{ color: isLive ? "var(--accent)" : "var(--muted)", fontWeight: "600" }}>
                        {isLive ? "Processing customer dialogue" : "Ready for next inbound call"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Live Conversation Card */}
      <div className="live-card" style={{ marginTop: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div className="live-card-title">
              <span>💬</span>
              <span>Live Conversation</span>
            </div>
            <p className="subtitle" style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--muted)" }}>
              Real-time speech-to-text dialogue stream
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {displayHistory.length > 0 && (
              <button
                id="livecall-clear-conversation"
                type="button"
                onClick={() => {
                  if (setConversationHistory) setConversationHistory([]);
                  if (setDbCall) setDbCall(prev => prev ? { ...prev, messages: "[]" } : null);
                }}
                title="Clear Conversation Log"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(244, 63, 94, 0.35)",
                  background: "rgba(244, 63, 94, 0.1)",
                  color: "#f87171",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                🗑 Clear
              </button>
            )}
            <Badge color={isLive ? "green" : "gray"}>
              {isLive ? (
                <>
                  <span className="live-status-dot" />
                  LIVE STREAMING
                </>
              ) : (
                "Waiting for call"
              )}
            </Badge>
          </div>
        </div>

        <div className="dialogue-stream-container" ref={dialogueStreamRef}>
          {displayHistory.length > 0 ? (
            displayHistory.map((item, index) => {
              const isAi = item.role === "assistant" || item.role === "ai" || item.source === "AI" || item.speaker === "ai";
              const callerLabel = historyName 
                ? `${historyName}${historyPhone ? ` (${historyPhone})` : ''}`
                : (historyPhone ? `Caller (${historyPhone})` : "Caller");

              return (
                <div
                  key={item.id || item.utterance_id || index}
                  className={`dialogue-bubble ${isAi ? 'ai' : 'customer'}`}
                >
                  <div className="bubble-meta">
                    <span className="bubble-role-tag">
                      <span>{isAi ? "🤖" : "👤"}</span>
                      <span>{isAi ? "AI Receptionist" : callerLabel}</span>
                    </span>
                    {item.timestamp && (
                      <span className="bubble-time">{item.timestamp}</span>
                    )}
                  </div>
                  <div className="bubble-text" style={item.is_partial ? { opacity: 0.88, fontStyle: "italic" } : undefined}>
                    {item.text}
                    {item.is_partial && <span style={{ opacity: 0.6, fontSize: "11px", marginLeft: "6px", letterSpacing: "1px" }}>●●●</span>}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="livecall-empty-conversation">
              <div style={{ fontSize: "30px", marginBottom: "10px", opacity: 0.7 }}>💬</div>
              <strong style={{ display: "block", fontSize: "14.5px", color: "var(--fg)" }}>
                {isLive ? "Listening to caller..." : "Waiting for live inbound calls..."}
              </strong>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>
                Conversation transcript messages stream here automatically in real time once a call starts.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
