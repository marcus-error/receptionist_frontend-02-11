import React, { useState, useEffect } from "react";
import Badge from "../../components/ui/Badge.jsx";
import api from "../../services/api.js";
import { MessageSquare, Mic, Phone, RefreshCw, Filter, Sparkles } from "lucide-react";

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [channelFilter, setChannelFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchConversations = async (channel = channelFilter) => {
    try {
      setLoading(true);
      const url = channel === "all"
        ? "/analytics/conversations?limit=50"
        : `/analytics/conversations?limit=50&channel=${channel}`;
      const res = await api.get(url);
      if (res.data && Array.isArray(res.data.conversations)) {
        setConversations(res.data.conversations);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.warn("Could not fetch analytics conversations, fallback to call logs:", err);
      try {
        const fallbackRes = await api.get("/calls");
        setConversations(fallbackRes.data || []);
      } catch (e) {
        setConversations([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(channelFilter);
  }, [channelFilter]);

  const getSentimentBadge = (sentiment) => {
    const s = (sentiment || "neutral").toLowerCase();
    if (s.includes("positive") || s.includes("happy")) return <Badge color="green">Positive</Badge>;
    if (s.includes("negative") || s.includes("frustrated")) return <Badge color="red">Negative</Badge>;
    return <Badge color="blue">Neutral</Badge>;
  };

  return (
    <section id="conversations" className="page active">
      <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 className="title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={24} style={{ color: "#b7ff5c" }} />
            Conversation Intelligence
          </h1>
          <p className="subtitle">Real-time omnichannel logs across Voice Assistant & Chatbot</p>
        </div>

        {/* Channel Filter Pills */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className={`btn-filter ${channelFilter === "all" ? "active" : ""}`}
            onClick={() => setChannelFilter("all")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: channelFilter === "all" ? "rgba(183, 255, 92, 0.2)" : "rgba(255,255,255,0.05)",
              color: channelFilter === "all" ? "#b7ff5c" : "#fff",
              cursor: "pointer",
              fontSize: "13px"
            }}
          >
            All Channels
          </button>
          <button
            className={`btn-filter ${channelFilter === "voice" ? "active" : ""}`}
            onClick={() => setChannelFilter("voice")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: channelFilter === "voice" ? "rgba(249, 115, 22, 0.2)" : "rgba(255,255,255,0.05)",
              color: channelFilter === "voice" ? "#f97316" : "#fff",
              cursor: "pointer",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <Mic size={14} /> Voice
          </button>
          <button
            className={`btn-filter ${channelFilter === "chat" ? "active" : ""}`}
            onClick={() => setChannelFilter("chat")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: channelFilter === "chat" ? "rgba(168, 85, 247, 0.2)" : "rgba(255,255,255,0.05)",
              color: channelFilter === "chat" ? "#a855f7" : "#fff",
              cursor: "pointer",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <MessageSquare size={14} /> Chat
          </button>
          <button
            onClick={() => fetchConversations(channelFilter)}
            style={{
              padding: "6px 10px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer"
            }}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="table">
        <table>
          <thead>
            <tr>
              <th>Channel</th>
              <th>Session ID</th>
              <th>Primary Intent</th>
              <th>Sentiment</th>
              <th>Turns</th>
              <th>Latest Message Preview</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((c, i) => (
              <tr key={c.session_id || i}>
                <td>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      background: (c.channel || "").toLowerCase().includes("voice")
                        ? "rgba(249, 115, 22, 0.15)"
                        : "rgba(168, 85, 247, 0.15)",
                      color: (c.channel || "").toLowerCase().includes("voice")
                        ? "#f97316"
                        : "#a855f7"
                    }}
                  >
                    {(c.channel || "").toLowerCase().includes("voice") ? <Mic size={12} /> : <MessageSquare size={12} />}
                    {(c.channel || "chat").toUpperCase()}
                  </span>
                </td>
                <td style={{ fontFamily: "monospace", fontSize: "12px", color: "rgba(244, 245, 243, 0.8)" }}>
                  {c.session_id ? c.session_id.substring(0, 16) + "..." : "N/A"}
                </td>
                <td>
                  <Badge color="blue">{c.primary_intent || c.intent || "General"}</Badge>
                </td>
                <td>
                  {getSentimentBadge(c.sentiment || c.emotion)}
                </td>
                <td>
                  <span className="badge blue">{c.message_count || 1} turns</span>
                </td>
                <td style={{ maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "rgba(244, 245, 243, 0.8)" }}>
                  {c.last_message || c.caller_said || "—"}
                </td>
                <td style={{ color: "rgba(244, 245, 243, 0.6)", fontSize: "12px", whiteSpace: "nowrap" }}>
                  {c.last_activity ? new Date(c.last_activity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (c.call_date || "Recent")}
                </td>
              </tr>
            ))}

            {conversations.length === 0 && !loading && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "40px 20px", color: "rgba(244, 245, 243, 0.4)" }}>
                  No conversation logs recorded for this channel.
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", padding: "40px 20px", color: "rgba(244, 245, 243, 0.4)" }}>
                  Loading conversation intelligence...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

