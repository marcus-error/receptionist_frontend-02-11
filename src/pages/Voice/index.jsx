import { useEffect, useState, useRef } from "react";
import Badge from "../../components/ui/Badge.jsx";
import API_BASE_URL from "../../config/api.js";

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
    setCallData(prev => ({ ...prev, ai_response: "", caller_said: handoffMsg }));
    wsRef.current.send(JSON.stringify({ text: handoffMsg, utterance_id: utteranceId }));
  };

  const resumeRecognitionSafely = () => {
    if (acousticGuardTimeoutRef.current) {
      clearTimeout(acousticGuardTimeoutRef.current);
    }

    acousticGuardTimeoutRef.current = setTimeout(() => {
      if (isRecordingRef.current && !isOnHoldRef.current && !isAiSpeakingRef.current && !isPlayingQueueRef.current) {
        setVoiceState("LISTENING");
        safeStartRecognition();
      }
    }, 150);
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
    let isSubscribed = true;

    const connectWebSocket = () => {
      if (!isSubscribed) return;

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

        if (data.type === "rag_bound") {
          setCallData(prev => ({
            ...prev,
            active_rag_title: data.title || "Active Knowledge Base",
            rag_source: (data.document_id && data.title && data.title !== "None")
              ? `${data.title} (ID: ${data.document_id})`
              : (data.title && data.title !== "None" ? data.title : "No Active Document")
          }));
        } else if (data.type === "transcription") {
          setCallData(prev => ({ ...prev, caller_said: data.text }));
        } else if (data.type === "analysis") {
          setCallData(prev => ({ ...prev, intent: data.intent, emotion: data.emotion }));
        } else if (data.type === "rag") {
          setCallData(prev => ({
            ...prev,
            rag_source: (data.source && !data.source.startsWith("None")) ? data.source : prev.rag_source
          }));
        } else if (data.type === "text_chunk") {
          if (data.text) {
            setCallData(prev => ({
              ...prev,
              ai_response: (prev.ai_response || "") + data.text
            }));
          }
        } else if (data.type === "response") {
          setCallData(prev => ({ ...prev, ai_response: data.text }));
        } else if (data.type === "audio_chunk") {
          if (data.audio) {
            enqueueAudio(data.audio);
          }
          if (data.text) {
            setCallData(prev => ({
              ...prev,
              ai_response: prev.ai_response ? `${prev.ai_response} ${data.text}` : data.text
            }));
          }
        } else if (data.type === "audio") {
          if (data.audio) {
            playContinuousAudio(data.audio);
          }
          if (data.text) {
            setCallData(prev => ({
              ...prev,
              ai_response: data.text
            }));
          }
        } else if (data.type === "hold_ack") {
          setIsOnHold(data.status === "on_hold");
          setVoiceState(data.status === "on_hold" ? "ON_HOLD" : "LISTENING");
        } else if (data.type === "state") {
          if (data.state && !isAiSpeakingRef.current && !isPlayingQueueRef.current && !isOnHoldRef.current) {
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
        if (!isAiSpeakingRef.current && !isOnHoldRef.current && voiceStateRef.current !== "AI_SPEAKING") {
          setVoiceState("LISTENING");
        }
      };

      recognition.onresult = (event) => {
        const timeSinceAiEnded = Date.now() - lastAiSpeechEndedTimeRef.current;
        if (isOnHoldRef.current || isAiSpeakingRef.current || isPlayingQueueRef.current || voiceStateRef.current === "AI_SPEAKING") {
          console.warn("[ECHO GUARD DISCARDED] Ignored speech captured while AI was speaking or on hold.");
          return;
        }
        if (timeSinceAiEnded < 150) {
          console.warn(`[ECHO GUARD DISCARDED] Ignored acoustic reverberation (${timeSinceAiEnded}ms < 150ms).`);
          return;
        }

        const results = event.results;
        const lastResult = results[results.length - 1];
        if (!lastResult || !lastResult[0]) return;

        const transcript = lastResult[0].transcript ? lastResult[0].transcript.trim() : "";
        if (transcript && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const utteranceId = `utt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          setVoiceState("PROCESSING");
          setCallData(prev => ({ ...prev, ai_response: "", caller_said: transcript }));
          wsRef.current.send(JSON.stringify({ text: transcript, utterance_id: utteranceId }));
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
      if (wsRef.current) wsRef.current.close();
      if (recognitionRef.current) {
        isRecordingRef.current = false;
        try { recognitionRef.current.stop(); } catch (e) {}
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
      setIsRecording(false);
      isRecordingRef.current = false;
      setIsOnHold(false);
      isOnHoldRef.current = false;
      setVoiceState("IDLE");
      stopAudioPlayback();
      try { recognitionRef.current.stop(); } catch (e) {}
    } else {
      setMicError(null);
      setIsRecording(true);
      isRecordingRef.current = true;
      setIsOnHold(false);
      isOnHoldRef.current = false;
      setVoiceState("LISTENING");
      safeStartRecognition();
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
    setVoiceState("PROCESSING");
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
            <option value="en-US">English (US) - en-US</option>
            <option value="ta-IN">Tamil - ta-IN</option>
            <option value="hi-IN">Hindi - hi-IN</option>
          </select>
        </div>
      </div>

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
