import { useState } from "react";
import { getGoogleAuthUrl } from "../../services/calendar.service.js";

export default function ConnectGoogleCalendarModal({ isOpen, onClose, onConnect }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleOAuth = async (e) => {
    e.preventDefault();
    setConnecting(true);
    setError(null);
    try {
      const { authorization_url } = await getGoogleAuthUrl();
      // Open the OAuth flow in the same tab so the callback can be handled.
      window.location.href = authorization_url;
    } catch (err) {
      console.error("Failed to start Google OAuth", err);
      setError("Could not reach the backend. Make sure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI are set in your backend .env.");
      setConnecting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Connect Google Calendar</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleOAuth} className="modal-body">
          <div className="modal-notice-box">
            Clicking <strong>Authorize &amp; Connect</strong> will redirect you to Google's
            sign-in page. After granting access, you will be returned to this app and your
            calendar will be connected automatically.
          </div>

          {error && (
            <div style={{ color: "#e53e3e", fontSize: "13px", marginTop: "10px", padding: "8px 12px", background: "#fff5f5", borderRadius: "6px", border: "1px solid #fed7d7" }}>
              {error}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn-primary" disabled={connecting}>
              {connecting ? "Redirecting..." : "Authorize & Connect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
