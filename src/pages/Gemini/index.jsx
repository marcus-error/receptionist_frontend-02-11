import { useState, useEffect } from "react";
import Badge from "../../components/ui/Badge.jsx";
import AddGeminiAccountModal from "../../components/modals/AddGeminiAccountModal.jsx";
import { getGeminiAccounts, addGeminiAccount } from "../../services/gemini.service.js";

export default function Gemini() {
  const [accounts, setAccounts] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const data = await getGeminiAccounts();
        setAccounts(data);
      } catch (err) {
        console.error("Failed to load Gemini accounts", err);
      }
    }
    loadAccounts();
  }, []);

  const handleAddAccount = async (newAcc) => {
    try {
      const addedAcc = await addGeminiAccount({
        account: newAcc.account || `Gemini Account ${accounts.length + 1}`,
        api_key: newAcc.api_key || newAcc.apiKey || ""
      });
      setAccounts((prev) => [...prev, addedAcc]);
    } catch (err) {
      console.error(err);
    }
  };

  const activeCount = accounts.filter((a) => a.status === "Active").length;

  return (
    <section id="gemini" className="page active">
      <div className="header">
        <div>
          <h1 className="title">Gemini Account Pool</h1>
          <p className="subtitle">Manage AI model accounts, API keys, and rate quota</p>
        </div>

        <button className="btn primary" onClick={() => setIsAddModalOpen(true)}>
          + Add Account
        </button>
      </div>

      <div className="cards">
        <div className="card">
          <div className="stat-label">Total Accounts</div>
          <div className="stat">{accounts.length}</div>
        </div>

        <div className="card">
          <div className="stat-label">Active Pool</div>
          <div className="stat" style={{ color: "#b7ff5c" }}>{activeCount}</div>
        </div>

        <div className="card">
          <div className="stat-label">Requests Today</div>
          <div className="stat">0</div>
        </div>

        <div className="card">
          <div className="stat-label">Default Model</div>
          <div className="stat" style={{ fontSize: "18px", color: "#5ce1ff", marginTop: "14px" }}>
            Gemini 3.6 Flash
          </div>
        </div>
      </div>

      <div className="table">
        <table>
          <thead>
            <tr>
              <th>Account Name</th>
              <th>Status</th>
              <th>Requests</th>
              <th>Quota Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => (
              <tr key={acc.id}>
                <td style={{ fontWeight: 600 }}>{acc.account}</td>
                <td>
                  <Badge color={acc.status === "Active" ? "green" : acc.status === "Near Limit" ? "yellow" : "red"}>
                    {acc.status}
                  </Badge>
                </td>
                <td>{acc.requests || 0}</td>
                <td>{acc.quota || "15 RPM Free Tier"}</td>
              </tr>
            ))}

            {accounts.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: "40px 20px", color: "rgba(244, 245, 243, 0.4)" }}>
                  No Gemini accounts configured. Click "+ Add Account" to configure one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddGeminiAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddAccount={handleAddAccount}
      />
    </section>
  );
}
