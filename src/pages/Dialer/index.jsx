import { useState, useEffect, useRef } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Delete,
  X,
  History,
  Radio,
  Headphones,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  MessageSquare,
  Loader2,
  Download,
  Disc,
  Trash2,
} from "lucide-react";

import API_BASE_URL from "../../config/api.js";
import telephonyService from "../../services/telephony.service.js";
import callService from "../../services/call.service.js";
import { useCall, unlockAudioContext } from "../../context/CallContext.jsx";
import useAuth from "../../hooks/useAuth.js";
import Badge from "../../components/ui/Badge.jsx";
import "./dialer.css";

const BACKEND_BASE = API_BASE_URL.replace(/\/api(?:\/v1)?\/?$/, "");

const getRecordingUrl = (call) => {
  if (!call || !call.recording_url) return null;
  if (call.recording_url.startsWith("http")) return call.recording_url;
  return `${BACKEND_BASE}${call.recording_url.startsWith("/") ? "" : "/"}${call.recording_url}`;
};

// ─── Status pill config ────────────────────────────────────────
const PHASE_CONFIG = {
  listening:  { label: "🎤 Listening",   color: "#10b981", pulse: true },
  processing: { label: "⚡ Processing",  color: "#f59e0b", pulse: true },
  speaking:   { label: "🔊 AI Speaking", color: "#818cf8", pulse: true },
  idle:       { label: "💤 Idle",        color: "#64748b", pulse: false },
};

export default function Dialer() {
  const {
    activeCall,
    setActiveCall,
    callState,
    setCallState,
    conversationHistory = [],
    setConversationHistory,
    acceptCall,
    declineCall,
    socket,
    micGated
  } = useCall();

  const { user } = useAuth();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Local active call state for manual outbound dialing
  const [localCall, setLocalCall] = useState(null);
  const [regStatus, setRegStatus] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [durationSec, setDurationSec] = useState(0);

  const convScrollRef = useRef(null);

  // Audio Context for DTMF keypad tones
  const audioCtxRef = useRef(null);

  const isOutboundActive = Boolean(
    localCall ||
    (activeCall && (
      activeCall.direction === "outbound" ||
      activeCall.is_outbound ||
      String(activeCall.caller_name || "").toLowerCase().startsWith("outbound") ||
      String(activeCall.receptionist_state || "").toLowerCase().includes("outbound") ||
      callState === "in-progress" ||
      callState === "connected"
    ))
  );

  const isOutboundCall = (call) => {
    if (!call) return false;
    const name = String(call.caller_name || "").toLowerCase();
    const state = String(call.receptionist_state || "").toLowerCase();
    const dir = String(call.direction || "").toLowerCase();
    const type = String(call.call_type || call.type || "").toLowerCase();
    if (
      dir === "outbound" ||
      type === "outbound" ||
      name.startsWith("outbound") ||
      state.includes("outbound") ||
      Boolean(call.lead_id) ||
      Boolean(call.outbound_script)
    ) {
      return true;
    }
    return false;
  };

  // ── Load registration status & call history on mount ──────
  useEffect(() => {
    fetchRegistrationStatus();
    fetchCallHistory();
  }, [user?.organization_id]);

  // ── Duration timer ─────────────────────────────────────────
  useEffect(() => {
    let timer;
    const isCallActive =
      (isOutboundActive && (callState === "in-progress" || callState === "ringing" || callState === "connected")) ||
      localCall?.status === "in-progress" ||
      localCall?.status === "ringing";
    if (isCallActive) {
      timer = setInterval(() => setDurationSec((prev) => prev + 1), 1000);
    } else {
      setDurationSec(0);
    }
    return () => clearInterval(timer);
  }, [callState, localCall, isOutboundActive]);

  // ── Auto-scroll conversation ───────────────────────────────
  useEffect(() => {
    if (convScrollRef.current) {
      convScrollRef.current.scrollTop = convScrollRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  const fetchRegistrationStatus = async () => {
    try {
      const res = await telephonyService.getRegistrationStatus();
      setRegStatus(res);
    } catch (err) {
      console.error("Failed to load registration status:", err);
    }
  };

  const fetchCallHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await callService.getAll(user?.organization_id || undefined);
      const allCalls = Array.isArray(data) ? data : [];
      setCallHistory(allCalls.filter(isOutboundCall));
    } catch (err) {
      console.error("Failed to fetch call history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ── DTMF Web Audio API Tone Generator ─────────────────────
  const playDtmfTone = (freq1, freq2) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.frequency.value = freq1;
      osc2.frequency.value = freq2;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

  const handleKeyPress = (digit, f1 = 697, f2 = 1209) => {
    playDtmfTone(f1, f2);
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => setPhoneNumber((prev) => prev.slice(0, -1));
  const handleClear     = () => setPhoneNumber("");

  // 🟢 Make Outbound Call
  const handleStartCall = async () => {
    unlockAudioContext();
    const targetPhone = phoneNumber.trim();
    if (!targetPhone) {
      alert("Please enter a phone number to dial.");
      return;
    }
    try {
      if (setConversationHistory) setConversationHistory([]);
      const tempCall = {
        call_sid: `out_${Date.now()}`,
        call_id: `out_${Date.now()}`,
        caller_phone: targetPhone,
        phone: targetPhone,
        caller_name: "Outbound Call",
        name: "Outbound Call",
        type: "OUTBOUND",
        direction: "outbound",
        is_outbound: true,
        status: "ringing",
      };
      setLocalCall(tempCall);
      if (setActiveCall) setActiveCall(tempCall);
      if (setCallState) setCallState("ringing");

      const res = await telephonyService.makeOutboundCall({
        to_number: targetPhone,
        to_phone: targetPhone,
        caller_name: "Local AI Receptionist",
      });

      const activeOutCall = {
        call_sid: res.call_sid || `out_${Date.now()}`,
        call_id: res.call_sid || `out_${Date.now()}`,
        caller_phone: targetPhone,
        phone: targetPhone,
        caller_name: "Outbound Call",
        name: "Outbound Call",
        type: "OUTBOUND",
        direction: "outbound",
        is_outbound: true,
        status: "in-progress",
        caller_said: "Listening to customer on phone line...",
        ai_response: res.message || "Outbound SIP Call Connected",
        detail: res.message || "Outbound SIP Call Active",
        phase: "speaking",
        start_time: Date.now(),
        duration: "00:00"
      };

      setLocalCall(activeOutCall);
      if (setActiveCall) setActiveCall(activeOutCall);
      if (setCallState) setCallState("in-progress");

      fetchCallHistory();
    } catch (err) {
      alert("Outbound Call Failed: " + (err.response?.data?.detail || err.message));
      setLocalCall(null);
      if (setActiveCall) setActiveCall(null);
      if (setCallState) setCallState("idle");
    }
  };

  // 🔴 Hang Up Call
  const handleEndCall = async () => {
    const activeSid = localCall?.call_sid || localCall?.sid || (isOutboundActive ? (activeCall?.call_sid || activeCall?.call_id) : null);
    if (activeSid) {
      try {
        if (socket) {
          socket.emit("HANGUP_CALL", { type: "HANGUP_CALL", call_id: activeSid });
        }
        await telephonyService.sipHangup({ call_sid: activeSid, reason: "LOCAL_HANGUP" });
      } catch (e) {
        console.warn("[Dialer] End call request failed:", e);
      }
    }
    setLocalCall(null);
    setDurationSec(0);
    declineCall();
    fetchCallHistory();
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      const activeSid = localCall?.call_sid || localCall?.sid || (isOutboundActive ? (activeCall?.call_sid || activeCall?.call_id) : null);
      if (socket && activeSid) {
        socket.emit("TOGGLE_MUTE", { muted: next, call_id: activeSid, call_sid: activeSid });
      }
      return next;
    });
  };

  const handleToggleHold = () => {
    setIsOnHold((prev) => {
      const next = !prev;
      const activeSid = localCall?.call_sid || localCall?.sid || (isOutboundActive ? (activeCall?.call_sid || activeCall?.call_id) : null);
      if (socket && activeSid) {
        socket.emit("TOGGLE_HOLD", { hold: next, call_id: activeSid, call_sid: activeSid });
      }
      return next;
    });
  };

  const handleToggleSpeaker = () => setIsSpeakerOn((prev) => !prev);
  const handleRedial        = (phone) => setPhoneNumber(phone || "");

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "";
    }
  };

  const handleDownloadRecording = (call) => {
    const url = getRecordingUrl(call);
    if (!url) {
      alert("Audio recording file is not available for this call.");
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = `call_recording_${call.call_sid || call.id || "audio"}.wav`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAnyCallActive = isOutboundActive;
  const currentPhone    = localCall?.phone || (isOutboundActive ? activeCall?.caller_phone : phoneNumber) || "Unknown";
  const currentCallType = "OUTBOUND CALL";
  const callPhase       = activeCall?.phase || "idle";
  const phase           = PHASE_CONFIG[callPhase] || PHASE_CONFIG.idle;

  return (
    <div className="dialer-page">
      {/* Header Banner */}
      <div className="dialer-header">
        <div>
          <h1 className="dialer-header-title">
            <Phone size={24} style={{ color: "var(--accent)" }} /> MicroSIP Softphone Dialer
          </h1>
          <p className="dialer-header-subtitle">
            Outbound PSTN Calling &amp; AI Campaigns via Local SIP Trunk (`49.249.142.147`)
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Badge color={regStatus?.status === "registered" ? "green" : "yellow"}>
            {regStatus?.status === "registered"
              ? `🟢 Registered (${regStatus.sip_username || "09410697548"}@${regStatus.sip_host || "49.249.142.147"})`
              : "🟡 SIP Trunk Standby"}
          </Badge>
          <button
            onClick={fetchRegistrationStatus}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              color: "var(--fg)",
              padding: "8px 14px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
            }}
          >
            Refresh Status
          </button>
        </div>
      </div>

      {/* Main Dialer Grid */}
      <div className="dialer-grid">
        {/* Left Column: MicroSIP Softphone Console */}
        <div className="microsip-card">
          {/* LED Display Input */}
          <div className="phone-display-container">
            <input
              type="text"
              className="phone-display-input"
              placeholder="Enter number or dial..."
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9*+#]/g, ""))}
            />
            {phoneNumber && (
              <button className="phone-display-clear" onClick={handleClear} title="Clear Number">
                <X size={16} />
              </button>
            )}
          </div>

          {/* 3x4 Touch Keypad */}
          <div className="keypad-grid">
            <button className="keypad-btn" onClick={() => handleKeyPress("1", 697, 1209)}>
              <span className="keypad-digit">1</span><span className="keypad-letters">VOICE</span>
            </button>
            <button className="keypad-btn" onClick={() => handleKeyPress("2", 697, 1336)}>
              <span className="keypad-digit">2</span><span className="keypad-letters">ABC</span>
            </button>
            <button className="keypad-btn" onClick={() => handleKeyPress("3", 697, 1477)}>
              <span className="keypad-digit">3</span><span className="keypad-letters">DEF</span>
            </button>
            <button className="keypad-btn" onClick={() => handleKeyPress("4", 770, 1209)}>
              <span className="keypad-digit">4</span><span className="keypad-letters">GHI</span>
            </button>
            <button className="keypad-btn" onClick={() => handleKeyPress("5", 770, 1336)}>
              <span className="keypad-digit">5</span><span className="keypad-letters">JKL</span>
            </button>
            <button className="keypad-btn" onClick={() => handleKeyPress("6", 770, 1477)}>
              <span className="keypad-digit">6</span><span className="keypad-letters">MNO</span>
            </button>
            <button className="keypad-btn" onClick={() => handleKeyPress("7", 852, 1209)}>
              <span className="keypad-digit">7</span><span className="keypad-letters">PQRS</span>
            </button>
            <button className="keypad-btn" onClick={() => handleKeyPress("8", 852, 1336)}>
              <span className="keypad-digit">8</span><span className="keypad-letters">TUV</span>
            </button>
            <button className="keypad-btn" onClick={() => handleKeyPress("9", 852, 1477)}>
              <span className="keypad-digit">9</span><span className="keypad-letters">WXYZ</span>
            </button>
            <button className="keypad-btn" onClick={() => handleKeyPress("*", 941, 1209)}>
              <span className="keypad-digit">*</span><span className="keypad-letters">SELECT</span>
            </button>
            <button className="keypad-btn" onClick={() => handleKeyPress("0", 941, 1336)}>
              <span className="keypad-digit">0</span><span className="keypad-letters">+</span>
            </button>
            <button className="keypad-btn" onClick={() => handleKeyPress("#", 941, 1477)}>
              <span className="keypad-digit">#</span><span className="keypad-letters">SEND</span>
            </button>
          </div>

          {/* Action Control Buttons */}
          <div className="dialer-actions-grid">
            {!isAnyCallActive ? (
              <button className="btn-dial" onClick={handleStartCall}>
                <Phone size={20} /> DIAL NUMBER
              </button>
            ) : (
              <button className="btn-hangup" onClick={handleEndCall}>
                <PhoneOff size={20} /> END CALL
              </button>
            )}

            <button
              className={`btn-control ${(isMuted || micGated) ? "active btn-mute-active" : ""}`}
              onClick={handleToggleMute}
              title={micGated ? "Mic auto-muted (AI speaking)" : isMuted ? "Click to unmute microphone" : "Click to mute microphone"}
            >
              {(isMuted || micGated) ? <MicOff size={16} /> : <Mic size={16} />}
              {micGated ? "AI Speaking" : isMuted ? "Muted" : "Mute"}
            </button>

            <button
              className={`btn-control ${isOnHold ? "active btn-hold-active" : ""}`}
              onClick={handleToggleHold}
              title={isOnHold ? "Call on hold (click to resume)" : "Click to hold call"}
            >
              {isOnHold ? <Play size={16} /> : <Pause size={16} />}
              {isOnHold ? "Unhold" : "Hold"}
            </button>

            <button
              className="btn-control btn-delete"
              onClick={handleBackspace}
              disabled={!phoneNumber}
              title="Delete last digit"
            >
              <Delete size={16} /> Delete
            </button>

            <button
              className={`btn-control ${isSpeakerOn ? "active btn-speaker-active" : ""}`}
              onClick={handleToggleSpeaker}
              title={isSpeakerOn ? "Speaker on (click to mute)" : "Speaker off (click to unmute)"}
            >
              {isSpeakerOn ? <Volume2 size={16} /> : <VolumeX size={16} />} Speaker
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* ── Active Call Monitor Panel ── */}
          {isAnyCallActive ? (
            <div className="active-call-panel">
              <div className="call-status-header">
                <Badge color="green">● {currentCallType}</Badge>
                <div className="timer-badge">{formatTimer(durationSec)}</div>
              </div>

              <div className="caller-info-avatar">
                <Headphones size={36} color="#ffffff" />
              </div>

              <div>
                <div className="caller-phone-number">{currentPhone}</div>
                <div className="caller-label-subtitle">
                  {isOnHold ? "⏸ CALL ON HOLD" : (isMuted || micGated) ? "🔇 MICROPHONE MUTED" : "🎙 TWO-WAY AUDIO STREAMING"}
                </div>
              </div>

              {/* Live Audio Waveform */}
              <div className="waveform-container">
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={handleEndCall}
                  style={{
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    padding: "12px 28px",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    fontSize: "15px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 8px 16px rgba(239, 68, 68, 0.25)",
                  }}
                >
                  <PhoneOff size={18} /> HANG UP NOW
                </button>
              </div>
            </div>
          ) : (
            <div className="history-card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <Radio size={48} style={{ color: "var(--accent)", margin: "0 auto 16px auto", opacity: 0.8 }} />
              <h3 style={{ margin: "0 0 8px 0", color: "var(--fg)", fontSize: "20px" }}>Softphone Ready</h3>
              <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
                Enter a phone number on the keypad or select a recent contact to place an outbound call.
              </p>
            </div>
          )}

          {/* ── Live Conversation Panel ── */}
          <div className="live-conv-panel">
            <div className="live-conv-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <MessageSquare size={18} color="#818cf8" />
                <span className="live-conv-title">Live Conversation</span>
                {isAnyCallActive && (
                  <span className="rec-live-badge"><span className="rec-pulse-dot" /> REC</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {conversationHistory.length > 0 && (
                  <button
                    onClick={() => setConversationHistory && setConversationHistory([])}
                    title="Clear Conversation Log"
                    className="conv-clear-btn"
                  >
                    <Trash2 size={13} /> Clear
                  </button>
                )}
                {/* Phase status badge */}
                <div
                  className={`conv-phase-badge ${phase.pulse ? "pulse" : ""}`}
                  style={{ "--phase-color": phase.color }}
                >
                  {callPhase === "processing" && (
                    <Loader2 size={12} className="conv-spinner" />
                  )}
                  {phase.label}
                </div>
              </div>
            </div>

            <div className="conv-scroll-area" ref={convScrollRef}>
              {conversationHistory.length === 0 ? (
                <div className="conv-empty">
                  {isAnyCallActive
                    ? "Listening for live conversation stream..."
                    : "Live transcript will appear here during active calls."}
                </div>
              ) : (
                conversationHistory.map((msg, idx) => {
                  const isAi = msg.role === "assistant" || msg.speaker === "ai" || msg.source === "AI";
                  return (
                    <div
                      key={msg.id || msg.utterance_id || idx}
                      className={`conv-message ${isAi ? "ai" : "customer"}`}
                    >
                      <div className="conv-speaker-label">
                        {isAi ? "🤖 AI RECEPTIONIST" : "👤 CUSTOMER"}
                      </div>
                      <div className="conv-bubble">
                        <span className="conv-text">{msg.text}</span>
                        {msg.is_partial && <span style={{ opacity: 0.6, fontSize: "11px", marginLeft: "6px" }}>●●●</span>}
                      </div>
                      <div className="conv-timestamp">{msg.timestamp}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Recent Call History ── */}
          <div className="history-card">
            <div className="history-title">
              <span>
                <History size={18} style={{ verticalAlign: "middle", marginRight: "8px" }} />
                Recent Calls Log
              </span>
              <button
                onClick={fetchCallHistory}
                style={{
                  background: "none", border: "none", color: "#38bdf8",
                  fontSize: "13px", cursor: "pointer", fontWeight: "600",
                }}
              >
                Refresh
              </button>
            </div>

            <div className="history-list">
              {loadingHistory ? (
                <div style={{ color: "var(--muted)", fontSize: "14px", textAlign: "center", padding: "16px" }}>
                  Loading call history...
                </div>
              ) : callHistory.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: "14px", textAlign: "center", padding: "16px" }}>
                  No recent call records found.
                </div>
              ) : (
                callHistory.slice(0, 10).map((call) => {
                  const isInbound = (call.call_type || call.type || "").toLowerCase().includes("inbound");
                  const recUrl = getRecordingUrl(call);
                  return (
                    <div key={call.id || call.call_sid} className="history-item" style={{ flexWrap: "wrap", gap: "10px" }}>
                      <div className="history-info">
                        <div className={`history-icon ${isInbound ? "inbound" : "outbound"}`}>
                          {isInbound ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div>
                          <div className="history-number">
                            {call.caller_phone || call.phone || "SIP Customer"}
                          </div>
                          <div className="history-meta">
                            {isInbound ? "Inbound" : "Outbound"} • {call.duration || "00:00"} •{" "}
                            {call.status || "completed"}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto", flexWrap: "wrap" }}>
                        {recUrl && (
                          <audio
                            controls
                            src={recUrl}
                            className="rec-audio-player"
                            preload="metadata"
                            title="Play Call Recording"
                          />
                        )}
                        <button
                          className="btn-download"
                          onClick={() => handleDownloadRecording(call)}
                          title="Download WAV Recording File"
                        >
                          <Download size={14} /> Download WAV
                        </button>
                        <button
                          className="btn-redial"
                          onClick={() => handleRedial(call.caller_phone || call.phone)}
                          title="Populate number to Keypad"
                        >
                          <RotateCcw size={14} /> Redial
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
