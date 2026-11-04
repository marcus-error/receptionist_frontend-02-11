with open('src/pages/Telephony/index.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """      if (res.status === "connected") {
        setFeedback({ type: "success", message: `SIP credentials saved! Network probe: ${res.connection_detail || "Connected"}` });
      } else {"""

new_block = """      if (res.registration_status) {
        setRegStatus(res.registration_status);
        if (res.registration_detail) setRegDetail(res.registration_detail);
      }
      if (res.status === "connected") {
        setFeedback({ type: "success", message: `SIP credentials saved! Network probe: ${res.connection_detail || "Connected"}` });
      } else {"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/pages/Telephony/index.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("UPDATED handleSave in index.jsx")
else:
    print("OLD BLOCK NOT FOUND")
