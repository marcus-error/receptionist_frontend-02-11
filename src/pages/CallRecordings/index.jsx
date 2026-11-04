import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import Badge from "../../components/ui/Badge";

export default function CallRecordings() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("monthly");
  const [callTypeFilter, setCallTypeFilter] = useState("all"); // "all" | "inbound" | "outbound"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Real Audio player states
  const [activeRecording, setActiveRecording] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef(null);

  // Modal detail view state
  const [viewDetailModal, setViewDetailModal] = useState(null);

  useEffect(() => {
    fetchRecordings();
  }, [period, callTypeFilter]);

  // Auto refresh interval (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRecordings(true); // silent fetch
    }, 30000);
    return () => clearInterval(interval);
  }, [period, callTypeFilter, search, startDate, endDate]);

  const fetchRecordings = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      let url = `/recordings?period=${period}`;
      if (callTypeFilter && callTypeFilter !== "all") {
        url += `&call_type=${callTypeFilter}`;
      }
      if (period === "custom" && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      if (search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      const res = await api.get(url);
      setRecordings(res.data || []);
    } catch (err) {
      console.error("Failed to fetch call recordings", err);
      setError(err.response?.data?.detail || err.message || "Failed to load call recordings from server.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRecordings();
  };

  const handleBulkDownload = async () => {
    setDownloadingZip(true);
    try {
      const response = await api.post(
        "/recordings/download-bulk",
        {
          period,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `call_recordings_${period}_${new Date().toISOString().slice(0, 10)}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download recordings ZIP: " + (err.message || "Unknown error"));
    } finally {
      setDownloadingZip(false);
    }
  };

  // Helper to build proper audio URL
  const getFullAudioUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const baseUrl = api.defaults.baseURL || "http://127.0.0.1:8000/api/v1";
    const origin = baseUrl.replace(/\/api\/v1\/?$/, "").replace(/\/api\/?$/, "");
    return url.startsWith("/") ? `${origin}${url}` : `${origin}/${url}`;
  };

  const handleDownloadIndividualRecording = (rec) => {
    if (!rec) return;
    if (rec.recording_status !== "Available") {
      alert(`Recording is not available for this call (Status: ${rec.recording_status || "Not Recorded"}).`);
      return;
    }
    const rawUrl = rec.download_url || rec.recording_url;
    const audioUrl = getFullAudioUrl(rawUrl);
    if (!audioUrl) {
      alert("Recording audio file URL not found.");
      return;
    }
    const a = document.createElement("a");
    a.href = audioUrl;
    const direction = (rec.call_type || "call").toLowerCase();
    a.download = `recording_${direction}_${rec.id}_${rec.call_sid || "audio"}.wav`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Playback control
  const handlePlayRecording = (rec) => {
    if (!rec || rec.recording_status !== "Available" || !rec.recording_url) {
      alert(`Recording is not available for this call (Status: ${rec?.recording_status || "Not Recorded"}).`);
      return;
    }

    if (activeRecording?.id === rec.id) {
      togglePlayPause();
      return;
    }

    setActiveRecording(rec);
    setAudioProgress(0);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    if (!activeRecording) return;
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error("Playback error", err);
            setIsPlaying(false);
            alert("Unable to play audio: " + (err.message || "playback failed"));
          });
      }
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    setAudioProgress(seekTime);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs <= 0) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const inboundCount = recordings.filter((rec) => {
    const typeStr = (rec.call_type || "").toLowerCase();
    return typeStr.includes("inbound") || (!typeStr.includes("outbound") && !typeStr.includes("test"));
  }).length;

  const outboundCount = recordings.filter((rec) => {
    const typeStr = (rec.call_type || "").toLowerCase();
    return typeStr.includes("outbound");
  }).length;

  return (
    <section id="call-recordings" className="page active">
      {/* Header Section */}
      <div className="header">
        <div>
          <h1 className="title">Call Recordings</h1>
          <p className="subtitle">
            Listen, view transcripts, and bulk download synchronized two-way AI Receptionist call recordings.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={() => fetchRecordings()} title="Refresh list" className="btn">
            🔄 Refresh
          </button>

          <button
            onClick={handleBulkDownload}
            disabled={downloadingZip || recordings.length === 0}
            className="btn primary"
            style={{
              opacity: downloadingZip || recordings.length === 0 ? 0.6 : 1,
            }}
          >
            {downloadingZip ? "⏳ Generating ZIP..." : "⬇ Bulk Download ZIP"}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar Card */}
      <div className="card" style={{ marginBottom: "24px" }}>
        {/* Call Direction Filter Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "14px" }}>
          <button
            type="button"
            onClick={() => setCallTypeFilter("all")}
            style={{
              padding: "8px 18px",
              borderRadius: "20px",
              border: callTypeFilter === "all" ? "1px solid var(--accent)" : "1px solid var(--line)",
              background: callTypeFilter === "all" ? "var(--accent)" : "var(--line-light)",
              color: callTypeFilter === "all" ? "#ffffff" : "var(--fg)",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            📞 All Calls ({recordings.length})
          </button>

          <button
            type="button"
            onClick={() => setCallTypeFilter("inbound")}
            style={{
              padding: "8px 18px",
              borderRadius: "20px",
              border: callTypeFilter === "inbound" ? "1px solid #10b981" : "1px solid var(--line)",
              background: callTypeFilter === "inbound" ? "#10b981" : "var(--line-light)",
              color: callTypeFilter === "inbound" ? "#ffffff" : "var(--fg)",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            📥 Inbound Calls ({inboundCount})
          </button>

          <button
            type="button"
            onClick={() => setCallTypeFilter("outbound")}
            style={{
              padding: "8px 18px",
              borderRadius: "20px",
              border: callTypeFilter === "outbound" ? "1px solid #0284c7" : "1px solid var(--line)",
              background: callTypeFilter === "outbound" ? "#0284c7" : "var(--line-light)",
              color: callTypeFilter === "outbound" ? "#ffffff" : "var(--fg)",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            📤 Outbound Calls ({outboundCount})
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontWeight: "600", fontSize: "13.5px", color: "var(--fg)" }}>
              Period Filter:
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{
                padding: "9px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--line-light)",
                border: "1px solid var(--line)",
                color: "var(--fg)",
                fontSize: "13.5px",
                outline: "none",
                minWidth: "200px",
                cursor: "pointer"
              }}
            >
              <option value="monthly">Monthly (This Month)</option>
              <option value="daily">Daily (Today)</option>
              <option value="weekly">Weekly (This Week)</option>
              <option value="quarterly">Quarterly (This Quarter)</option>
              <option value="half_yearly">Half-Yearly (6 Months)</option>
              <option value="annually">Annually (This Year)</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {period === "custom" && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--line-light)",
                    border: "1px solid var(--line)",
                    color: "var(--fg)",
                    fontSize: "13px"
                  }}
                />
                <span style={{ color: "var(--muted)", fontSize: "13px" }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--line-light)",
                    border: "1px solid var(--line)",
                    color: "var(--fg)",
                    fontSize: "13px"
                  }}
                />
                <button onClick={() => fetchRecordings()} className="btn primary btn-sm">
                  Apply
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ position: "relative", width: "280px" }}>
              <input
                type="text"
                placeholder="Search by caller, phone, intent..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: "9px 36px 9px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--line-light)",
                  border: "1px solid var(--line)",
                  color: "var(--fg)",
                  fontSize: "13.5px",
                  outline: "none",
                  width: "100%"
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    fetchRecordings();
                  }}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Active Audio Player Sticky Bar */}
      {activeRecording && (
        <div
          style={{
            background: "var(--panel)",
            border: "2px solid var(--accent)",
            boxShadow: "0 8px 24px rgba(2, 132, 199, 0.15)",
            borderRadius: "var(--radius-lg)",
            padding: "16px 24px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: "240px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "rgba(2, 132, 199, 0.12)",
                border: "1px solid rgba(2, 132, 199, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                fontSize: "18px"
              }}
            >
              🎙
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--heading)" }}>
                Playing: <span style={{ color: "var(--accent)" }}>{activeRecording.caller_name}</span> ({activeRecording.caller_phone})
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                {activeRecording.call_date} {activeRecording.start_time} • Duration: {activeRecording.duration || "00:00"} • Direction: {activeRecording.call_type}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, justifyContent: "flex-end" }}>
            {activeRecording.recording_url && (
              <audio
                ref={audioRef}
                src={getFullAudioUrl(activeRecording.recording_url)}
                onTimeUpdate={() => setAudioProgress(audioRef.current?.currentTime || 0)}
                onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration || 0)}
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                  console.error("Audio playback error", e);
                  setIsPlaying(false);
                  alert("Failed to stream call recording from server.");
                }}
                autoPlay
              />
            )}

            {/* Audio Scrubber Range Bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", maxWidth: "320px" }}>
              <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--accent)", fontWeight: "600" }}>
                {formatTime(audioProgress)}
              </span>
              <input
                type="range"
                min="0"
                max={audioDuration || 1}
                step="0.1"
                value={audioProgress}
                onChange={handleSeek}
                style={{
                  flex: 1,
                  accentColor: "var(--accent)",
                  cursor: "pointer"
                }}
              />
              <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--muted)", fontWeight: "600" }}>
                {formatTime(audioDuration || 0)}
              </span>
            </div>

            <button
              onClick={togglePlayPause}
              style={{
                padding: "8px 20px",
                backgroundColor: isPlaying ? "#ef4444" : "var(--accent)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--radius-md)",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {isPlaying ? "Pause ❚❚" : "Play ▶"}
            </button>

            <button
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                }
                setActiveRecording(null);
                setIsPlaying(false);
              }}
              style={{
                background: "var(--line-light)",
                border: "1px solid var(--line)",
                color: "var(--muted)",
                borderRadius: "var(--radius-sm)",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          style={{
            background: "var(--danger-bg)",
            border: "1px solid var(--danger-border)",
            color: "var(--danger)",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>⚠️ {error}</div>
          <button onClick={() => fetchRecordings()} className="btn danger btn-sm">
            Retry
          </button>
        </div>
      )}

      {/* Main Recordings Content Table */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "28px", marginBottom: "12px" }}>⏳</div>
          <p style={{ fontSize: "15px", color: "var(--muted)", margin: 0 }}>
            Loading call recordings from server...
          </p>
        </div>
      ) : recordings.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>📁</div>
          <h3 style={{ margin: "0 0 8px 0", color: "var(--heading)", fontSize: "18px" }}>
            No {callTypeFilter !== "all" ? `${callTypeFilter.toUpperCase()} ` : ""}Call Recordings Found
          </h3>
          <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0 }}>
            There are no recorded calls matching the selected filter, period, or search query.
          </p>
        </div>
      ) : (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Caller</th>
                <th>Phone / Recipient</th>
                <th>Direction</th>
                <th>Date & Time</th>
                <th>Duration</th>
                <th>Recording Status</th>
                <th>Intent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((rec) => {
                const isCurrentlyPlaying = activeRecording?.id === rec.id && isPlaying;
                const isOutbound = (rec.call_type || "").toLowerCase().includes("outbound");
                const isAvailable = rec.recording_status === "Available" && Boolean(rec.recording_url);

                return (
                  <tr
                    key={rec.id}
                    style={{
                      backgroundColor: activeRecording?.id === rec.id ? "rgba(2, 132, 199, 0.06)" : "transparent"
                    }}
                  >
                    <td style={{ fontWeight: "700", color: "var(--heading)" }}>
                      {rec.caller_name || "Unknown Caller"}
                    </td>

                    <td style={{ color: "var(--fg)" }}>
                      {rec.caller_phone || "Unknown Phone"}
                    </td>

                    <td>
                      <Badge color={isOutbound ? "blue" : "green"}>
                        {isOutbound ? "📤 OUTBOUND" : "📥 INBOUND"}
                      </Badge>
                    </td>

                    <td style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {rec.call_date} {rec.start_time}
                    </td>

                    <td style={{ fontFamily: "monospace", color: "var(--fg)", fontWeight: "600" }}>
                      {rec.duration || "00:00"}
                    </td>

                    <td>
                      <Badge
                        color={
                          rec.recording_status === "Available"
                            ? "green"
                            : rec.recording_status === "Recording..."
                            ? "yellow"
                            : rec.recording_status === "Failed"
                            ? "red"
                            : "gray"
                        }
                      >
                        {rec.recording_status || "Not Recorded"}
                      </Badge>
                    </td>

                    <td>
                      <Badge color="gray">{rec.intent || "General Query"}</Badge>
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          onClick={() => handlePlayRecording(rec)}
                          disabled={!isAvailable}
                          style={{
                            padding: "6px 14px",
                            background: isCurrentlyPlaying
                              ? "#ef4444"
                              : isAvailable
                              ? "var(--accent)"
                              : "var(--line)",
                            color: isAvailable ? "#ffffff" : "var(--muted)",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            cursor: isAvailable ? "pointer" : "not-allowed",
                            fontSize: "12px",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            opacity: isAvailable ? 1 : 0.5,
                            transition: "all 0.2s ease"
                          }}
                          title={isAvailable ? "Play call recording" : `Recording status: ${rec.recording_status || "Not Recorded"}`}
                        >
                          {isCurrentlyPlaying ? "❚❚ Pause" : "▶ Play"}
                        </button>

                        <button
                          onClick={() => handleDownloadIndividualRecording(rec)}
                          disabled={!isAvailable}
                          style={{
                            padding: "6px 14px",
                            backgroundColor: isAvailable ? "#10b981" : "var(--line)",
                            color: isAvailable ? "#ffffff" : "var(--muted)",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            cursor: isAvailable ? "pointer" : "not-allowed",
                            fontSize: "12px",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            opacity: isAvailable ? 1 : 0.5,
                            transition: "all 0.2s ease"
                          }}
                          title={isAvailable ? "Download call recording WAV" : "Recording not available"}
                        >
                          ⬇ Download
                        </button>

                        <button
                          onClick={() => setViewDetailModal(rec)}
                          className="btn btn-sm"
                        >
                          ≡ Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Call Detail & Transcript Modal */}
      {viewDetailModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              maxWidth: "680px",
              width: "100%",
              borderRadius: "var(--radius-xl)",
              padding: "28px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
              maxHeight: "88vh",
              overflowY: "auto",
              color: "var(--fg)"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--line)"
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "20px", fontWeight: "700", color: "var(--heading)" }}>
                  Call Recording Details
                </h2>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Call ID: #{viewDetailModal.id} {viewDetailModal.call_sid ? `• SID: ${viewDetailModal.call_sid}` : ""} • Direction: {viewDetailModal.call_type}
                </span>
              </div>
              <button
                onClick={() => setViewDetailModal(null)}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                  background: "var(--line-light)",
                  color: "var(--fg)",
                  fontSize: "16px",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ paddingTop: "20px", fontSize: "14px", lineHeight: "1.6" }}>
              {/* Audio Controls inside Modal */}
              <div
                style={{
                  background: "var(--line-light)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  padding: "16px 20px",
                  marginBottom: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <div style={{ fontWeight: "700", color: "var(--heading)", fontSize: "14px" }}>
                    Two-Way Audio Recording
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {viewDetailModal.recording_status === "Available"
                      ? `Synchronized customer + AI audio available (${viewDetailModal.duration || "00:00"})`
                      : `Recording status: ${viewDetailModal.recording_status || "Not Recorded"}`}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    onClick={() => handlePlayRecording(viewDetailModal)}
                    disabled={viewDetailModal.recording_status !== "Available"}
                    style={{
                      padding: "8px 18px",
                      backgroundColor:
                        activeRecording?.id === viewDetailModal.id && isPlaying
                          ? "#ef4444"
                          : viewDetailModal.recording_status === "Available"
                          ? "var(--accent)"
                          : "var(--line)",
                      color: viewDetailModal.recording_status === "Available" ? "#ffffff" : "var(--muted)",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: viewDetailModal.recording_status === "Available" ? "pointer" : "not-allowed",
                      opacity: viewDetailModal.recording_status === "Available" ? 1 : 0.5
                    }}
                  >
                    {activeRecording?.id === viewDetailModal.id && isPlaying ? "Pause ❚❚" : "Play Recording ▶"}
                  </button>

                  <button
                    onClick={() => handleDownloadIndividualRecording(viewDetailModal)}
                    disabled={viewDetailModal.recording_status !== "Available"}
                    style={{
                      padding: "8px 18px",
                      backgroundColor: viewDetailModal.recording_status === "Available" ? "#10b981" : "var(--line)",
                      color: viewDetailModal.recording_status === "Available" ? "#ffffff" : "var(--muted)",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: viewDetailModal.recording_status === "Available" ? "pointer" : "not-allowed",
                      opacity: viewDetailModal.recording_status === "Available" ? 1 : 0.5,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    ⬇ Download WAV
                  </button>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="modal-grid" style={{ gap: "12px", marginBottom: "20px" }}>
                <div style={{ background: "var(--line-light)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>Caller Name</span>
                  <strong style={{ color: "var(--heading)" }}>{viewDetailModal.caller_name}</strong>
                </div>

                <div style={{ background: "var(--line-light)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>Phone / Recipient</span>
                  <strong style={{ color: "var(--heading)" }}>{viewDetailModal.caller_phone}</strong>
                </div>

                <div style={{ background: "var(--line-light)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>Direction & Date</span>
                  <strong style={{ color: "var(--heading)" }}>{viewDetailModal.call_type} • {viewDetailModal.call_date} {viewDetailModal.start_time}</strong>
                </div>

                <div style={{ background: "var(--line-light)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>Call Duration</span>
                  <strong style={{ color: "var(--heading)" }}>{viewDetailModal.duration}</strong>
                </div>

                <div style={{ background: "var(--line-light)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>Detected Intent</span>
                  <span style={{ color: "var(--accent)", fontWeight: "700" }}>{viewDetailModal.intent}</span>
                </div>

                <div style={{ background: "var(--line-light)", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                  <span style={{ fontSize: "12px", color: "var(--muted)", display: "block" }}>Emotion / Sentiment</span>
                  <span style={{ color: "#16a34a", fontWeight: "700" }}>{viewDetailModal.emotion}</span>
                </div>
              </div>

              {viewDetailModal.appointment_created && (
                <div
                  style={{
                    background: "rgba(22, 163, 74, 0.1)",
                    border: "1px solid rgba(22, 163, 74, 0.3)",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "20px",
                    color: "#15803d",
                    fontWeight: "600"
                  }}
                >
                  📅 <strong>Appointment Booked:</strong> {viewDetailModal.appointment_created}
                </div>
              )}

              {/* Speech & Transcript Section */}
              <h4 style={{ margin: "0 0 12px 0", color: "var(--heading)", fontSize: "15px", fontFamily: "var(--font-heading)" }}>
                Call Transcript & Dialogue
              </h4>

              {Array.isArray(viewDetailModal.messages) && viewDetailModal.messages.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                  {viewDetailModal.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "var(--radius-md)",
                        background: msg.role === "user" ? "var(--line-light)" : "rgba(2, 132, 199, 0.08)",
                        border: msg.role === "user" ? "1px solid var(--line)" : "1px solid rgba(2, 132, 199, 0.25)",
                        marginLeft: msg.role === "user" ? "0" : "20px",
                        marginRight: msg.role === "user" ? "20px" : "0"
                      }}
                    >
                      <div
                        style={{
                          fontSize: "11.5px",
                          color: msg.role === "user" ? "var(--muted)" : "var(--accent)",
                          fontWeight: "700",
                          marginBottom: "4px",
                          textTransform: "uppercase"
                        }}
                      >
                        {msg.role === "user" ? "👤 Caller" : "🤖 AI Receptionist"}
                      </div>
                      <div style={{ color: "var(--fg)", fontSize: "13.5px", lineHeight: "1.5" }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ background: "var(--line-light)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }}>
                    <div style={{ fontSize: "11.5px", color: "var(--muted)", fontWeight: "700", marginBottom: "4px", textTransform: "uppercase" }}>
                      👤 Caller Speech
                    </div>
                    <div style={{ color: "var(--fg)" }}>
                      {viewDetailModal.caller_said || "(No caller utterance logged)"}
                    </div>
                  </div>

                  <div style={{ background: "rgba(2, 132, 199, 0.08)", padding: "14px", borderRadius: "var(--radius-md)", border: "1px solid rgba(2, 132, 199, 0.25)" }}>
                    <div style={{ fontSize: "11.5px", color: "var(--accent)", fontWeight: "700", marginBottom: "4px", textTransform: "uppercase" }}>
                      🤖 AI Receptionist Response
                    </div>
                    <div style={{ color: "var(--fg)" }}>
                      {viewDetailModal.ai_response || "(No AI response logged)"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid var(--line)"
              }}
            >
              <button onClick={() => setViewDetailModal(null)} className="btn">
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
