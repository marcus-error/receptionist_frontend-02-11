with open('src/pages/Telephony/index.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", padding: "0 0 8px" }}>
          <button
            id="sip-register-btn"
            type="button"
            className="sip-btn-primary"
            onClick={handleRegister}
            disabled={registering || (!form.domain && !form.sip_host && !form.sip_server) || !form.sip_username}
            style={{ minWidth: 160 }}
          >
            {registering ? "⏳ Registering…" : isRegistered ? "🔄 Re-Register" : "🔐 Register Now"}
          </button>

          {isRegistered && (
            <button
              id="sip-unregister-btn"
              type="button"
              className="sip-btn-secondary"
              onClick={handleUnregister}
              disabled={unregistering}
              style={{ minWidth: 140 }}
            >
              {unregistering ? "Stopping…" : "⏹ Unregister"}
            </button>
          )}

          <button
            type="button"
            className="sip-btn-secondary"
            onClick={loadRegStatus}
            style={{ minWidth: 120 }}
          >
            🔄 Refresh Status
          </button>
        </div>"""

new_block = """        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", padding: "0 0 8px" }}>
          <button
            id="sip-register-btn"
            type="button"
            className="sip-btn-primary"
            onClick={handleRegister}
            disabled={registering || (!form.domain && !form.sip_host && !form.sip_server) || !form.sip_username}
            style={{ minWidth: 160, background: isRegistered ? undefined : "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
          >
            {registering ? "⏳ Activating…" : isRegistered ? "🔄 Re-Register" : "▶ Activate SIP Trunk"}
          </button>

          <button
            id="sip-unregister-btn"
            type="button"
            className="sip-btn-secondary"
            onClick={handleUnregister}
            disabled={unregistering}
            style={{ minWidth: 160, borderColor: "rgba(239,68,68,0.5)", color: "#ef4444" }}
          >
            {unregistering ? "Deactivating…" : "⏸ Deactivate SIP Trunk"}
          </button>

          <button
            type="button"
            className="sip-btn-secondary"
            onClick={loadRegStatus}
            style={{ minWidth: 120 }}
          >
            🔄 Refresh Status
          </button>
        </div>"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/pages/Telephony/index.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS UPDATED BUTTONS IN INDEX.JSX")
else:
    print("OLD BLOCK NOT FOUND")
