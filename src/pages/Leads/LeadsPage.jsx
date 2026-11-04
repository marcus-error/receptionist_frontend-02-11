import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import Badge from '../../components/ui/Badge.jsx';
import Papa from 'papaparse';

const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    call_time: '',
    script: ''
  });
  
  const fileInputRef = useRef(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/leads${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`);
      setLeads(res.data.results || []);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const handleAddLead = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        leads: [
          {
            name: newLead.name,
            phone: newLead.phone,
            call_time: new Date(newLead.call_time).toISOString(),
            script: newLead.script
          }
        ]
      };
      await api.post('/leads/upload', payload);
      setShowAddModal(false);
      setNewLead({ name: '', phone: '', call_time: '', script: '' });
      fetchLeads();
    } catch (err) {
      alert("Failed to add lead: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await api.delete(`/leads/${id}`);
      fetchLeads();
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data;
        const leads = parsedData.map(row => ({
          name: row.name || row.Name || row.NAME || '',
          phone: row.phone || row.Phone || row.PHONE || '',
          call_time: new Date(row.call_time || row.Date || row.time || Date.now()).toISOString(),
          script: row.script || row.Script || row.SCRIPT || ''
        })).filter(l => l.phone); // Filter out rows without phone numbers

        if (leads.length === 0) {
          alert("No valid leads found in CSV. Make sure you have a 'phone' column.");
          return;
        }

        try {
          setLoading(true);
          await api.post('/leads/upload', { leads });
          alert(`Successfully uploaded ${leads.length} leads.`);
          fetchLeads();
        } catch (err) {
          alert("Bulk upload failed: " + (err.response?.data?.detail || err.message));
          setLoading(false);
        }
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
      error: (error) => {
        alert("Failed to parse CSV: " + error.message);
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,phone,call_time,script\nJohn Doe,+1234567890,2026-10-01T10:00:00Z,Hello this is a test call.";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "leads_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed': return <Badge color="green">Completed</Badge>;
      case 'calling': return <Badge color="blue">Calling</Badge>;
      case 'failed': return <Badge color="red">Failed</Badge>;
      default: return <Badge color="orange">Pending</Badge>;
    }
  };

  return (
    <section id="campaigns-page" className="page active">
      <div className="header" style={{ marginBottom: "24px" }}>
        <div>
          <h1 className="title">Outbound Campaigns</h1>
          <p className="subtitle">
            Manage and schedule automated outbound calls for leads.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn"
          >
            Bulk Upload (CSV)
          </button>
          <button 
            onClick={downloadTemplate}
            className="btn"
          >
            Download Template
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn primary"
          >
            + Add Lead
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['all', 'pending', 'calling', 'completed', 'failed'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`btn ${statusFilter === s ? 'primary' : ''}`}
            style={{ padding: '6px 14px', textTransform: 'capitalize', fontSize: '13px' }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>Loading campaigns...</p>
      ) : leads.length === 0 ? (
        <p style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>No leads found matching your criteria.</p>
      ) : (
        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Name & Contact</th>
                <th>Scheduled For</th>
                <th>Script Snippet</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--heading)' }}>{lead.name || 'Unknown'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                      📞 {lead.phone}
                    </div>
                  </td>
                  <td style={{ color: "var(--fg)" }}>
                    {new Date(lead.call_time).toLocaleString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit'
                    })}
                  </td>
                  <td>
                    <div style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--muted)' }} title={lead.script}>
                      {lead.script || 'No script provided'}
                    </div>
                  </td>
                  <td>
                    {getStatusBadge(lead.status)}
                  </td>
                  <td>
                    <button 
                      onClick={() => handleDelete(lead.id)}
                      className="btn"
                      style={{ padding: "6px 12px", fontSize: "12px", color: "#ef4444", borderColor: "transparent" }}
                      title="Delete Lead"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h2 className="modal-title">Schedule New Lead Call</h2>
              <button onClick={() => setShowAddModal(false)} className="modal-close-btn">×</button>
            </div>
            
            <form onSubmit={handleAddLead} style={{ marginTop: "16px" }}>
              <div className="group">
                <label style={{ color: "var(--heading)" }}>Lead Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe"
                  value={newLead.name}
                  onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                />
              </div>
              
              <div className="group">
                <label style={{ color: "var(--heading)" }}>Phone Number *</label>
                <input 
                  type="tel" 
                  required
                  placeholder="+1234567890"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                />
              </div>
              
              <div className="group">
                <label style={{ color: "var(--heading)" }}>Scheduled Date & Time *</label>
                <input 
                  type="datetime-local" 
                  required
                  value={newLead.call_time}
                  onChange={(e) => setNewLead({...newLead, call_time: e.target.value})}
                />
              </div>
              
              <div className="group">
                <label style={{ color: "var(--heading)" }}>Custom Script / Context *</label>
                <textarea 
                  required
                  rows="4"
                  placeholder="e.g. You are calling to remind them about their subscription renewal..."
                  value={newLead.script}
                  onChange={(e) => setNewLead({...newLead, script: e.target.value})}
                />
              </div>
              
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="modal-btn-cancel">Cancel</button>
                <button type="submit" className="modal-btn-primary">Schedule Call</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default LeadsPage;
