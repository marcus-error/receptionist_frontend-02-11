import { useEffect, useState, useRef } from "react";
import Badge from "../../components/ui/Badge.jsx";
import API_BASE_URL from "../../config/api.js";
import { knowledgeService } from "../../services/knowledge.service.js";

function cleanAndDeduplicateResponse(text) {
  if (!text || typeof text !== "string") return "";
  let clean = text.trim();

  // 1. Direct duplicate paragraph collapse: e.g. "Sentence A. Sentence B. Sentence A. Sentence B."
  const half = Math.floor(clean.length / 2);
  for (let split = Math.max(10, half - 20); split <= Math.min(clean.length - 10, half + 20); split++) {
    const left = clean.substring(0, split).trim();
    const right = clean.substring(split).trim();
    if (left && right && left.toLowerCase() === right.toLowerCase()) {
      clean = left;
      break;
    }
  }

  // 2. Multi-sentence block collapse (blocks of 20+ chars that repeat consecutively)
  let cleanLen = clean.length;
  for (let len = Math.floor(cleanLen / 2); len >= 20; len--) {
    for (let start = 0; start <= cleanLen - 2 * len; start++) {
      const b1 = clean.substring(start, start + len).trim();
      const b2 = clean.substring(start + len, start + 2 * len).trim();
      if (b1.length >= 20 && b1.toLowerCase() === b2.toLowerCase()) {
        clean = clean.substring(0, start + len) + clean.substring(start + 2 * len);
        cleanLen = clean.length;
        break;
      }
    }
  }

  // 3. Sentence-level deduplication across the message with substring containment
  const sentenceMatches = clean.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [];
  const seenNorm = [];
  const dedupedSentences = [];

  for (const s of sentenceMatches) {
    const norm = s.toLowerCase().replace(/[^\w\s]/g, "").trim().replace(/\s+/g, " ");
    if (!norm) continue;

    // Don't deduplicate tiny phrases like 'yes.', 'okay.'
    if (norm.split(" ").length <= 2 && norm.length < 10) {
      dedupedSentences.push(s);
      continue;
    }

    let isDup = false;
    let replaceIdx = null;
    for (let idx = 0; idx < seenNorm.length; idx++) {
      const seen = seenNorm[idx];
      if (norm === seen) {
        isDup = true;
        break;
      }
      if (norm.length >= 15 && seen.length >= 15) {
        if (seen.includes(norm)) {
          isDup = true;
          break;
        } else if (norm.includes(seen)) {
          if (seen.split(" ").length <= 5 && norm.split(" ").length > seen.split(" ").length) {
            replaceIdx = idx;
            break;
          } else {
            isDup = true;
            break;
          }
        }
      }
    }

    if (isDup) continue;

    if (replaceIdx !== null) {
      seenNorm[replaceIdx] = norm;
      dedupedSentences[replaceIdx] = s;
      continue;
    }

    seenNorm.push(norm);
    dedupedSentences.push(s);
  }

  const finalResult = dedupedSentences.join(" ").replace(/\s+([.!?])/g, "$1").replace(/\s+/g, " ").trim();
  return finalResult || clean;
}

const LANG_CODE_TO_STT = {
  ta: "ta-IN",
  "ta-IN": "ta-IN",
  hi: "hi-IN",
  "hi-IN": "hi-IN",
  te: "te-IN",
  "te-IN": "te-IN",
  kn: "kn-IN",
  "kn-IN": "kn-IN",
  en: "en-IN",
  "en-IN": "en-IN",
  "en-US": "en-US",
};

export default function Voice() {
  const [callData, setCallData] = useState({
    caller_said: "",
    ai_response: "",
    intent: "Waiting...",
    emotion: "Waiting...",
    rag_source: "None",
    active_rag_title: "Active Knowledge Base",
    telemetry: null
  });
  const [status, setStatus] = useState("Disconnected");
  const [voiceState, setVoiceState] = useState("IDLE"); // 'IDLE', 'LISTENING', 'USER_SPEAKING', 'PROCESSING', 'AI_SPEAKING', 'ON_HOLD', 'INTERRUPTED', 'ENDED', 'ERROR'
  const [isRecording, setIsRecording] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [sttLang, setSttLang] = useState("en-IN");
  const [micError, setMicError] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [activeDocInfo, setActiveDocInfo] = useState({
    id: null,
    title: "",
    has_active: false,
    business_type: "GENERAL",
    booking_type: "BUSINESS_CONSULTATION",
    error: null
  });

  const wsRef = useRef(null);
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const isOnHoldRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const isRecognitionActiveRef = useRef(false);
  const voiceStateRef = useRef("IDLE");
  const reconnectTimeoutRef = useRef(null);
  const lastAiSpeechEndedTimeRef = useRef(0);
  const acousticGuardTimeoutRef = useRef(null);

  // Turn and Message Idempotency Tracking
  const processedEventsRef = useRef(new Set());
  const currentMessageIdRef = useRef(null);
  const isStreamingActiveRef = useRef(false);
  const playedAudioMessageIdsRef = useRef(new Set());
  const lastSentTranscriptRef = useRef("");
  const lastSentTimeRef = useRef(0);

  // Audio Chunk Playback Queue
  const audioQueueRef = useRef([]);
  const isPlayingQueueRef = useRef(false);
  const currentAudioRef = useRef(null);

  // Synchronize voice state and hold refs
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    isOnHoldRef.current = isOnHold;
  }, [isOnHold]);

  // Stage G Diagnostic Logging: Text displayed in the AI Receptionist section
  useEffect(() => {
    if (callData.ai_response) {
      console.log(`[DIAG_STAGE_G_DISPLAYED_TEXT] text_len=${callData.ai_response.length} text="${callData.ai_response}"`);
    }
  }, [callData.ai_response]);

  const stopAudioPlayback = () => {
    audioQueueRef.current = [];
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (e) {}
      currentAudioRef.current = null;
    }
    isPlayingQueueRef.current = false;
    setIsAiSpeaking(false);
    isAiSpeakingRef.current = false;
    lastAiSpeechEndedTimeRef.current = Date.now();
  };

  
  const safeStartRecognition = (attempt = 1) => {
    if (!recognitionRef.current || !isRecordingRef.current || isOnHoldRef.current || isAiSpeakingRef.current || isPlayingQueueRef.current) {
      return;
    }
    if (isRecognitionActiveRef.current) return;

    try {
      recognitionRef.current.start();
    } catch (err) {
      if (attempt <= 4) {
        setTimeout(() => safeStartRecognition(attempt + 1), 150 * attempt);
      }
    }
  };

  const handleBargeIn = () => {
    if (isAiSpeakingRef.current || isPlayingQueueRef.current || audioQueueRef.current.length > 0) {
      console.log("[BARGE-IN DETECTED] Interrupted AI speech. Stopping audio playback.");
      stopAudioPlayback();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "interrupt" }));
      }
      setVoiceState("INTERRUPTED");
      setTimeout(() => {
        if (!isOnHoldRef.current && isRecordingRef.current) {
          setVoiceState("LISTENING");
          safeStartRecognition();
        }
      }, 200);
    }
  };

  const toggleHold = () => {
    if (!isRecordingRef.current) return;

    if (!isOnHold) {
      setIsOnHold(true);
      isOnHoldRef.current = true;
      setVoiceState("ON_HOLD");
      stopAudioPlayback();
      if (recognitionRef.current && isRecognitionActiveRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        isRecognitionActiveRef.current = false;
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "hold" }));
      }
    } else {
      setIsOnHold(false);
      isOnHoldRef.current = false;
      setVoiceState("LISTENING");
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "resume" }));
      }
      resumeRecognitionSafely();
    }
  };

  const triggerHumanHandoff = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const handoffMsg = "I would like to speak to a human receptionist or representative please.";
    const utteranceId = `handoff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setVoiceState("PROCESSING");
    isStreamingActiveRef.current = false;
    currentMessageIdRef.current = null;
    setCallData(prev => ({ ...prev, ai_response: "", caller_said: handoffMsg }));
    wsRef.current.send(JSON.stringify({ text: handoffMsg, utterance_id: utteranceId }));
  };

  const resumeRecognitionSafely = () => {
    if (acousticGuardTimeoutRef.current) {
      clearTimeout(acousticGuardTimeoutRef.current);
    }

    acousticGuardTimeoutRef.current = setTimeout(() => {
      if (isRecordingRef.current && !isOnHoldRef.current && !isAiSpeakingRef.current && !isPlayingQueueRef.current && !currentAudioRef.current) {
        setVoiceState("LISTENING");
        safeStartRecognition();
      }
    }, 450);
  };

  const playContinuousAudio = (base64Audio) => {
    if (isOnHoldRef.current || !base64Audio) return;

    // Clear any previous audio queue and stop current audio
    audioQueueRef.current = [];
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch (e) {}
      currentAudioRef.current = null;
    }

    isPlayingQueueRef.current = true;
    setIsAiSpeaking(true);
    isAiSpeakingRef.current = true;
    setVoiceState("AI_SPEAKING");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "playback_started", timestamp: Date.now() }));
      } catch (e) {}
    }

    // Immediately isolate microphone while AI is speaking
    if (recognitionRef.current && isRecognitionActiveRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      isRecognitionActiveRef.current = false;
    }

    const audioSrc = `data:audio/mp3;base64,${base64Audio}`;
    const audio = new Audio(audioSrc);
    currentAudioRef.current = audio;

    const handlePlaybackEnd = () => {
      currentAudioRef.current = null;
      isPlayingQueueRef.current = false;
      setIsAiSpeaking(false);
      isAiSpeakingRef.current = false;
      lastAiSpeechEndedTimeRef.current = Date.now();
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: "playback_completed", timestamp: Date.now() }));
        } catch (e) {}
      }
      if (!isOnHoldRef.current) {
        resumeRecognitionSafely();
      }
    };

    audio.onended = handlePlaybackEnd;
    audio.onerror = (err) => {
      console.warn("Continuous audio playback error:", err);
      handlePlaybackEnd();
    };

    audio.play().catch((err) => {
      console.warn("Continuous audio play() interrupted or blocked:", err);
      handlePlaybackEnd();
    });
  };

  const playAudioQueue = () => {
    if (isPlayingQueueRef.current || audioQueueRef.current.length === 0 || isOnHoldRef.current) return;

    isPlayingQueueRef.current = true;
    setIsAiSpeaking(true);
    isAiSpeakingRef.current = true;
    setVoiceState("AI_SPEAKING");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: "playback_started", timestamp: Date.now() }));
      } catch (e) {}
    }

    if (recognitionRef.current && isRecognitionActiveRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      isRecognitionActiveRef.current = false;
    }

    const nextBase64 = audioQueueRef.current.shift();
    const audioSrc = `data:audio/mp3;base64,${nextBase64}`;
    const audio = new Audio(audioSrc);
    currentAudioRef.current = audio;

    audio.onended = () => {
      currentAudioRef.current = null;
      isPlayingQueueRef.current = false;

      if (audioQueueRef.current.length > 0 && !isOnHoldRef.current) {
        playAudioQueue();
      } else {
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
        lastAiSpeechEndedTimeRef.current = Date.now();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({ type: "playback_completed", timestamp: Date.now() }));
          } catch (e) {}
        }
        if (!isOnHoldRef.current) {
          resumeRecognitionSafely();
        }
      }
    };

    audio.onerror = () => {
      currentAudioRef.current = null;
      isPlayingQueueRef.current = false;
      if (audioQueueRef.current.length > 0 && !isOnHoldRef.current) {
        playAudioQueue();
      } else {
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
        lastAiSpeechEndedTimeRef.current = Date.now();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({ type: "playback_completed", timestamp: Date.now() }));
          } catch (e) {}
        }
        if (!isOnHoldRef.current) {
          resumeRecognitionSafely();
        }
      }
    };

    audio.play().catch((err) => {
      console.warn("Audio playback error:", err);
      currentAudioRef.current = null;
      isPlayingQueueRef.current = false;
      if (audioQueueRef.current.length > 0 && !isOnHoldRef.current) {
        playAudioQueue();
      } else {
        setIsAiSpeaking(false);
        isAiSpeakingRef.current = false;
        lastAiSpeechEndedTimeRef.current = Date.now();
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({ type: "playback_completed", timestamp: Date.now() }));
          } catch (e) {}
        }
        if (!isOnHoldRef.current) {
          resumeRecognitionSafely();
        }
      }
    });
  };

  const enqueueAudio = (base64Audio) => {
    audioQueueRef.current.push(base64Audio);
    playAudioQueue();
  };

  useEffect(() => {
    let isMounted = true;
    const fetchActiveDocument = async () => {
      try {
        const res = await knowledgeService.getActive();
        if (!isMounted) return;
        if (res && res.has_active && res.document) {
          setActiveDocInfo({
            id: res.document.id,
            title: res.document.title,
            has_active: true,
            business_type: res.document.document_type || "GENERAL",
            booking_type: "GENERAL",
            error: null
          });
          setCallData(prev => ({
            ...prev,
            active_rag_title: res.document.title,
            rag_source: `${res.document.title} (ID: ${res.document.id})`
          }));
        } else {
          setActiveDocInfo({
            id: null,
            title: "",
            has_active: false,
            business_type: "GENERAL",
            booking_type: "GENERAL",
            error: "No active RAG document found for this organization."
          });
          setCallData(prev => ({
            ...prev,
            active_rag_title: "No Active Document",
            rag_source: "No Active Document"
          }));
        }
      } catch (err) {
        console.warn("Could not pre-fetch active RAG document:", err);
      }
    };
    fetchActiveDocument();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const connectWebSocket = () => {
      if (!isSubscribed) return;

      // Clean up previous connection if any
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        try { wsRef.current.close(); } catch (e) {}
        wsRef.current = null;
      }

      let rawToken = localStorage.getItem("token") || "";
      let token = rawToken.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").replace(/^Bearer\s+/i, "").trim();
      if (token === "null" || token === "undefined") token = "";

      // Strip /api/v1 or /api suffix from API_BASE_URL before building the
      // WebSocket URL. The voice socket is mounted at the root level (/ws/voice),
      // not under the /api/v1 prefix, so we must derive the server root first.
      const wsServerRoot = API_BASE_URL.replace(/\/api(?:\/v1)?\/?$/, "").replace(/^http/, "ws");
      const wsUrl = wsServerRoot + "/ws/voice" + (token ? `?token=${encodeURIComponent(token)}` : "");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isSubscribed) setStatus("Connected");
        if (token) {
          try {
            ws.send(JSON.stringify({ type: "auth", token }));
          } catch (e) {}
        }
      };

      ws.onmessage = (event) => {
        if (!isSubscribed) return;
        const data = JSON.parse(event.data);

        // Turn-level / Message-level event deduplication
        const eventKey = `${data.type}_${data.message_id || ''}_${data.chunk_index ?? ''}_${data.text || ''}`;
        if (data.message_id && processedEventsRef.current.has(eventKey)) {
          console.warn("[EVENT DEDUP] Dropping duplicate WebSocket event:", eventKey);
          return;
        }
        if (data.message_id) {
          processedEventsRef.current.add(eventKey);
          if (processedEventsRef.current.size > 200) {
            const arr = Array.from(processedEventsRef.current);
            processedEventsRef.current = new Set(arr.slice(arr.length - 100));
          }
        }

        if (data.type === "rag_bound") {
          const hasActive = data.has_active !== false && data.title && data.title !== "No Active Document" && data.title !== "None";
          setActiveDocInfo(prev => ({
            ...prev,
            id: data.document_id || null,
            title: data.title || "",
            has_active: hasActive,
            business_type: data.business_type || prev.business_type,
            booking_type: data.booking_type || prev.booking_type,
            error: hasActive ? null : "No active RAG document found."
          }));
          setCallData(prev => ({
            ...prev,
            active_rag_title: data.title || "Active Knowledge Base",
            rag_source: (data.document_id && data.title && data.title !== "None" && data.title !== "No Active Document")
              ? `${data.title} (ID: ${data.document_id})`
              : "No Active Document"
          }));
        } else if (data.type === "call_started") {
          setActiveDocInfo(prev => ({
            ...prev,
            id: data.document_id,
            title: data.title,
            has_active: true,
            business_type: data.business_type || prev.business_type,
            booking_type: data.booking_type || prev.booking_type,
            error: null
          }));
          setCallData(prev => ({
            ...prev,
            caller_said: "",
            ai_response: "",
            intent: "Call Connected",
            emotion: "Neutral",
            active_rag_title: data.title,
            rag_source: `${data.title} (ID: ${data.document_id})`
          }));
          setIsRecording(true);
          isRecordingRef.current = true;
        } else if (data.type === "call_error") {
          setMicError(data.message || "Failed to start call");
          setIsRecording(false);
          isRecordingRef.current = false;
          setVoiceState("ERROR");
          stopAudioPlayback();
          if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) {}
          }
        } else if (data.type === "call_ended") {
          setIsRecording(false);
          isRecordingRef.current = false;
          setVoiceState("IDLE");
          stopAudioPlayback();
        } else if (data.type === "language_changed") {
          const targetStt = data.stt_lang || LANG_CODE_TO_STT[data.language] || "en-IN";
          console.log(`[STT_SYNC] Language changed to: ${data.language} -> STT: ${targetStt}`);
          setSttLang(targetStt);
          if (recognitionRef.current && recognitionRef.current.lang !== targetStt) {
            recognitionRef.current.lang = targetStt;
            if (isRecordingRef.current && isRecognitionActiveRef.current) {
              try { recognitionRef.current.stop(); } catch (err) {}
            }
          }
        } else if (data.type === "transcription") {
          setCallData(prev => ({ ...prev, caller_said: data.text }));
        } else if (data.type === "analysis") {
          setCallData(prev => ({ ...prev, intent: data.intent, emotion: data.emotion }));
          if (data.language) {
            const mappedStt = LANG_CODE_TO_STT[data.language];
            if (mappedStt && mappedStt !== sttLang) {
              console.log(`[STT_SYNC] Analysis language updated to: ${data.language} -> STT: ${mappedStt}`);
              setSttLang(mappedStt);
              if (recognitionRef.current && recognitionRef.current.lang !== mappedStt) {
                recognitionRef.current.lang = mappedStt;
                if (isRecordingRef.current && isRecognitionActiveRef.current) {
                  try { recognitionRef.current.stop(); } catch (err) {}
                }
              }
            }
          }
        } else if (data.type === "rag") {
          setCallData(prev => ({
            ...prev,
            rag_source: (data.source && !data.source.startsWith("None")) ? data.source : prev.rag_source
          }));
        } else if (data.type === "text_chunk") {
          if (data.text) {
            isStreamingActiveRef.current = true;
            const chunkPreview = data.text.length > 50 ? `${data.text.substring(0, 50)}...` : data.text;
            console.log(`[DIAG_STAGE_E_WS_PAYLOAD] event_type=text_chunk message_id=${data.message_id || ''} turn_id=${data.turn_id || ''} text_len=${data.text.length} text="${chunkPreview}"`);
            if (data.message_id && data.message_id !== currentMessageIdRef.current) {
              currentMessageIdRef.current = data.message_id;
              setCallData(prev => {
                console.log(`[DIAG_STAGE_F_ASSISTANT_STATE] event_type=text_chunk_reset message_id=${data.message_id} text_len=${data.text.length}`);
                return {
                  ...prev,
                  ai_response: data.text
                };
              });
            } else {
              setCallData(prev => {
                const updated = (prev.ai_response || "") + data.text;
                console.log(`[DIAG_STAGE_F_ASSISTANT_STATE] event_type=text_chunk_append message_id=${data.message_id} total_len=${updated.length}`);
                return {
                  ...prev,
                  ai_response: updated
                };
              });
            }
          }
        } else if (data.type === "response") {
          isStreamingActiveRef.current = false;
          if (data.message_id) {
            currentMessageIdRef.current = data.message_id;
          }
          const cleanText = cleanAndDeduplicateResponse(data.text || "");
          console.log(`[DIAG_STAGE_E_WS_PAYLOAD] event_type=response message_id=${data.message_id || ''} turn_id=${data.turn_id || ''} text_len=${cleanText.length} text="${cleanText.substring(0, 60)}..."`);
          setCallData(prev => {
            console.log(`[DIAG_STAGE_F_ASSISTANT_STATE] event_type=response_finalize message_id=${data.message_id} text_len=${cleanText.length}`);
            return { ...prev, ai_response: cleanText };
          });
        } else if (data.type === "audio_chunk") {
          console.log(`[DIAG_STAGE_E_WS_PAYLOAD] event_type=audio_chunk chunk_index=${data.chunk_index ?? ''} has_audio=${Boolean(data.audio)} text_len=${(data.text || '').length}`);
          if (data.audio) {
            enqueueAudio(data.audio);
          }
        } else if (data.type === "audio") {
          const audioMsgId = data.message_id || data.text;
          if (audioMsgId && playedAudioMessageIdsRef.current.has(audioMsgId)) {
            console.warn("[AUDIO DEDUP] Audio for message already played/enqueued:", audioMsgId);
            return;
          }
          if (audioMsgId) {
            playedAudioMessageIdsRef.current.add(audioMsgId);
            if (playedAudioMessageIdsRef.current.size > 100) {
              const arr = Array.from(playedAudioMessageIdsRef.current);
              playedAudioMessageIdsRef.current = new Set(arr.slice(arr.length - 50));
            }
          }
          if (data.audio) {
            playContinuousAudio(data.audio);
          }
          if (data.text) {
            const cleanAudioText = cleanAndDeduplicateResponse(data.text || "");
            setCallData(prev => ({
              ...prev,
              ai_response: cleanAudioText
            }));
          }
        } else if (data.type === "hold_ack") {
          setIsOnHold(data.status === "on_hold");
          setVoiceState(data.status === "on_hold" ? "ON_HOLD" : "LISTENING");
        } else if (data.type === "state") {
          if (data.state && !isAiSpeakingRef.current && !isPlayingQueueRef.current && !isOnHoldRef.current && !currentAudioRef.current) {
            setVoiceState(data.state === "SPEAKING" ? "AI_SPEAKING" : data.state);
            if (data.state === "LISTENING" && isRecordingRef.current) {
              resumeRecognitionSafely();
            }
          }
        } else if (data.type === "telemetry") {
          setCallData(prev => ({ ...prev, telemetry: data.data }));
        } else if (data.type === "error") {
          console.error("AI Error:", data.message);
          setVoiceState("ERROR");
        }
      };

      ws.onclose = () => {
        if (isSubscribed) {
          setStatus("Disconnected");
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
      };
    };

    connectWebSocket();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = sttLang;

      recognition.onstart = () => {
        isRecognitionActiveRef.current = true;
        setMicError(null);
        if (!isAiSpeakingRef.current && !isOnHoldRef.current && voiceStateRef.current !== "AI_SPEAKING" && !currentAudioRef.current) {
          setVoiceState("LISTENING");
        }
      };

      recognition.onresult = (event) => {
        const timeSinceAiEnded = Date.now() - lastAiSpeechEndedTimeRef.current;
        if (isOnHoldRef.current || isAiSpeakingRef.current || isPlayingQueueRef.current || currentAudioRef.current || voiceStateRef.current === "AI_SPEAKING") {
          console.warn("[ECHO GUARD DISCARDED] Ignored speech captured while AI was speaking or on hold.");
          return;
        }
        if (timeSinceAiEnded < 450) {
          console.warn(`[ECHO GUARD DISCARDED] Ignored acoustic reverberation (${timeSinceAiEnded}ms < 450ms).`);
          return;
        }

        const results = event.results;
        const lastResult = results[results.length - 1];
        if (!lastResult || !lastResult[0]) return;

        const transcript = lastResult[0].transcript ? lastResult[0].transcript.trim() : "";
        const confidence = (typeof lastResult[0].confidence === "number") ? lastResult[0].confidence : 1.0;

        // Turn-level debounce for identical speech captured in rapid succession (<1500ms)
        const normTranscript = transcript.toLowerCase().trim();
        const now = Date.now();
        if (normTranscript && normTranscript === lastSentTranscriptRef.current && (now - lastSentTimeRef.current) < 1500) {
          console.warn("[FRONTEND DEBOUNCE] Dropped duplicate speech recognition result (<1500ms):", transcript);
          return;
        }

        if (transcript && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          lastSentTranscriptRef.current = normTranscript;
          lastSentTimeRef.current = now;
          const utteranceId = `utt_${now}_${Math.random().toString(36).substring(2, 8)}`;
          setVoiceState("PROCESSING");
          isStreamingActiveRef.current = false;
          currentMessageIdRef.current = null;
          setCallData(prev => ({ ...prev, ai_response: "", caller_said: transcript }));
          wsRef.current.send(JSON.stringify({ text: transcript, utterance_id: utteranceId, confidence }));
        }
      };

      recognition.onerror = (event) => {
        console.warn("[SPEECH RECOGNITION ERROR]", event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicError("Microphone permission denied. Please allow microphone access in your browser settings.");
          setIsRecording(false);
          isRecordingRef.current = false;
          setVoiceState("IDLE");
        } else if (event.error === 'no-speech' || event.error === 'network' || event.error === 'aborted') {
          if (isRecordingRef.current && !isOnHoldRef.current && !isAiSpeakingRef.current && !isPlayingQueueRef.current) {
            safeStartRecognition();
          }
        }
      };

      recognition.onend = () => {
        isRecognitionActiveRef.current = false;
        if (isRecordingRef.current && !isOnHoldRef.current && !isAiSpeakingRef.current && !isPlayingQueueRef.current) {
          safeStartRecognition();
        }
      };

      recognitionRef.current = recognition;
    } else {
      setMicError("Speech Recognition API is not supported in this browser. Please use Chrome, Edge, or Safari.");
    }

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (acousticGuardTimeoutRef.current) clearTimeout(acousticGuardTimeoutRef.current);
      stopAudioPlayback();
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        try { wsRef.current.close(); } catch (e) {}
        wsRef.current = null;
      }
      if (recognitionRef.current) {
        isRecordingRef.current = false;
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // Update recognition language dynamically
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSttLang(newLang);
    if (recognitionRef.current) {
      recognitionRef.current.lang = newLang;
      if (isRecordingRef.current && isRecognitionActiveRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "set_language", language: newLang }));
    }
  };

  const toggleConversation = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isAiSpeaking || isPlayingQueueRef.current) {
      handleBargeIn();
      return;
    }

    if (isRecording) {
      // Stopping active call
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsOnHold(false);
      isOnHoldRef.current = false;
      setVoiceState("IDLE");
      stopAudioPlayback();
      try { recognitionRef.current.stop(); } catch (e) {}
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "stop_call" }));
      }
    } else {
      // Starting new call
      setMicError(null);

      // Validate active RAG document before initiating
      if (activeDocInfo.has_active === false || callData.rag_source === "No Active Document") {
        setMicError("Cannot start call: No active RAG document found for your organization. Please upload and activate a document in Knowledge Base first.");
        return;
      }

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setMicError("Voice server is not connected yet. Please check your connection and try again.");
        return;
      }

      setIsRecording(true);
      isRecordingRef.current = true;
      setIsOnHold(false);
      isOnHoldRef.current = false;
      setVoiceState("PROCESSING");
      setCallData(prev => ({
        ...prev,
        caller_said: "",
        ai_response: "",
        intent: "Starting call...",
        emotion: "Neutral"
      }));

      let rawToken = localStorage.getItem("token") || "";
      let token = rawToken.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").replace(/^Bearer\s+/i, "").trim();
      wsRef.current.send(JSON.stringify({
        type: "start_call",
        token: token,
        language: sttLang
      }));
    }
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (!textInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const userMsg = textInput.trim();
    const utteranceId = `txt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    if (isAiSpeaking || isPlayingQueueRef.current) {
      stopAudioPlayback();
    }
    if (!isRecordingRef.current) {
      setIsRecording(true);
      isRecordingRef.current = true;
    }
    setVoiceState("PROCESSING");
    isStreamingActiveRef.current = false;
    currentMessageIdRef.current = null;
    setCallData(prev => ({ ...prev, ai_response: "", caller_said: userMsg }));
    wsRef.current.send(JSON.stringify({ text: userMsg, utterance_id: utteranceId }));
    setTextInput("");
  };

  const telemetry = callData.telemetry;
  const totalMs = telemetry?.total_latency_ms;
  const latencyBadgeColor = !totalMs ? "blue" : (totalMs < 1200 ? "green" : (totalMs < 2200 ? "blue" : "yellow"));

  const getStateBadge = () => {
    switch (voiceState) {
      case "AI_SPEAKING":
      case "SPEAKING":
        return <Badge color="red">🔊 AI SPEAKING</Badge>;
      case "PROCESSING":
        return <Badge color="yellow">⏳ PROCESSING</Badge>;
      case "USER_SPEAKING":
        return <Badge color="purple">🗣️ USER SPEAKING</Badge>;
      case "LISTENING":
        return <Badge color="green">🎙 LISTENING</Badge>;
      case "ON_HOLD":
        return <Badge color="yellow">⏸️ ON HOLD</Badge>;
      case "INTERRUPTED":
        return <Badge color="orange">✋ INTERRUPTED</Badge>;
      case "ERROR":
        return <Badge color="red">⚠️ ERROR</Badge>;
      default:
        return <Badge color="gray">IDLE</Badge>;
    }
  };

  return (
    <section id="voice" className="page active">
      <div className="header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h1 className="title" style={{ margin: 0 }}>Voice Assistant</h1>
            <Badge color={status === "Connected" ? "green" : "red"}>
              ● {status.toUpperCase()}
            </Badge>
            {getStateBadge()}
            {callData.rag_source && callData.rag_source !== "No Active Document" && (
              <Badge color="purple">
                📄 {callData.rag_source}
              </Badge>
            )}
            {totalMs && (
              <Badge color={latencyBadgeColor}>
                {totalMs < 1200 ? `⚡ ${totalMs} ms (Fast Path)` : `⏱️ ${totalMs} ms`}
              </Badge>
            )}
          </div>
          <p className="subtitle">Real-time voice receptionist with single AgentEngine intelligence</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)" }}>STT Language:</label>
          <select
            value={sttLang}
            onChange={handleLanguageChange}
            style={{
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--line)",
              background: "var(--card-bg)",
              color: "var(--heading)",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            <option value="en-IN">English (India) - en-IN</option>
            <option value="ta-IN">Tamil (India) - ta-IN</option>
            <option value="hi-IN">Hindi (India) - hi-IN</option>
            <option value="te-IN">Telugu (India) - te-IN</option>
            <option value="kn-IN">Kannada (India) - kn-IN</option>
            <option value="en-US">English (US) - en-US</option>
          </select>
        </div>
      </div>

      {!activeDocInfo.has_active && !isRecording && (
        <div style={{
          margin: "0 0 16px 0",
          padding: "12px 16px",
          borderRadius: "var(--radius-md)",
          background: "rgba(234, 179, 8, 0.1)",
          border: "1px solid rgba(234, 179, 8, 0.3)",
          color: "#ca8a04",
          fontSize: "13.5px",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          ⚠️ No active RAG document found for this organization. Please activate a document in Knowledge Base to start receptionist calls.
        </div>
      )}

      {micError && (
        <div style={{
          margin: "0 0 16px 0",
          padding: "12px 16px",
          borderRadius: "var(--radius-md)",
          background: "rgba(220, 38, 38, 0.1)",
          border: "1px solid rgba(220, 38, 38, 0.3)",
          color: "#dc2626",
          fontSize: "14px",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          ⚠️ {micError}
        </div>
      )}

      <div className="call-layout">
        <div className="call-panel">
          <div className="call-status">REAL-TIME VOICE PIPELINE</div>

          <div
            className={`call-circle ${isRecording ? (isOnHold ? 'on-hold' : 'recording') : ''}`}
            onClick={isAiSpeaking ? handleBargeIn : toggleConversation}
            style={{ cursor: "pointer", opacity: isOnHold ? 0.6 : 1 }}
            title={isAiSpeaking ? "Click to interrupt AI" : (isRecording ? "Click to stop" : "Click to speak")}
          >
            {isOnHold ? '⏸️' : (voiceState === 'AI_SPEAKING' || isAiSpeaking ? '🔊' : (voiceState === 'USER_SPEAKING' ? '🗣️' : '🎙'))}
          </div>

          <div className="call-box caller">
            <strong>Caller Said</strong>
            <p>"{callData.caller_said || "..."}"</p>
          </div>

          <div className="call-box ai">
            <strong>AI Receptionist</strong>
            <p>"{callData.ai_response || "..."}"</p>
          </div>

              {/* Fallback Manual Text Input */}
              <form onSubmit={handleSendText} style={{ marginTop: "16px", display: "flex", gap: "8px", width: "100%" }}>
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Or type a question manually..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: "20px",
                    border: "1px solid var(--line)",
                    background: "var(--line-light)",
                    color: "var(--heading)",
                    fontSize: "14px"
                  }}
                />
                <button
                  type="submit"
                  className="btn primary"
                  style={{
                    padding: "10px 18px",
                    borderRadius: "20px",
                    fontWeight: "700",
                    fontSize: "13px"
                  }}
                >
                  Send
                </button>
              </form>

              <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={toggleConversation}
                  className={`btn ${isRecording ? "danger" : "primary"}`}
                  style={{
                    fontWeight: "700",
                    padding: "10px 20px",
                    borderRadius: "30px",
                    fontSize: "13px"
                  }}
                >
                  {isAiSpeaking ? "Interrupt & Speak" : (isRecording ? "Stop Call" : "Start Call")}
                </button>

                {isRecording && (
                  <button
                    onClick={toggleHold}
                    className="btn secondary"
                    style={{
                      fontWeight: "600",
                      padding: "10px 18px",
                      borderRadius: "30px",
                      fontSize: "13px"
                    }}
                  >
                    {isOnHold ? "▶️ Resume Call" : "⏸️ Hold Call"}
                  </button>
                )}

                {isAiSpeaking && (
                  <button
                    onClick={handleBargeIn}
                    className="btn danger"
                    style={{
                      padding: "10px 18px",
                      borderRadius: "30px",
                      fontSize: "13px"
                    }}
                  >
                    Interrupt AI
                  </button>
                )}

                <button
                  onClick={triggerHumanHandoff}
                  className="btn outline"
                  disabled={status !== "Connected"}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "30px",
                    fontSize: "13px",
                    fontWeight: "600"
                  }}
                >
                  👤 Request Human Handoff
                </button>
              </div>
        </div>

        <div className="card">
          <div className="card-title">Live AI Telemetry & Active RAG</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
            <div style={{ background: "var(--line-light)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" }}>Intent</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading)" }}>{callData.intent}</span>
            </div>
            <div style={{ background: "var(--line-light)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" }}>Emotion</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--heading)" }}>{callData.emotion}</span>
            </div>
            <div style={{ background: "var(--line-light)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" }}>Active RAG Document</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>{callData.rag_source}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
