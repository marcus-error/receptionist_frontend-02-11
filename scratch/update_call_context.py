with open('src/context/CallContext.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """    newSocket.on("incoming_call", (data) => {
      console.log("Incoming call:", data);
      setActiveCall(data);
      setCallState("ringing");
      
      // Play ringtone
      audio.play().catch(e => console.error("Audio play failed (browser policy):", e));
      
      // Show browser notification
      if (Notification.permission === "granted") {
        new Notification("Incoming Call", {
          body: `${data.caller_name || 'Unknown'} (${data.caller_phone})`,
          icon: "/favicon.ico"
        });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            new Notification("Incoming Call", {
              body: `${data.caller_name || 'Unknown'} (${data.caller_phone})`
            });
          }
        });
      }
    });"""

new_block = """    const handleIncoming = (data) => {
      console.log("Incoming call event:", data);
      setActiveCall(data);
      setCallState("ringing");
      
      // Play ringtone
      audio.play().catch(e => console.log("Audio play policy:", e));
      
      // Show browser notification
      if (typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          new Notification("Incoming Call - Callzenza AI", {
            body: `${data.caller_name || 'Unknown'} (${data.caller_phone || ''})`,
            icon: "/favicon.ico"
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission().then(permission => {
            if (permission === "granted") {
              new Notification("Incoming Call - Callzenza AI", {
                body: `${data.caller_name || 'Unknown'} (${data.caller_phone || ''})`
              });
            }
          });
        }
      }
    };

    newSocket.on("incoming_call", handleIncoming);
    newSocket.on("incoming-call", handleIncoming);"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open('src/context/CallContext.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS UPDATED CallContext.jsx")
else:
    print("OLD BLOCK NOT FOUND")
