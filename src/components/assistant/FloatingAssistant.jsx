import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Send,
  X,
  Minimize2,
  Maximize2,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Headphones,
  Sparkles,
  RotateCcw,
  CheckCircle,
  Clock,
  ShieldCheck,
  MessageCircle,
  Volume2,
  VolumeX,
  Bot,
  Zap
} from "lucide-react";
import api from "../../services/api.js";
import API_BASE_URL from "../../config/api.js";
import "./FloatingAssistant.css";

export default function FloatingAssistant({ assistantName: propAssistantName, organizationName: propOrgName }) {
  // Navigation View State: 'hub' | 'chat' | 'voice-precall' | 'voice-connecting' | 'voice-active'
  const [view, setView] = useState("hub");
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  // Keep viewRef in sync so closures (like recognition.onend) always see current view
  const viewRef = useRef("hub");
  const setViewAndRef = (v) => { viewRef.current = v; setView(v); };

  // Dynamic Branding & Configuration State
  const [config, setConfig] = useState({
    organization_name: propOrgName || "AI Receptionist",
    assistant_name: propAssistantName || "CallZenza",
    working_hours: "9:00 AM - 6:00 PM",
    quick_actions: []
  });

  // Effective dynamic names that adapt everywhere based on prop or config
  const name = propAssistantName || config.assistant_name || config.organization_name || "CallZenza";
  const orgName = propOrgName || config.organization_name || name;

  // Chat State
  const [sessionId, setSessionId] = useState(() => {
    const saved = sessionStorage.getItem("ai_receptionist_session_id");
    if (saved) return saved;
    const newId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.setItem("ai_receptionist_session_id", newId);
    return newId;
  });

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [quickActions, setQuickActions] = useState([]);
  const messagesEndRef = useRef(null);

  // Voice Call Intake State
  const [intakeForm, setIntakeForm] = useState({
    name: "",
    email: "",
    phone: ""
  });

  // Voice Call Live State
  const [voiceCallDuration, setVoiceCallDuration] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [sttLang, setSttLang] = useState("en-IN");
  const [callerSaid, setCallerSaid] = useState("");
  const [aiSpoke, setAiSpoke] = useState("");

  // Fetch active configuration on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get("/chat/config?organization_id=1");
      if (res.data) {
        setConfig((prev) => ({
          ...prev,
          ...res.data,
          assistant_name: propAssistantName || res.data.assistant_name || prev.assistant_name,
          organization_name: propOrgName || res.data.organization_name || prev.organization_name
        }));
        if (res.data.quick_actions) {
          setQuickActions(res.data.quick_actions);
        }
      }
    } catch (err) {
      console.warn("Could not load /chat/config:", err);
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (view === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isProcessing, view]);

  // Load greeting if opening chat with no messages
  const ensureInitialGreeting = async () => {
    if (messages.length === 0) {
      try {
        setIsProcessing(true);
        const res = await api.get(`/chat/greeting?session_id=${sessionId}&organization_id=1`);
        const data = res.data;
        setMessages([
          {
            id: `greet_${Date.now()}`,
            role: "assistant",
            text: data.response || `Hello! Welcome to ${orgName}. I'm ${name}, your AI receptionist. How may I help you today?`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        if (data.quick_actions && data.quick_actions.length > 0) {
          setQuickActions(data.quick_actions);
        }
      } catch (err) {
        setMessages([
          {
            id: `greet_fb_${Date.now()}`,
            role: "assistant",
            text: `Hello! I'm ${name}, your AI receptionist. How may I assist you today?`,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // -------------------------------------------------------------
  // CHAT MESSAGING
  // -------------------------------------------------------------
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputText).trim();
    if (!text || isProcessing) return;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userMsg = {
      id: messageId,
      role: "user",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsProcessing(true);

    try {
      const res = await api.post("/chat/message", {
        session_id: sessionId,
        message_id: messageId,
        text: text,
        language: sttLang.split("-")[0] || "en",
        organization_id: 1
      });

      const data = res.data;
      const aiMsg = {
        id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        role: "assistant",
        text: data.response,
        intent: data.intent,
        stage: data.stage,
        handoff: data.handoff,
        callback: data.callback,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, aiMsg]);
      if (data.quick_actions && data.quick_actions.length > 0) {
        setQuickActions(data.quick_actions);
      }
      setSttLang("en-IN");
    } catch (err) {
      console.error("Chat message error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          text: "I apologize, but I encountered a temporary connection issue. Please try again.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetSession = async () => {
    try {
      await api.post(`/chat/reset/${sessionId}`);
    } catch (e) {
      console.warn("Reset error:", e);
    }
    const newId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    sessionStorage.setItem("ai_receptionist_session_id", newId);
    setSessionId(newId);
    setMessages([]);
    setTimeout(() => {
      ensureInitialGreeting();
    }, 100);
  };

  // -------------------------------------------------------------
  // CALLZENZA-STYLE VOICE ENGINE — STATE MACHINE + SILENCE ENDPOINTING
  // -------------------------------------------------------------
  // Voice States: IDLE | LISTENING | USER_SPEAKING | PROCESSING | AI_SPEAKING | MUTED | ON_HOLD | ENDED
  const SILENCE_ENDPOINT_MS = 500; // Reduced from 750ms → 500ms for faster response feel
  const ACOUSTIC_GUARD_MS = 700;

  // Refs for Audio, STT & Voice State Machine
  const callTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const isRecognitionActiveRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const isOnHoldRef = useRef(false);
  const isMicMutedRef = useRef(false);
  const currentAudioRef = useRef(null);
  const lastAiSpeechEndedTimeRef = useRef(0);
  const recentAiUtterancesRef = useRef([]);
  const voiceStateRef2 = useRef("IDLE"); // separate from view's viewRef

  // Utterance accumulation & duplicate prevention
  const silenceTimerRef = useRef(null);
  const utteranceIdRef = useRef(`utt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const utteranceTextRef = useRef("");
  const isSubmittingUtteranceRef = useRef(false);
  const processedUtterancesSetRef = useRef(new Set());

  // ── Voice State Transition Logger ──
  const setVoiceState2 = (newState) => {
    const prev = voiceStateRef2.current;
    if (prev !== newState) {
      console.log(`[VOICE_STATE] ${prev} → ${newState}`);
      voiceStateRef2.current = newState;
    }
  };

  // ── Echo Detection (secondary safety net) ──
  const isEchoOfAi = (text) => {
    if (!text) return false;
    const cleanText = text.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    if (!cleanText || cleanText.length < 3) return true;

    for (const aiText of recentAiUtterancesRef.current) {
      const cleanAi = (aiText || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      if (!cleanAi) continue;
      if (cleanAi.includes(cleanText) || cleanText.includes(cleanAi)) return true;
      // Prefix match (mic captures first words of AI response)
      const prefixLen = Math.min(cleanText.length, 20);
      if (prefixLen >= 8 && cleanAi.startsWith(cleanText.slice(0, prefixLen))) return true;
      if (prefixLen >= 8 && cleanText.startsWith(cleanAi.slice(0, prefixLen))) return true;
    }
    return false;
  };

  // ── Cleanup on component unmount ──
  useEffect(() => {
    return () => {
      console.log("[VOICE_STATE] CLEANUP — component unmounting");
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      stopSpeechRecognition();
      stopAudioPlayback();
      setVoiceState2("ENDED");
    };
  }, []);

  // ── Centralized STT Start (single entry point) ──
  const startListening = () => {
    // Guard: never start if AI is speaking, muted, on hold, or call not active
    if (isAiSpeakingRef.current) {
      console.log("[STT_START] BLOCKED — AI is speaking");
      return;
    }
    if (isMicMutedRef.current) {
      console.log("[STT_START] BLOCKED — microphone is muted");
      return;
    }
    if (isOnHoldRef.current) {
      console.log("[STT_START] BLOCKED — call is on hold");
      return;
    }
    if (viewRef.current !== "voice-active") {
      console.log("[STT_START] BLOCKED — call not active");
      return;
    }
    if (isRecognitionActiveRef.current) {
      console.log("[STT_START] BLOCKED — already listening");
      return;
    }

    initSpeechRecognition();
    setVoiceState2("LISTENING");
  };

  // ── Centralized STT Stop ──
  const stopListening = (reason) => {
    console.log(`[STT_STOP] reason=${reason}`);
    stopSpeechRecognition();
    // Cancel any pending silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // ── Centralized STT Restart (after TTS completes) ──
  const restartListening = () => {
    if (isAiSpeakingRef.current) {
      console.log("[STT_START] BLOCKED restart — AI still speaking");
      return;
    }
    if (isMicMutedRef.current || isOnHoldRef.current) {
      console.log("[STT_START] BLOCKED restart — muted or on hold");
      return;
    }
    if (viewRef.current !== "voice-active") {
      return;
    }
    // Fresh utterance for the new turn
    utteranceIdRef.current = `utt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    utteranceTextRef.current = "";

    // Delay restart to let acoustic guard window pass
    setTimeout(() => {
      if (!isAiSpeakingRef.current && !isMicMutedRef.current && !isOnHoldRef.current && viewRef.current === "voice-active") {
        startListening();
      }
    }, 300);
  };

  const handleStartVoiceCall = () => {
    setViewAndRef("voice-connecting");
    setVoiceState2("IDLE");
    setTimeout(() => {
      startVoiceSession();
    }, 1200);
  };

  const startVoiceSession = () => {
    setViewAndRef("voice-active");
    setVoiceCallDuration(0);
    setIsMicMuted(false);
    isMicMutedRef.current = false;
    setIsOnHold(false);
    isOnHoldRef.current = false;
    setCallerSaid("");
    utteranceTextRef.current = "";
    utteranceIdRef.current = `utt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    processedUtterancesSetRef.current.clear();
    recentAiUtterancesRef.current = [];

    // Start live duration timer
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setVoiceCallDuration((prev) => prev + 1);
    }, 1000);

    // Initial greeting in voice — personalized with caller name from intake form
    const callerName = (intakeForm.name || "").trim();
    const voiceGreeting = callerName
      ? `Hello ${callerName}! Welcome to ${orgName}. I'm ${name}, your AI receptionist. How can I help you today?`
      : `Hello! Welcome to ${orgName}. I'm ${name}, your AI receptionist. How can I help you today?`;

    recentAiUtterancesRef.current = [voiceGreeting];
    setAiSpoke(voiceGreeting);
    // Play greeting TTS — STT will start AFTER greeting finishes via onPlaybackEnd → restartListening
    playAiVoice(voiceGreeting);
  };

  const handleEndVoiceCall = () => {
    console.log("[VOICE_STATE] CALL ENDING — cleaning up all resources");
    setVoiceState2("ENDED");

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    stopSpeechRecognition();
    stopAudioPlayback();
    utteranceTextRef.current = "";
    processedUtterancesSetRef.current.clear();
    recentAiUtterancesRef.current = [];
    setViewAndRef("hub");
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ── Web Speech STT with 750ms Silence Endpointing ──
  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("[VOICE_ERROR] Web Speech API not supported in this browser.");
      return;
    }

    // Prevent duplicate recognition sessions
    if (recognitionRef.current && isRecognitionActiveRef.current) {
      console.log("[STT_START] BLOCKED — recognition already active");
      return;
    }

    // Destroy any previous instance to prevent ghost listeners
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
      recognitionRef.current = null;
      isRecognitionActiveRef.current = false;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = sttLang;

      recognition.onstart = () => {
        isRecognitionActiveRef.current = true;
        console.log("[STT_START] Recognition started — 750ms silence endpointing active");
      };

      recognition.onresult = (event) => {
        const now = Date.now();

        // ── LAYER 1: STRICT ACOUSTIC ISOLATION ──
        // If AI is actively speaking, the mic is capturing speaker audio.
        // Discard ALL recognition events — do not process, display, or accumulate.
        if (isAiSpeakingRef.current) {
          console.log("[VOICE_IGNORED_DURING_AI] reason=ai_speaking_ref_true");
          return;
        }

        // ── LAYER 2: ACOUSTIC GUARD WINDOW ──
        // After AI speech ends, reject transcriptions for 700ms (reverb/buffer flush)
        if (now - lastAiSpeechEndedTimeRef.current < ACOUSTIC_GUARD_MS) {
          console.log("[VOICE_IGNORED_DURING_AI] reason=acoustic_guard_window");
          return;
        }

        // ── LAYER 3: Hold/Mute check ──
        if (isOnHoldRef.current || isMicMutedRef.current) return;

        let interim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const candidateText = (finalChunk || interim).trim();
        if (!candidateText) return;

        // ── LAYER 4: ECHO CANCELLATION (secondary safety) ──
        if (isEchoOfAi(candidateText)) {
          console.log("[VOICE_IGNORED_DURING_AI] reason=echo_of_ai text=" + candidateText);
          return;
        }

        // ── Genuine user speech detected ──
        setVoiceState2("USER_SPEAKING");

        // Live visual feedback only (never submit interim to backend)
        setCallerSaid(candidateText);
        utteranceTextRef.current = candidateText;

        // Cancel previous silence timer if user continues speaking before 750ms
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        // Wait ~750ms of silence before submitting final utterance
        silenceTimerRef.current = setTimeout(() => {
          finalizeAndSubmitUtterance();
        }, SILENCE_ENDPOINT_MS);
      };

      recognition.onerror = (event) => {
        console.log(`[VOICE_ERROR] STT error: ${event.error}`);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          console.error("[VOICE_ERROR] Microphone permission denied.");
        }
        // Don't auto-restart on error if AI is speaking or muted
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        console.log("[STT_STOP] recognition.onend fired");

        // ── CRITICAL FIX: Do NOT auto-restart if AI is speaking ──
        // This was the root cause of the self-listening loop.
        if (isAiSpeakingRef.current) {
          console.log("[STT_STOP] NOT restarting — AI is speaking (preventing feedback loop)");
          return;
        }

        // Only auto-restart if call is active, not muted, and not on hold
        if (viewRef.current === "voice-active" && !isOnHoldRef.current && !isMicMutedRef.current) {
          setTimeout(() => {
            if (
              viewRef.current === "voice-active" &&
              !isOnHoldRef.current &&
              !isMicMutedRef.current &&
              !isAiSpeakingRef.current &&
              !isRecognitionActiveRef.current
            ) {
              console.log("[STT_START] Auto-restarting after onend (user listening)");
              try {
                recognition.start();
              } catch (e) {
                console.warn("[VOICE_ERROR] Failed to restart recognition:", e);
              }
            }
          }, 200);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("[VOICE_ERROR] Could not start speech recognition:", err);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        if (isRecognitionActiveRef.current) {
          recognitionRef.current.abort(); // abort() is more aggressive than stop()
        }
      } catch (e) {}
      isRecognitionActiveRef.current = false;
    }
  };

  // ── Finalize utterance after 750ms silence — submit exactly once ──
  const finalizeAndSubmitUtterance = () => {
    if (isSubmittingUtteranceRef.current || isAiSpeakingRef.current) return;

    const textToSubmit = (utteranceTextRef.current || "").trim();
    if (!textToSubmit || textToSubmit.length < 2) return;

    // Final echo check before submission
    if (isEchoOfAi(textToSubmit)) {
      console.log("[VOICE_DUPLICATE_IGNORED] Dropped self-echo at finalize:", textToSubmit);
      utteranceTextRef.current = "";
      return;
    }

    const activeUtteranceId = utteranceIdRef.current;
    const dedupKey = `${sessionId}:${activeUtteranceId}`;

    // Duplicate protection using sessionId + utteranceId (short-lived, not permanent)
    if (processedUtterancesSetRef.current.has(dedupKey)) {
      console.log("[VOICE_DUPLICATE_IGNORED] utteranceId already processed:", activeUtteranceId);
      return;
    }
    processedUtterancesSetRef.current.add(dedupKey);

    // Keep set bounded
    if (processedUtterancesSetRef.current.size > 200) {
      processedUtterancesSetRef.current.clear();
      processedUtterancesSetRef.current.add(dedupKey);
    }

    isSubmittingUtteranceRef.current = true;
    utteranceTextRef.current = "";

    console.log(`[STT_FINAL] utteranceId=${activeUtteranceId} text="${textToSubmit}"`);
    setVoiceState2("PROCESSING");
    processVoiceTurn(textToSubmit, activeUtteranceId);
  };

  // ── Process Voice Turn: User text → AgentEngine + TTS in PARALLEL for low latency ──
  // Flow: LLM fires → text shows immediately → TTS pre-fetched simultaneously → audio plays instantly
  const processVoiceTurn = async (userText, utteranceId) => {
    if (!userText || isProcessingVoice) return;
    setIsProcessingVoice(true);
    setCallerSaid(userText);

    const t0 = Date.now();
    console.log(`[AGENT_REQUEST] sessionId=${sessionId} utteranceId=${utteranceId}`);

    try {
      // STEP 1: Send to AgentEngine (LLM)
      const res = await api.post("/chat/message", {
        session_id: sessionId,
        message_id: utteranceId || `voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        text: userText,
        language: sttLang.split("-")[0] || "en",
        organization_id: 1
      });

      const data = res.data;
      if (!data || !data.response) return;

      const responseText = data.response;
      const responseLang = data.language || "en";
      const t1 = Date.now();
      console.log(`[AGENT_RESPONSE] LLM took ${t1 - t0}ms`);

      // STEP 2: Show text IMMEDIATELY (don't wait for TTS)
      setAiSpoke(responseText);

      // STEP 3: Pre-fetch TTS audio IN PARALLEL while text is already showing
      const ttsLang = sttLang.split("-")[0] || "en";
      const ttsUrl = `${API_BASE_URL}/chat/tts?text=${encodeURIComponent(responseText)}&language=${encodeURIComponent(ttsLang)}`;

      let preFetchedBlobUrl = null;
      try {
        const ttsResponse = await fetch(ttsUrl);
        if (ttsResponse.ok) {
          const audioBlob = await ttsResponse.blob();
          preFetchedBlobUrl = URL.createObjectURL(audioBlob);
          const t2 = Date.now();
          console.log(`[TTS_PREFETCH] Audio ready in ${t2 - t1}ms (total: ${t2 - t0}ms)`);
        }
      } catch (ttsErr) {
        console.warn("[VOICE_WARNING] TTS pre-fetch failed, will fallback:", ttsErr);
      }

      setSttLang("en-IN");

      // STEP 4: Play audio (using pre-fetched blob if available — no extra round trip)
      playAiVoice(responseText, preFetchedBlobUrl);

    } catch (err) {
      console.error("[VOICE_ERROR] Voice turn processing error:", err);
      const fallbackMsg = "I apologize, could you please say that again?";
      setAiSpoke(fallbackMsg);
      playAiVoice(fallbackMsg, null);
    } finally {
      setIsProcessingVoice(false);
      isSubmittingUtteranceRef.current = false;
    }
  };

  // ── Play AI Voice via Murf TTS ──
  // CRITICAL: STT is STOPPED before playback and RESTARTED after playback ends
  // preFetchedBlobUrl: optional pre-fetched audio blob (from processVoiceTurn parallel fetch)
  //                    If provided, audio plays INSTANTLY with zero extra network call.
  const playAiVoice = async (text, preFetchedBlobUrl = null) => {
    if (!text) return;

    // Track recent AI responses for echo rejection (secondary safety)
    recentAiUtterancesRef.current.push(text);
    if (recentAiUtterancesRef.current.length > 5) {
      recentAiUtterancesRef.current.shift();
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: STOP STT BEFORE TTS — this is the PRIMARY fix
    // The microphone MUST NOT be actively processing during playback.
    // ═══════════════════════════════════════════════════════════════
    stopListening("tts_starting");

    // Cancel any pending utterance submission
    utteranceTextRef.current = "";
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Set AI speaking state BEFORE playback starts
    isAiSpeakingRef.current = true;
    setIsAiSpeaking(true);
    setVoiceState2("AI_SPEAKING");

    console.log(`[TTS_START] sessionId=${sessionId} blobReady=${!!preFetchedBlobUrl} textLength=${text.length}`);

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: On playback end — restart STT for next user turn
    // ═══════════════════════════════════════════════════════════════
    const onPlaybackEnd = (blobUrl) => {
      // Revoke blob URL to free memory
      if (blobUrl) {
        try { URL.revokeObjectURL(blobUrl); } catch (e) {}
      }
      console.log(`[TTS_END] sessionId=${sessionId}`);
      isAiSpeakingRef.current = false;
      setIsAiSpeaking(false);
      lastAiSpeechEndedTimeRef.current = Date.now();
      currentAudioRef.current = null;

      // Fresh utteranceId for the next user turn
      utteranceIdRef.current = `utt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      utteranceTextRef.current = "";

      // ═══════════════════════════════════════════════════════════
      // STEP 3: RESTART STT after acoustic guard delay
      // Only if call is still active, not muted, not on hold
      // ═══════════════════════════════════════════════════════════
      setVoiceState2("LISTENING");
      restartListening();
    };

    // ── Use pre-fetched blob URL if available (INSTANT play, no extra round trip) ──
    const audioSrc = preFetchedBlobUrl
      || `${API_BASE_URL}/chat/tts?text=${encodeURIComponent(text)}&language=${encodeURIComponent(sttLang.split("-")[0] || "en")}`;

    try {
      const audio = new Audio(audioSrc);
      currentAudioRef.current = audio;

      audio.onended = () => onPlaybackEnd(preFetchedBlobUrl);
      audio.onerror = (audioErr) => {
        console.warn("[MURF_TTS] Audio playback error from server:", audioErr);
        currentAudioRef.current = null;
        if (preFetchedBlobUrl) {
          try { URL.revokeObjectURL(preFetchedBlobUrl); } catch (e) {}
        }
        onPlaybackEnd(null);
      };

      await audio.play();
    } catch (e) {
      console.warn("[MURF_TTS] audio.play() failed:", e);
      currentAudioRef.current = null;
      if (preFetchedBlobUrl) {
        try { URL.revokeObjectURL(preFetchedBlobUrl); } catch (e) {}
      }
      onPlaybackEnd(null);
    }
  };

  // ── Stop Audio Playback (for barge-in or call end) ──
  const stopAudioPlayback = () => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.onended = null; // prevent ghost onended
        currentAudioRef.current.onerror = null;
      } catch (e) {}
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    isAiSpeakingRef.current = false;
    setIsAiSpeaking(false);
    lastAiSpeechEndedTimeRef.current = Date.now();
  };


  // -------------------------------------------------------------
  // QUICK PROMPT HANDLERS
  // -------------------------------------------------------------
  const handleQuickPromptClick = (promptText) => {
    setViewAndRef("chat");
    ensureInitialGreeting();
    setTimeout(() => {
      handleSendMessage(promptText);
    }, 150);
  };

  // -------------------------------------------------------------
  // RENDER VIEWS
  // -------------------------------------------------------------

  return (
    <>
      {/* 1. FLOATING LAUNCHER BUTTON (Matches User Video Request) */}
      <button
        className={`assistant-launcher ${isOpen ? "open" : ""}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && view === "chat") {
            ensureInitialGreeting();
          }
        }}
        title={`${name} AI Receptionist`}
        aria-label="Open AI Receptionist"
      >
        <div className="launcher-media">
          <video
            className="launcher-video"
            src="/robot_eyes_left_to_right_pink_to_blue.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
          {isOpen && (
            <div className="launcher-close-overlay">
              <X size={26} />
            </div>
          )}
        </div>
        {!isOpen && <span className="launcher-badge" />}
      </button>

      {/* 2. ASSISTANT WINDOW MODAL */}
      {isOpen && (
        <div className={`assistant-window ${isMinimized ? "minimized" : ""} view-${view}`}>
          {/* ========================================================= */}
          {/* VIEW: HUB (MAIN MENU / SCREENSHOT 1 & 3)                  */}
          {/* ========================================================= */}
          {view === "hub" && (
            <div className="assistant-hub-container">
              {/* Header */}
              <div className="assistant-header">
                <div className="header-branding">
                  <div className="avatar-wrapper">
                    <div className="avatar-icon" style={{ overflow: "hidden", background: "#000" }}>
                      <video
                        src="/robot_eyes_left_to_right_pink_to_blue.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <span className="live-status-dot" />
                  </div>
                  <div className="header-info">
                    <div className="title-row">
                      <h4>{name} AI</h4>
                      <span className="badge-ai-assistant">AI ASSISTANT</span>
                    </div>
                    <p className="subtitle">Always Active • 24/7 Intelligence</p>
                  </div>
                </div>
                <div className="header-actions">
                  <button
                    className="icon-btn"
                    onClick={() => setIsMinimized(!isMinimized)}
                    title={isMinimized ? "Maximize" : "Minimize"}
                  >
                    {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                  </button>
                  <button
                    className="icon-btn close-btn"
                    onClick={() => setIsOpen(false)}
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <div className="hub-body custom-scrollbar">
                  {/* Conversational Engine Pill */}
                  <div className="engine-pill">
                    <Sparkles size={14} className="sparkle-icon" />
                    <span>{name} Conversational Engine</span>
                  </div>

                  {/* Greeting Text */}
                  <div className="hub-greeting-section">
                    <h2>Hi! How can I help?</h2>
                    <p>
                      Ask about {name}, our services, AI calling, campaigns, or get help with your workflow.
                    </p>
                  </div>

                  {/* Big Action Cards */}
                  <div className="hub-action-cards">
                    {/* 1. Talk with Live Voice */}
                    <button
                      className="action-card card-voice"
                      onClick={() => setViewAndRef("voice-precall")}
                    >
                      <div className="card-icon-wrap icon-orange">
                        <Mic size={22} />
                      </div>
                      <div className="card-text">
                        <div className="card-title-row">
                          <strong>Talk with {name}</strong>
                          <span className="badge-live-voice">LIVE VOICE</span>
                        </div>
                        <p>Start a live browser conversation with our AI</p>
                      </div>
                      <ChevronRight size={18} className="card-arrow" />
                    </button>

                    {/* 2. Ask via Text Chat */}
                    <button
                      className="action-card card-chat"
                      onClick={() => {
                        setViewAndRef("chat");
                        ensureInitialGreeting();
                      }}
                    >
                      <div className="card-icon-wrap icon-purple">
                        <MessageSquare size={20} />
                      </div>
                      <div className="card-text">
                        <strong>Ask via Text Chat</strong>
                        <p>Instant answers powered by {name} RAG</p>
                      </div>
                      <ChevronRight size={18} className="card-arrow" />
                    </button>

                    {/* 3. Book a Demo */}
                    <button
                      className="action-card card-demo"
                      onClick={() => {
                        setViewAndRef("chat");
                        ensureInitialGreeting();
                        setTimeout(() => {
                          handleSendMessage(`I would like to book a demo / appointment with ${name}`);
                        }, 150);
                      }}
                    >
                      <div className="card-icon-wrap icon-yellow">
                        <Calendar size={20} />
                      </div>
                      <div className="card-text">
                        <strong>Book a Demo</strong>
                        <p>Schedule a live walkthrough with our team</p>
                      </div>
                      <ChevronRight size={18} className="card-arrow" />
                    </button>

                    {/* 4. Talk to a Human */}
                    <button
                      className="action-card card-human"
                      onClick={() => {
                        setViewAndRef("chat");
                        ensureInitialGreeting();
                        setTimeout(() => {
                          handleSendMessage("I want to speak with a human representative please");
                        }, 150);
                      }}
                    >
                      <div className="card-icon-wrap icon-cyan">
                        <Headphones size={20} />
                      </div>
                      <div className="card-text">
                        <strong>Talk to a Human</strong>
                        <p>Get dedicated support from our specialists</p>
                      </div>
                      <ChevronRight size={18} className="card-arrow" />
                    </button>
                  </div>

                  {/* Quick Prompts Section */}
                  <div className="quick-prompts-section">
                    <div className="section-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Zap size={14} style={{ color: "#facc15" }} />
                      <span>QUICK PROMPTS</span>
                    </div>
                    <div className="prompt-chips-wrap">
                      <button
                        className="prompt-chip"
                        onClick={() => handleQuickPromptClick(`What is ${name}?`)}
                      >
                        • What is {name}?
                      </button>
                      <button
                        className="prompt-chip"
                        onClick={() => handleQuickPromptClick("How does AI Calling work?")}
                      >
                        • How does AI Calling work?
                      </button>
                      <button
                        className="prompt-chip"
                        onClick={() => handleQuickPromptClick("I want to book an appointment")}
                      >
                        • Book an appointment
                      </button>
                      <button
                        className="prompt-chip"
                        onClick={() => handleQuickPromptClick(`What services does ${orgName} offer?`)}
                      >
                        • Our services
                      </button>
                      <button
                        className="prompt-chip"
                        onClick={() => handleQuickPromptClick("What is your pricing?")}
                      >
                        • Pricing
                      </button>
                      <button
                        className="prompt-chip"
                        onClick={() => handleQuickPromptClick("Contact support")}
                      >
                        • Contact Support
                      </button>
                    </div>
                  </div>

                  {/* Connectors (WhatsApp & Phone) */}
                  <div className="hub-connectors">
                    <a
                      href="https://wa.me/?text=Hi%2C+I+have+a+question+about+AI+Receptionist"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="connector-btn whatsapp-btn"
                    >
                      <span className="whatsapp-dot" />
                      <span>Continue on WhatsApp</span>
                      <MessageCircle size={18} className="whatsapp-icon" />
                    </a>

                    <div className="phone-fallback-row">
                      <span>Prefer a phone call? Talk to our team</span>
                      <Phone size={14} className="phone-icon" />
                    </div>
                  </div>

                  {/* Footer Bar */}
                  <div className="hub-footer-bar">
                    <div className="footer-left">
                      <Sparkles size={12} />
                      <span>{name} AI • Isolated RAG</span>
                    </div>
                    <div className="footer-right">
                      <ShieldCheck size={13} />
                      <span>Enterprise Protected</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: VOICE PRE-CALL INTAKE (SCREENSHOT 5)                */}
          {/* ========================================================= */}
          {view === "voice-precall" && (
            <div className="assistant-voice-precall-container">
              {/* Header */}
              <div className="assistant-header simple-header">
                <button
                  className="back-btn"
                  onClick={() => setViewAndRef("hub")}
                  title="Back to menu"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="header-branding-center">
                  <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", background: "#000", marginRight: 8, display: "inline-block", verticalAlign: "middle" }}>
                    <video
                      src="/robot_eyes_left_to_right_pink_to_blue.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <span>{name} AI</span>
                </div>
                <button
                  className="icon-btn close-btn"
                  onClick={() => setIsOpen(false)}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="precall-body">
                <div className="precall-card">
                  <div className="precall-mic-icon-wrap">
                    <Mic size={28} />
                  </div>
                  <h3>Talk to {name}</h3>
                  <p>Start a conversation with our AI Agent.</p>

                  <div className="intake-form">
                    <input
                      type="text"
                      className="intake-input"
                      placeholder="Enter your name"
                      value={intakeForm.name}
                      onChange={(e) => setIntakeForm({ ...intakeForm, name: e.target.value })}
                    />
                    <input
                      type="email"
                      className="intake-input"
                      placeholder="Enter your email"
                      value={intakeForm.email}
                      onChange={(e) => setIntakeForm({ ...intakeForm, email: e.target.value })}
                    />
                    <input
                      type="tel"
                      className="intake-input"
                      placeholder="Enter your phone number"
                      value={intakeForm.phone}
                      onChange={(e) => setIntakeForm({ ...intakeForm, phone: e.target.value })}
                    />

                    <button
                      className="btn-start-call"
                      onClick={handleStartVoiceCall}
                    >
                      <Mic size={18} />
                      <span>Start Call</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: VOICE CONNECTING (SCREENSHOT 2)                     */}
          {/* ========================================================= */}
          {view === "voice-connecting" && (
            <div className="assistant-voice-connecting-container">
              <div className="assistant-header simple-header">
                <button
                  className="back-btn"
                  onClick={() => setViewAndRef("voice-precall")}
                  title="Back"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="header-branding-center">
                  <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", background: "#000", marginRight: 8, display: "inline-block", verticalAlign: "middle" }}>
                    <video
                      src="/robot_eyes_left_to_right_pink_to_blue.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <span>{name} AI</span>
                </div>
                <button
                  className="icon-btn close-btn"
                  onClick={() => setIsOpen(false)}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="connecting-body">
                <div className="connecting-card">
                  <div className="connecting-spinner-wrap">
                    <div className="connecting-spinner" />
                  </div>
                  <h3>Connecting to AI Assistant...</h3>
                  <p>Please allow microphone access if prompted.</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: VOICE CALL ACTIVE (SCREENSHOT 4)                    */}
          {/* ========================================================= */}
          {view === "voice-active" && (
            <div className="assistant-voice-active-container">
              <div className="assistant-header simple-header">
                <div className="header-branding-center">
                  <div style={{ width: 24, height: 24, borderRadius: "50%", overflow: "hidden", background: "#000", marginRight: 8, display: "inline-block", verticalAlign: "middle" }}>
                    <video
                      src="/robot_eyes_left_to_right_pink_to_blue.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <span>{name} AI</span>
                </div>
                <div className="header-actions">
                  <button
                    className="icon-btn close-btn"
                    onClick={handleEndVoiceCall}
                    title="End Call"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="active-call-body">
                <div className="active-call-card">
                  {/* Vibrant Gradient Waveform Visualizer */}
                  <div className="call-waveform-box">
                    <div className={`wave-bar bar-1 ${isAiSpeaking ? "active-ai" : ""}`} />
                    <div className={`wave-bar bar-2 ${isAiSpeaking ? "active-ai" : ""}`} />
                    <div className={`wave-bar bar-3 ${isAiSpeaking ? "active-ai" : ""}`} />
                    <div className={`wave-bar bar-4 ${isAiSpeaking ? "active-ai" : ""}`} />
                    <div className={`wave-bar bar-5 ${isAiSpeaking ? "active-ai" : ""}`} />
                    <div className={`wave-bar bar-6 ${isAiSpeaking ? "active-ai" : ""}`} />
                    <div className={`wave-bar bar-7 ${isAiSpeaking ? "active-ai" : ""}`} />
                    <div className={`wave-bar bar-8 ${isAiSpeaking ? "active-ai" : ""}`} />
                    <div className={`wave-bar bar-9 ${isAiSpeaking ? "active-ai" : ""}`} />
                    <div className={`wave-bar bar-10 ${isAiSpeaking ? "active-ai" : ""}`} />
                    <div className={`wave-bar bar-11 ${isAiSpeaking ? "active-ai" : ""}`} />
                  </div>

                  <h3>Call in progress</h3>
                  <p>Your AI assistant is ready to talk with you.</p>

                  {/* Live Call Duration */}
                  <div className="call-timer-display">
                    {formatTimer(voiceCallDuration)}
                  </div>

                  {/* Transcript previews */}
                  <div className="voice-transcripts-container">
                    {callerSaid && (
                      <div className="live-transcript caller-transcript">
                        <span className="speaker-tag">You:</span> {callerSaid}
                      </div>
                    )}

                    {isProcessingVoice && (
                      <div className="live-transcript thinking-transcript">
                        <span className="thinking-dots">
                          <span />
                          <span />
                          <span />
                        </span>
                        <span>{name} is thinking...</span>
                      </div>
                    )}

                    {aiSpoke && (
                      <div className="live-transcript ai-transcript">
                        <span className="speaker-tag-ai">{name}:</span> {aiSpoke}
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="call-controls-row">
                     <button
                       className={`control-pill ${isMicMuted ? "muted" : ""}`}
                       onClick={() => {
                         const newMuted = !isMicMuted;
                         setIsMicMuted(newMuted);
                         isMicMutedRef.current = newMuted; // sync the ref used by voice guards
                         if (newMuted) {
                           // Muting: stop mic immediately
                           stopListening("user_muted");
                         } else {
                           // Unmuting: only start listening if AI is not speaking
                           if (!isAiSpeakingRef.current) {
                             startListening();
                           }
                         }
                       }}
                       title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
                     >
                       {isMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
                       <span>{isMicMuted ? "Unmute" : "Mute"}</span>
                     </button>

                    <button
                      className="btn-end-call"
                      onClick={handleEndVoiceCall}
                    >
                      <PhoneOff size={18} />
                      <span>End Call</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW: CHAT INTERFACE                                      */}
          {/* ========================================================= */}
          {view === "chat" && (
            <div className="assistant-chat-container">
              {/* Header */}
              <div className="assistant-header">
                <div className="header-branding">
                  <button
                    className="back-btn"
                    onClick={() => setViewAndRef("hub")}
                    title="Back to menu"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="avatar-wrapper">
                    <div className="avatar-icon" style={{ overflow: "hidden", background: "#000" }}>
                      <video
                        src="/robot_eyes_left_to_right_pink_to_blue.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <span className="live-status-dot" />
                  </div>
                  <div className="header-info">
                    <div className="title-row">
                      <h4>{name} AI</h4>
                      <span className="badge-ai-assistant">AI CHAT</span>
                    </div>
                    <p className="subtitle">Instant 24/7 Assistance</p>
                  </div>
                </div>
                <div className="header-actions">
                  <button
                    className="icon-btn"
                    onClick={handleResetSession}
                    title="Reset Conversation"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => setIsMinimized(!isMinimized)}
                    title={isMinimized ? "Maximize" : "Minimize"}
                  >
                    {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                  </button>
                  <button
                    className="icon-btn close-btn"
                    onClick={() => setIsOpen(false)}
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {!isMinimized && (
                <>
                  {/* Chat Messages Stream */}
                  <div className="chat-messages-area custom-scrollbar">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`message-bubble-row ${msg.role === "user" ? "row-user" : "row-assistant"}`}
                      >
                        <div className={`message-bubble ${msg.role}`}>
                          <div className="message-text">{msg.text}</div>
                          <div className="message-meta">
                            <span className="msg-time">{msg.time}</span>
                            {msg.intent && <span className="msg-intent">{msg.intent}</span>}
                          </div>

                          {/* Handoff Card if present */}
                          {msg.handoff && (
                            <div className="handoff-card">
                              <Headphones size={16} className="card-alert-icon" />
                              <div className="handoff-details">
                                <strong>Human Handoff Initiated</strong>
                                <p>Transferring your session to our live specialist.</p>
                              </div>
                            </div>
                          )}

                          {/* Callback Card if present */}
                          {msg.callback && (
                            <div className="callback-card">
                              <CheckCircle size={16} className="card-alert-icon" />
                              <div className="callback-details">
                                <strong>Callback Registered</strong>
                                <p>Our team will reach out to you shortly.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {isProcessing && (
                      <div className="message-bubble-row row-assistant">
                        <div className="message-bubble assistant typing-bubble">
                          <div className="typing-dots">
                            <span />
                            <span />
                            <span />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Contextual Quick Actions Pills */}
                  {quickActions && quickActions.length > 0 && (
                    <div className="chat-quick-actions">
                      {quickActions.map((qa, idx) => (
                        <button
                          key={idx}
                          className="chat-qa-pill"
                          onClick={() => handleSendMessage(qa)}
                          disabled={isProcessing}
                        >
                          {qa}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input Form */}
                  <form
                    className="chat-input-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                  >
                    <input
                      type="text"
                      className="chat-text-input"
                      placeholder={`Ask ${name} anything...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isProcessing}
                    />
                    <button
                      type="submit"
                      className="chat-send-btn"
                      disabled={!inputText.trim() || isProcessing}
                      title="Send message"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
