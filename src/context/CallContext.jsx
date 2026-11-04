import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";

import API_BASE_URL from "../config/api.js";
import api from "../services/api.js";

// Derive Socket.IO root URL from central API_BASE_URL by stripping /api/v1 or /api suffix
const SOCKET_URL = API_BASE_URL.replace(/\/api(?:\/v1)?\/?$/, "");

const CallContext = createContext();

// ──────────────────────────────────────────────────────────────
// Web Audio API — Real-Time Customer Monitor & AI Audio Players
// ──────────────────────────────────────────────────────────────
let _audioCtx = null;
let _audioQueue = [];
let _isPlaying = false;
let _nextCustomerPlayTime = 0;

function getAudioCtx() {
  if (!_audioCtx && typeof window !== "undefined") {
    const Cls = window.AudioContext || window.webkitAudioContext;
    if (Cls) _audioCtx = new Cls({ sampleRate: 16000 });
  }
  if (_audioCtx && _audioCtx.state === "suspended") {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

export function unlockAudioContext() {
  if (typeof window === "undefined") return;
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().then(() => {
      console.log("[Audio] AudioContext successfully unlocked!");
    }).catch(err => {
      console.warn("[Audio] AudioContext unlock warning:", err);
    });
  }
}

// Seamless time-scheduled customer RTP audio playback (Zero gap, crystal clear)
export async function playCustomerAudioChunk(base64Str, mimeType = "audio/wav", sampleRate = 8000) {
  if (typeof window === "undefined" || !base64Str) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    let audioBuffer = null;

    // Fast path: if standard WAV header (44 bytes), directly extract Int16 samples -> Float32 AudioBuffer
    if (binary.length > 44 && binary.startsWith("RIFF")) {
      const pcm16Bytes = bytes.subarray(44);
      const sampleCount = Math.floor(pcm16Bytes.length / 2);
      const int16 = new Int16Array(pcm16Bytes.buffer, pcm16Bytes.byteOffset, sampleCount);
      audioBuffer = ctx.createBuffer(1, sampleCount, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        channelData[i] = int16[i] / 32768.0;
      }
    } else {
      // Async decode fallback
      try {
        audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      } catch (decErr) {
        const sampleCount = Math.floor(bytes.length / 2);
        const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, sampleCount);
        audioBuffer = ctx.createBuffer(1, sampleCount, sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < sampleCount; i++) {
          channelData[i] = int16[i] / 32768.0;
        }
      }
    }

    if (!audioBuffer) return;

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    // Clarity boost for laptop speakers
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.75;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    if (_nextCustomerPlayTime < now) {
      _nextCustomerPlayTime = now + 0.025; // 25ms initial jitter buffer
    }

    source.start(_nextCustomerPlayTime);
    _nextCustomerPlayTime += audioBuffer.duration;
    console.log(`[AUDIO_MONITOR_PLAY] source=CUSTOMER bytes=${base64Str.length}`);
  } catch (err) {
    console.warn("[Customer Audio Monitor Error]:", err);
  }
}

// Real-Time AI Speech Audio Monitor Player (Plays AI voice on laptop speaker)
export async function playAiAudioChunk(base64Str, mimeType = "audio/wav") {
  if (typeof window === "undefined" || !base64Str) return;
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await ctx.resume().catch(() => {});
    }

    const binary = atob(base64Str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    let audioBuffer = null;
    try {
      audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
    } catch (decErr) {
      // Fallback
    }

    if (audioBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.6;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
      console.log(`[AUDIO_MONITOR_PLAY] source=AI bytes=${base64Str.length}`);
    } else {
      const el = new Audio(`data:${mimeType};base64,${base64Str}`);
      el.volume = 1.0;
      await el.play().catch(e => console.warn("[AI Audio HTML5 fallback play error]:", e));
      console.log(`[AUDIO_MONITOR_PLAY] source=AI (HTML5) bytes=${base64Str.length}`);
    }
  } catch (err) {
    console.warn("[AI Audio Monitor Error]:", err);
  }
}

// ── Normalized Live Call Event Parser (Metadata-Driven) ────────
export function normalizeLiveCallEvent(data) {
  if (!data) return null;
  const call_id = data.call_id || data.call_sid || "";
  const utterance_id = data.utterance_id || "";
  const event_type = data.type || data.event_type || "";
  const text = (data.text || "").trim();
  if (!text) return null;

  // Metadata-driven speaker mapping strictly from event properties
  const isAi = (
    data.source === "AI" ||
    data.speaker === "ai" ||
    data.role === "assistant" ||
    data.audio_source === "AI_TTS" ||
    data.audio_source === "AI_TTS_MONITOR" ||
    event_type.startsWith("AI")
  );
  const isCustomer = !isAi && (
    data.source === "CUSTOMER" ||
    data.speaker === "customer" ||
    data.role === "customer" ||
    data.audio_source === "CUSTOMER_RTP" ||
    data.audio_source === "CUSTOMER_RTP_MONITOR" ||
    event_type.startsWith("CUSTOMER")
  );

  const speaker = isAi ? "ai" : "customer";
  const source = isAi ? "AI" : "CUSTOMER";
  const role = isAi ? "assistant" : "customer";
  const is_partial = (
    event_type === "CUSTOMER_PARTIAL" ||
    event_type === "AI_CHUNK" ||
    data.is_partial === true ||
    data.is_chunk === true
  );

  return {
    call_id,
    utterance_id,
    source,
    audio_source: data.audio_source || (isAi ? "AI_TTS" : "CUSTOMER_RTP"),
    speaker,
    role,
    event_type: event_type || (isAi ? (is_partial ? "AI_CHUNK" : "AI_RESPONSE") : (is_partial ? "CUSTOMER_PARTIAL" : "CUSTOMER_FINAL")),
    text,
    is_partial,
    timestamp: data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

// Unlock AudioContext on first user interaction
if (typeof window !== "undefined") {
  const unlock = () => {
    unlockAudioContext();
    window.removeEventListener("click", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };
  window.addEventListener("click", unlock);
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock);
}

// ──────────────────────────────────────────────────────────────
export function CallProvider({ children }) {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callState, setCallState] = useState("idle"); // idle, in-progress, completed, failed
  const [conversationHistory, setConversationHistory] = useState([]);
  const [latestUtterance, setLatestUtterance] = useState(null);
  const [micGated, setMicGated] = useState(false);

  const audioRef = useRef(null);
  const activeCallRef = useRef(null);
  activeCallRef.current = activeCall;

  useEffect(() => {
    // Ringtone element
    const audio = new Audio("/ringtone.mp3");
    audio.loop = true;
    audioRef.current = audio;

    // Connect to Socket.IO
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"]
    });

    newSocket.on("connect", () => {
      console.log("Socket.IO Connected:", newSocket.id);
    });

    // ── Incoming call (Auto-answered by AI Receptionist) ───
    const handleIncoming = (data) => {
      if (
        data?.direction === "outbound" ||
        data?.event === "outgoing-call" ||
        data?.event === "outbound-call" ||
        String(data?.caller_name || "").toLowerCase().startsWith("outbound") ||
        Boolean(data?.is_outbound)
      ) {
        return;
      }

      console.log("[CallContext] Inbound SIP call received:", data);
      
      // 1. Candidate search in order of backend trusted fields: caller_phone first!
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
      let rawPhone = "";
      for (const c of candidates) {
        if (!c) continue;
        const str = String(c).trim();
        if (str === "Private Number") { rawPhone = "Private Number"; break; }
        if (!["Unknown", "Unknown Caller", "SIP Trunk Line", "Anonymous", "Customer Mobile", "SIP Caller"].includes(str)) {
          const d = str.replace(/\D/g, "");
          const d10 = d.length >= 10 ? d.slice(-10) : d;
          if (["9410697548"].includes(d10)) continue;
          rawPhone = str;
          break;
        }
      }

      const rawName = String(data.customer_name || data.caller?.customer_name || data.caller?.name || data.caller_name || data.name || "").trim();
      
      let resolvedPhone = "Unknown Caller";
      if (rawPhone === "Private Number" || rawName === "Private Number") {
        resolvedPhone = "Private Number";
      } else if (rawPhone && !["Unknown", "Unknown Caller", "SIP Trunk Line", "Anonymous"].includes(rawPhone)) {
        resolvedPhone = rawPhone;
      } else if (rawName && !["Unknown", "Unknown Caller", "SIP Trunk Line", "Anonymous", "Name", "name", "None", "null"].includes(rawName)) {
        const d = rawName.replace(/\D/g, "");
        const d10 = d.length >= 10 ? d.slice(-10) : d;
        if (!["9410697548"].includes(d10) && d.length >= 10) {
          resolvedPhone = rawName.startsWith("+") ? rawName : (d.length === 10 ? `+91${d}` : `+${d}`);
        }
      }

      const genericNames = ["Unknown", "Unknown Caller", "SIP Caller", "Customer Mobile", "Customer", "Incoming Customer", "Private Number", "Name", "name", "None", "null", "Unknown Lead"];
      const resolvedName = (rawName && !genericNames.includes(rawName))
        ? rawName
        : (resolvedPhone === "Private Number" ? "Private Number" : (resolvedPhone !== "Unknown Caller" ? resolvedPhone : "Unknown Caller"));

      const callSid = data.call_sid || data.call_id || data.id;

      const newCallData = {
        call_sid: callSid,
        call_id: callSid,
        id: callSid,
        status: "in-progress",
        caller_said: "Listening to customer on phone line...",
        ai_response: "Answering with AI Receptionist greeting...",
        intent: "Inbound Call",
        emotion: "Neutral",
        language: "English",
        rag_source: "Live Receptionist RAG Engine",
        receptionist_state: "Caller connected, Auto-answered, Speech-to-Text active",
        phase: "listening",
        duration: "00:00",
        start_time: Date.now(),
        ...data,
        customer_number: resolvedPhone,
        caller_number: resolvedPhone,
        customer_name: resolvedName,
        caller_phone: resolvedPhone,
        caller_name: resolvedName,
        phone: resolvedPhone,
        name: resolvedName,
        caller: {
          ...(data.caller || {}),
          phone: resolvedPhone,
          name: resolvedName,
          customer_number: resolvedPhone,
          customer_name: resolvedName,
          caller_phone: resolvedPhone,
          caller_name: resolvedName,
          is_known: Boolean(resolvedName && !["Unknown", "Unknown Caller", "Private Number"].includes(resolvedName) && resolvedName !== resolvedPhone)
        }
      };

      setActiveCall(newCallData);
      setCallState("in-progress");
      setConversationHistory([]);
      audio.pause();
      audio.currentTime = 0;

      unlockAudioContext();

      // Navigate to /admin/live-calls only if not currently on dialer
      if (typeof window !== "undefined" && !window.location.pathname.includes("/dialer")) {
        try {
          navigate("/admin/live-calls");
        } catch (navErr) {
          console.warn("Navigation to /admin/live-calls error:", navErr);
        }
      }

      // Browser notification
      const notificationTitle = "Inbound Call Connected - AI Receptionist";
      const notificationBody = (resolvedName !== "Unknown Caller" && resolvedPhone) 
        ? `${resolvedName} (${resolvedPhone})` 
        : (resolvedName !== "Unknown Caller" ? resolvedName : (resolvedPhone || "Inbound Caller"));

      if (typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          new Notification(notificationTitle, {
            body: notificationBody,
            icon: "/favicon.ico"
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(perm => {
            if (perm === "granted") {
              new Notification(notificationTitle, {
                body: notificationBody
              });
            }
          });
        }
      }
    };

    newSocket.on("incoming_call", handleIncoming);
    newSocket.on("incoming-call", handleIncoming);

    // ── Call status event (speaking, listening, processing, idle) ───
    newSocket.on("call_status_event", (data) => {
      const phase = data?.phase;
      if (!phase) return;
      const shouldGate = phase === "processing" || phase === "speaking";
      setMicGated(shouldGate);
      
      setActiveCall(prev => {
        if (!prev) return null;
        let receptionist_state = prev.receptionist_state || "";
        if (phase === "listening") {
          receptionist_state = "Caller connected, Listening to customer speech, VAD active";
        } else if (phase === "processing") {
          receptionist_state = "Transcribing customer audio, Querying RAG & LLM";
        } else if (phase === "speaking") {
          receptionist_state = "AI generating speech, Streaming audio to caller";
        }
        return {
          ...prev,
          phase,
          receptionist_state
        };
      });
    });

    // ── Call status update (in-progress, completed, failed) ─────────
    newSocket.on("call_status_update", (data) => {
      console.log("[CallContext] Call status update:", data);
      if (data?.status) {
        setCallState(data.status);
        if (["completed", "failed"].includes(data.status)) {
          audio.pause();
          audio.currentTime = 0;
          setCallState("idle");
          setActiveCall(null);
          _audioQueue = [];
          _isPlaying = false;
          return;
        }

        setActiveCall(prev => {
          const currentCallSid = data.call_sid || data.call_id || data.id;
          const prevCallSid = prev?.call_sid || prev?.call_id || prev?.id;

          // If different call_sid, do not inherit old call state
          const isSameCall = Boolean(prev && currentCallSid && prevCallSid && currentCallSid === prevCallSid);

          const updateCandidates = [
            data.caller_phone,
            data.customer_number,
            data.caller_number,
            data.phone,
            data.from,
            data.caller?.caller_phone,
            data.caller?.customer_number,
            data.caller?.phone
          ];
          let rawPhone = "";
          for (const c of updateCandidates) {
            if (!c) continue;
            const str = String(c).trim();
            if (str === "Private Number") { rawPhone = "Private Number"; break; }
            if (!["Unknown", "Unknown Caller", "SIP Trunk Line", "Anonymous", "Customer Mobile", "SIP Caller"].includes(str)) {
              const d = str.replace(/\D/g, "");
              const d10 = d.length >= 10 ? d.slice(-10) : d;
              if (["9410697548"].includes(d10)) continue;
              rawPhone = str;
              break;
            }
          }

          const rawName = String(data.customer_name || data.caller?.customer_name || data.caller?.name || data.caller_name || data.name || "").trim();

          let resolvedPhone = rawPhone;
          if ((!resolvedPhone || ["Unknown", "Unknown Caller"].includes(resolvedPhone)) && isSameCall) {
            resolvedPhone = prev.caller_phone || prev.customer_number || prev.caller_number || prev.phone || "Unknown Caller";
            const prevD = String(resolvedPhone).replace(/\D/g, "");
            const prevD10 = prevD.length >= 10 ? prevD.slice(-10) : prevD;
            if (["9410697548"].includes(prevD10)) {
              resolvedPhone = "Unknown Caller";
            }
          }
          if (!resolvedPhone) {
            resolvedPhone = "Unknown Caller";
          }

          const genericNames = ["Unknown", "Unknown Caller", "SIP Caller", "Customer Mobile", "Customer", "Incoming Customer", "Private Number", "Name", "name", "None", "null", "Unknown Lead"];
          let resolvedName = (rawName && !genericNames.includes(rawName)) ? rawName : "";
          if ((!resolvedName || ["Unknown", "Unknown Caller"].includes(resolvedName)) && isSameCall) {
            const prevName = prev.caller_name || prev.customer_name || prev.name || "";
            if (prevName && !genericNames.includes(prevName)) {
              resolvedName = prevName;
            } else {
              resolvedName = resolvedPhone;
            }
          }
          if (!resolvedName) {
            resolvedName = resolvedPhone;
          }

          const base = isSameCall ? prev : {};
          return {
            ...base,
            ...data,
            call_sid: currentCallSid || prevCallSid,
            customer_number: resolvedPhone,
            caller_number: resolvedPhone,
            customer_name: resolvedName,
            caller_phone: resolvedPhone,
            caller_name: resolvedName,
            phone: resolvedPhone,
            name: resolvedName,
            caller: {
              ...(base.caller || {}),
              ...(data.caller || {}),
              customer_number: resolvedPhone,
              customer_name: resolvedName,
              caller_phone: resolvedPhone,
              caller_name: resolvedName,
              phone: resolvedPhone,
              name: resolvedName
            }
          };
        });
      }
    });

    // ── Unified Transcripts & Live Conversation Stream ─────────────
    const handleTranscriptEvent = (data) => {
      const event = normalizeLiveCallEvent(data);
      if (!event) return;

      console.log(`[LIVE_EVENT] call_id=${event.call_id} event_type=${event.event_type} source=${event.source} speaker=${event.speaker} utterance_id=${event.utterance_id}`);

      setActiveCall(prev => {
        if (!prev) {
          if (event.call_id) {
            setCallState("in-progress");
            return {
              call_sid: event.call_id,
              status: "in-progress",
              caller_said: event.role === "customer" ? event.text : "Listening to caller...",
              ai_response: event.role === "assistant" ? event.text : "AI ready...",
              phase: event.role === "customer" ? (event.is_partial ? "listening" : "processing") : "speaking"
            };
          }
          return null;
        }
        if (event.call_id && prev.call_sid && event.call_id !== prev.call_sid) {
          return prev;
        }
        return {
          ...prev,
          caller_said: event.role === "customer" ? event.text : prev.caller_said,
          ai_response: event.role === "assistant" ? event.text : prev.ai_response,
          phase: event.role === "customer" ? (event.is_partial ? "listening" : "processing") : "speaking"
        };
      });

      setConversationHistory(prev => {
        // If incoming event has a call_id and prev has messages from a different call_id, clear stale messages
        let baseList = prev;
        if (event.call_id && prev.length > 0 && prev.some(m => m.call_id && m.call_id !== event.call_id)) {
          baseList = [];
        }

        const isCustomer = (
          event.role === "customer" ||
          event.speaker === "customer" ||
          event.source === "CUSTOMER" ||
          (event.audio_source && event.audio_source.startsWith("CUSTOMER"))
        );
        const normalizedRole = isCustomer ? "customer" : "assistant";
        const normalizedSpeaker = isCustomer ? "customer" : "ai";
        const normalizedSource = isCustomer ? "CUSTOMER" : "AI";

        const rawUtt = String(event.utterance_id || "").trim();
        // Ensure customer and AI utterance IDs are explicitly namespaced to prevent cross-speaker collision
        let uttId = "";
        if (isCustomer) {
          if (rawUtt) {
            uttId = rawUtt.startsWith("cust_") ? rawUtt : (rawUtt.startsWith("ai_") ? `cust_${rawUtt.slice(3)}` : `cust_${rawUtt}`);
          } else {
            uttId = `cust_${Date.now()}`;
          }
        } else {
          if (rawUtt) {
            uttId = rawUtt.startsWith("ai_") ? rawUtt : (rawUtt.startsWith("cust_") ? `ai_${rawUtt.slice(5)}` : `ai_${rawUtt}`);
          } else {
            uttId = `ai_${Date.now()}`;
          }
        }

        // 1. If we have a matching utterance_id AND same speaker role, update it in place (partial -> final STT or ongoing AI response update)
        const existingIdx = baseList.findIndex(m => m.utterance_id === uttId && m.role === normalizedRole);
        if (existingIdx !== -1) {
          const currentText = (baseList[existingIdx].text || "").trim();
          const incomingText = (event.text || "").trim();
          let mergedText = incomingText;
          if (!isCustomer) {
            if (currentText === incomingText || currentText.includes(incomingText)) {
              mergedText = currentText;
            } else if (incomingText.includes(currentText)) {
              mergedText = incomingText;
            } else {
              mergedText = `${currentText} ${incomingText}`.trim();
            }
          }
          const updated = [...baseList];
          updated[existingIdx] = {
            ...updated[existingIdx],
            call_id: event.call_id || updated[existingIdx].call_id,
            role: normalizedRole,
            speaker: normalizedSpeaker,
            source: normalizedSource,
            text: mergedText,
            is_partial: Boolean(event.is_partial),
            timestamp: updated[existingIdx].timestamp || event.timestamp
          };
          return updated;
        }

        // 1b. If incoming is a customer final transcript, and the last item was an in-flight customer partial, finalize it
        if (isCustomer && !event.is_partial) {
          const lastIdx = baseList.length - 1;
          if (lastIdx >= 0 && baseList[lastIdx].role === "customer" && baseList[lastIdx].is_partial) {
            const updated = [...baseList];
            updated[lastIdx] = {
              ...updated[lastIdx],
              call_id: event.call_id || updated[lastIdx].call_id,
              utterance_id: uttId,
              text: event.text,
              is_partial: false,
              timestamp: event.timestamp || updated[lastIdx].timestamp
            };
            return updated;
          }
        }

        // 1c. If incoming is an AI response or chunk, and the last item was an in-flight AI partial, merge or finalize it
        if (!isCustomer) {
          const lastIdx = baseList.length - 1;
          if (lastIdx >= 0 && baseList[lastIdx].role === "assistant" && baseList[lastIdx].is_partial) {
            const currentText = (baseList[lastIdx].text || "").trim();
            const incomingText = (event.text || "").trim();
            let mergedText = incomingText;
            if (currentText === incomingText || currentText.includes(incomingText)) {
              mergedText = currentText;
            } else if (incomingText.includes(currentText)) {
              mergedText = incomingText;
            } else {
              mergedText = `${currentText} ${incomingText}`.trim();
            }
            const updated = [...baseList];
            updated[lastIdx] = {
              ...updated[lastIdx],
              call_id: event.call_id || updated[lastIdx].call_id,
              text: mergedText,
              is_partial: Boolean(event.is_partial),
              timestamp: updated[lastIdx].timestamp || event.timestamp
            };
            return updated;
          }
        }

        // 2. Prevent duplicate consecutive identical messages for same role
        const lastMsg = baseList[baseList.length - 1];
        if (lastMsg && lastMsg.role === normalizedRole && lastMsg.text.trim().toLowerCase() === event.text.trim().toLowerCase()) {
          return baseList;
        }

        console.log(`[LIVE_UI_EVENT] call_id=${event.call_id} event_type=${event.event_type} speaker=${normalizedSpeaker} text=${event.text.substring(0, 30)}`);

        // 3. Append new message with unique utterance_id key
        return [
          ...baseList,
          {
            id: `msg_${uttId}_${Date.now()}`,
            call_id: event.call_id,
            utterance_id: uttId,
            role: normalizedRole,
            speaker: normalizedSpeaker,
            source: normalizedSource,
            text: event.text,
            is_partial: Boolean(event.is_partial),
            timestamp: event.timestamp
          }
        ];
      });
    };

    newSocket.on("transcript_event", handleTranscriptEvent);
    newSocket.on("call_transcript", handleTranscriptEvent);
    newSocket.on("customer_transcript", handleTranscriptEvent);
    newSocket.on("ai_chunk", handleTranscriptEvent);

    // ── AI Response text & metadata (Telemetery + chat history) ──
    newSocket.on("ai_response", (data) => {
      if (!data) return;
      handleTranscriptEvent(data);
      const text = data.text ? data.text.trim() : "";
      if (text) {
        setLatestUtterance(text);
        setActiveCall(prev => {
          if (!prev) return null;
          return {
            ...prev,
            ai_response: text,
            intent: data.intent || prev.intent || "Customer Request",
            emotion: data.emotion || prev.emotion || "Neutral",
            rag_source: data.rag_source || prev.rag_source || "Active Knowledge Base",
            phase: "speaking"
          };
        });
      }
    });

    // ── 🔊 Audio Streaming (AI Speech Laptop Monitor ONLY) ──
    const handleAiAudioChunk = async (data) => {
      if (!data?.audio_base64) return;
      const isAi = (
        data.source === "AI" ||
        data.speaker === "ai" ||
        data.audio_source === "AI_TTS" ||
        data.audio_source === "AI_TTS_MONITOR"
      );
      if (!isAi) return; // Strictly ignore customer voice on laptop speakers

      unlockAudioContext();
      if (data?.text) setLatestUtterance(data.text);
      await playAiAudioChunk(data.audio_base64, data.mime_type || "audio/wav");
    };

    newSocket.on("ai_audio_chunk", handleAiAudioChunk);
    newSocket.on("audio_chunk", (data) => {
      if (data?.source === "AI" || data?.speaker === "ai" || data?.audio_source === "AI_TTS_MONITOR") {
        handleAiAudioChunk(data);
      }
    });

    // ── Real-Time Pipeline Latency Telemetry ───────────────────────
    newSocket.on("pipeline_latency", (data) => {
      console.log("[CallContext] pipeline_latency:", data);
      setActiveCall(prev => {
        if (!prev) return null;
        if (data.call_sid && prev.call_sid && data.call_sid !== prev.call_sid) return prev;
        return {
          ...prev,
          telemetry: {
            ...(prev.telemetry || {}),
            ...data,
            total_latency_ms: data.total_latency_ms || data.customer_stop_to_ai_speech_ms,
            stt_latency_ms: data.stt_latency_ms,
            rag_latency_ms: data.rag_latency_ms,
            llm_latency_ms: data.llm_latency_ms,
            tts_latency_ms: data.tts_latency_ms,
          }
        };
      });
    });

    // ── Call Ended (SIP BYE / Hangup) ──────────────────────────────
    const handleCallEnded = (data) => {
      console.log("[CallContext] call_ended received, resetting active call:", data);
      audio.pause();
      audio.currentTime = 0;
      setCallState("idle");
      setMicGated(false);
      _audioQueue = [];
      _isPlaying = false;
      _nextCustomerPlayTime = 0;
      setActiveCall(null);
    };

    newSocket.on("call_ended", handleCallEnded);
    newSocket.on("CALL_ENDED", handleCallEnded);

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      audio.pause();
      _audioQueue = [];
      _isPlaying = false;
      _nextCustomerPlayTime = 0;
    };
  }, [navigate]);

  const acceptCall = () => {
    setCallState("in-progress");
    getAudioCtx();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (socket && activeCall?.call_sid) {
      socket.emit("accept_call", { call_sid: activeCall.call_sid });
    }
  };

  const declineCall = async () => {
    const callSid = activeCallRef.current?.call_sid || activeCall?.call_sid;
    console.log("[CallContext] declineCall requested for call_sid:", callSid);
    
    setCallState("idle");
    setActiveCall(null);
    _audioQueue = [];
    _isPlaying = false;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (socket && callSid) {
      socket.emit("decline_call", { call_sid: callSid });
    }

    // Additional HTTP fallback to guarantee hangup on customer phone
    if (callSid) {
      try {
        await api.post(`/telephony/calls/${callSid}/hangup`);
      } catch (err) {
        console.warn("HTTP hangup fallback completed:", err?.message);
      }
    }
  };

  return (
    <CallContext.Provider value={{
      socket,
      activeCall,
      setActiveCall,
      callState,
      setCallState,
      conversationHistory,
      setConversationHistory,
      latestUtterance,
      micGated,
      acceptCall,
      declineCall
    }}>
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) {
    return {
      socket: null,
      activeCall: null,
      setActiveCall: () => {},
      callState: "idle",
      setCallState: () => {},
      conversationHistory: [],
      setConversationHistory: () => {},
      acceptCall: () => {},
      declineCall: () => {},
      latestUtterance: null,
      micGated: false
    };
  }
  return context;
}

