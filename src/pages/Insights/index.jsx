import { useState, useEffect } from "react";
import api from "../../services/api.js";
import dashboardService from "../../services/dashboard.service.js";
import { Mic, MessageSquare, CheckCircle, Headphones, Sparkles, TrendingUp } from "lucide-react";

export default function Insights() {
  const [overview, setOverview] = useState(null);
  const [intents, setIntents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ovRes, intRes] = await Promise.allSettled([
          api.get("/analytics/overview?days=30"),
          api.get("/analytics/intents?days=30&limit=6")
        ]);

        if (ovRes.status === "fulfilled" && ovRes.value.data) {
          setOverview(ovRes.value.data);
        } else {
          // Fallback to legacy dashboard service
          const legacy = await dashboardService.getInsights();
          setOverview({
            total_sessions: 0,
            voice_sessions: 0,
            chat_sessions: 0,
            sentiment_distribution: legacy.emotions || { Positive: 0, Neutral: 0, Negative: 0 },
            conversion_rate_pct: 0,
            appointments_booked: 0,
            handoffs_requested: 0,
            callbacks_requested: 0
          });
        }

        if (intRes.status === "fulfilled" && Array.isArray(intRes.value.data)) {
          setIntents(intRes.value.data);
        }
      } catch (err) {
        console.error("Failed to load insights:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pos = overview?.sentiment_distribution?.Positive || 0;
  const neu = overview?.sentiment_distribution?.Neutral || 0;
  const neg = overview?.sentiment_distribution?.Negative || 0;
  const totalSent = Math.max(1, pos + neu + neg);

  const posPct = Math.round((pos / totalSent) * 100);
  const neuPct = Math.round((neu / totalSent) * 100);
  const negPct = Math.round((neg / totalSent) * 100);

  return (
    <section id="insights" className="page active">
      <div className="header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={24} style={{ color: "#b7ff5c" }} />
            Omnichannel AI Insights
          </h1>
          <p className="subtitle">
            Customer behavior, multi-channel sentiment, intent frequency, and business automation metrics
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(244, 245, 243, 0.5)" }}>
          Loading insights...
        </div>
      ) : (
        <div className="grid3" style={{ gap: "20px" }}>
          {/* Card 1: Channel Breakdown */}
          <div className="card">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={18} style={{ color: "#b7ff5c" }} />
              Channel Activity
            </div>

            <div className="setting">
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Mic size={14} style={{ color: "#f97316" }} /> Voice Sessions
              </span>
              <strong style={{ color: "#f97316" }}>{overview?.voice_sessions || 0}</strong>
            </div>
            <div className="setting">
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <MessageSquare size={14} style={{ color: "#a855f7" }} /> Chat Sessions
              </span>
              <strong style={{ color: "#a855f7" }}>{overview?.chat_sessions || 0}</strong>
            </div>
            <div className="setting">
              <span>Total Conversations</span>
              <strong style={{ color: "#5ce1ff" }}>{overview?.total_sessions || 0}</strong>
            </div>
            <div className="setting">
              <span>Conversion Rate</span>
              <strong style={{ color: "#b7ff5c" }}>{overview?.conversion_rate_pct || 0}%</strong>
            </div>
          </div>

          {/* Card 2: Business Outcomes */}
          <div className="card">
            <div className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle size={18} style={{ color: "#5ce1ff" }} />
              Key Outcomes
            </div>

            <div className="setting">
              <span>Appointments Booked</span>
              <strong style={{ color: "#b7ff5c" }}>{overview?.appointments_booked || 0}</strong>
            </div>
            <div className="setting">
              <span>Human Handoffs</span>
              <strong style={{ color: "#fbbf24" }}>{overview?.handoffs_requested || 0}</strong>
            </div>
            <div className="setting">
              <span>Callbacks Registered</span>
              <strong style={{ color: "#5ce1ff" }}>{overview?.callbacks_requested || 0}</strong>
            </div>
            <div className="setting">
              <span>Total Messages Processed</span>
              <strong style={{ color: "rgba(244, 245, 243, 0.8)" }}>{overview?.total_messages || 0}</strong>
            </div>
          </div>

          {/* Card 3: Sentiment Distribution */}
          <div className="card">
            <div className="card-title">Sentiment Distribution</div>

            <div className="setting">
              <span>😊 Positive</span>
              <strong style={{ color: "#b7ff5c" }}>{posPct}% ({pos})</strong>
            </div>
            <div className="setting">
              <span>😐 Neutral</span>
              <strong style={{ color: "#5ce1ff" }}>{neuPct}% ({neu})</strong>
            </div>
            <div className="setting">
              <span>😡 Urgent / Frustrated</span>
              <strong style={{ color: "#f87171" }}>{negPct}% ({neg})</strong>
            </div>
          </div>

          {/* Card 4: Top Intents */}
          <div className="card">
            <div className="card-title">Top Customer Intents</div>

            {intents.length > 0 ? (
              intents.map((item, idx) => (
                <div key={idx} className="setting">
                  <span>{item.intent}</span>
                  <strong style={{ color: "#5ce1ff" }}>{item.count}</strong>
                </div>
              ))
            ) : (
              <p style={{ color: "rgba(244, 245, 243, 0.4)", padding: "20px 0", textAlign: "center" }}>
                No intent metrics recorded yet
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

