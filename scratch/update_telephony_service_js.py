with open('src/services/telephony.service.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = '  sipHangup: (payload) => api.post(`${BASE}/sip/inbound/hangup`, payload).then((res) => res.data),'
new_str = '''  sipHangup: (payload) => api.post(`${BASE}/sip/inbound/hangup`, payload).then((res) => res.data),
  makeOutboundCall: (payload) => api.post(`${BASE}/sip/outbound`, payload).then((res) => res.data),'''

if old_str in content:
    content = content.replace(old_str, new_str)
    with open('src/services/telephony.service.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("ADDED makeOutboundCall")
else:
    print("OLD STR NOT FOUND")
