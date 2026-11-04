import { useState, useEffect } from "react";
import Badge from "../../components/ui/Badge.jsx";
import api from "../../services/api.js";

const SUBSCRIPTION_PLANS = [
  { id: "starter", name: "Starter", monthly_fee: 99, max_minutes: 500, max_agents: 1 },
  { id: "pro", name: "Professional", monthly_fee: 299, max_minutes: 2000, max_agents: 3 },
  { id: "enterprise", name: "Enterprise", monthly_fee: 999, max_minutes: 10000, max_agents: 10 }
];

export default function Subscriptions() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/organizations");
      // Mocking subscription data for each org
      const mapped = (res.data || []).map((org, index) => {
        const plan = SUBSCRIPTION_PLANS[index % SUBSCRIPTION_PLANS.length];
        return {
          ...org,
          plan: org.plan || plan.name,
          plan_id: org.plan_id || plan.id,
          status: org.status === "active" ? "Active" : (org.status || "Inactive"),
          minutes_used: org.minutes_used || 0,
          max_minutes: org.max_minutes || plan.max_minutes
        };
      });
      setOrganizations(mapped);
    } catch (err) {
      console.error("Failed to load organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateUsagePercent = (used, max) => {
    return Math.min(100, Math.round((used / max) * 100));
  };

  return (
    <section id="super-admin-subscriptions" className="page active">
      <div className="header">
        <div>
          <h1 className="title">💳 Subscription Management</h1>
          <p className="subtitle">Manage SaaS tiers, billing status, and platform usage limits.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <button
          onClick={() => setActiveTab("overview")}
          className={`btn ${activeTab === "overview" ? "primary" : ""}`}
          style={{ padding: "8px 16px", borderRadius: "8px" }}
        >
          Active Subscriptions
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`btn ${activeTab === "plans" ? "primary" : ""}`}
          style={{ padding: "8px 16px", borderRadius: "8px" }}
        >
          Pricing Plans Config
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Current Plan</th>
                <th>Billing Status</th>
                <th>Usage (Minutes)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-secondary" style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
                    Loading subscriptions...
                  </td>
                </tr>
              ) : organizations.map((org) => {
                const usage = calculateUsagePercent(org.minutes_used, org.max_minutes);
                return (
                  <tr key={org.id}>
                    <td style={{ fontWeight: "600" }}>{org.name}</td>
                    <td>
                      <Badge color={org.plan_id === "enterprise" ? "purple" : org.plan_id === "pro" ? "blue" : "gray"}>
                        {org.plan}
                      </Badge>
                    </td>
                    <td>
                      <Badge color={org.status === "Active" ? "green" : "red"}>
                        {org.status}
                      </Badge>
                    </td>
                    <td style={{ minWidth: "200px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                        <span className="text-secondary" style={{ opacity: 0.8 }}>{org.minutes_used} / {org.max_minutes} min</span>
                        <span style={{ fontWeight: "600", color: usage > 90 ? "#ef4444" : "var(--fg)" }}>{usage}%</span>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "var(--line)", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${usage}%`, background: usage > 90 ? "#ef4444" : "var(--primary)" }}></div>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-sm" onClick={() => alert(`Manage Billing for ${org.name}`)}>
                        Manage Billing
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "plans" && (
        <div className="grid2" style={{ gap: "20px" }}>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div key={plan.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="card-title" style={{ fontSize: "18px", margin: 0 }}>{plan.name}</h3>
                <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--primary)" }}>${plan.monthly_fee}<span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "500" }}>/mo</span></span>
              </div>
              
              <div style={{ borderTop: "1px solid var(--line-light)", paddingTop: "12px", marginTop: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed var(--line-light)" }}>
                  <span className="text-secondary" style={{ fontSize: "13px" }}>Max Voice Minutes</span>
                  <span style={{ fontWeight: "600", color: "var(--fg)", fontSize: "13.5px" }}>{plan.max_minutes} min</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span className="text-secondary" style={{ fontSize: "13px" }}>Max AI Agents</span>
                  <span style={{ fontWeight: "600", color: "var(--fg)", fontSize: "13.5px" }}>{plan.max_agents}</span>
                </div>
              </div>

              <button className="btn" style={{ marginTop: "auto" }}>Edit Plan Limits</button>
            </div>
          ))}
          
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed var(--line)", background: "transparent", cursor: "pointer" }}>
            <div style={{ textAlign: "center", color: "var(--primary)" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>+</div>
              <div style={{ fontWeight: "600" }}>Create New Tier</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
