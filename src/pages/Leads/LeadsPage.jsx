import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import Badge from '../../components/ui/Badge.jsx';
import Papa from 'papaparse';

// Pagination helper to build sliding page number window (e.g. 1 2 3 4 5 ... 15)
const getPageNumbers = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = [];
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push("...");
    pages.push(total);
  } else if (current >= total - 3) {
    pages.push(1);
    pages.push("...");
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push("...");
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push("...");
    pages.push(total);
  }
  return pages;
};

const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination states
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    call_time: '',
    script: ''
  });
  
  const fileInputRef = useRef(null);

  const fetchLeads = useCallback(
    async (targetPage = currentPage, filter = statusFilter, showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const params = {
          page: targetPage,
          limit: pageSize,
          pageSize: pageSize,
        };
        if (filter && filter !== 'all') {
          params.status = filter;
        }

        const res = await api.get('/leads', { params });
        const data = res.data || {};
        const results = data.results || data.data || [];
        const total = data.total !== undefined ? data.total : results.length;
        const pages = data.totalPages || data.total_pages || Math.max(1, Math.ceil(total / pageSize));

        setTotalLeads(total);
        setTotalPages(pages);

        // If targetPage > pages and we have at least 1 page, adjust current page
        if (targetPage > pages && pages >= 1) {
          setCurrentPage(pages);
          return;
        }

        setLeads(results);
      } catch (err) {
        console.error("Failed to fetch leads:", err);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [currentPage, pageSize, statusFilter]
  );

  // Fetch when page or filter changes
  useEffect(() => {
    fetchLeads(currentPage, statusFilter, true);
  }, [currentPage, statusFilter, fetchLeads]);

  // Periodic background refresh every 10s without flickering the loading spinner
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeads(currentPage, statusFilter, false);
    }, 10000);
    return () => clearInterval(interval);
  }, [currentPage, statusFilter, fetchLeads]);

  const handleFilterChange = (s) => {
    setStatusFilter(s);
    setCurrentPage(1);
  };

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
      setCurrentPage(1);
      fetchLeads(1, statusFilter, true);
    } catch (err) {
      alert("Failed to add lead: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lead?")) return;
    try {
      await api.delete(`/leads/${id}`);
      // If deleting the last item on the current page, step back to previous page
      const isLastItemOnPage = leads.length === 1 && currentPage > 1;
      const nextPage = isLastItemOnPage ? currentPage - 1 : currentPage;
      if (isLastItemOnPage) {
        setCurrentPage(nextPage);
      } else {
        fetchLeads(currentPage, statusFilter, true);
      }
    } catch (err) {
      console.error("Failed to delete lead:", err);
      alert("Failed to delete lead: " + (err.response?.data?.detail || err.message));
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
        const uploadedLeads = parsedData.map(row => ({
          name: row.name || row.Name || row.NAME || '',
          phone: row.phone || row.Phone || row.PHONE || '',
          call_time: new Date(row.call_time || row.Date || row.time || Date.now()).toISOString(),
          script: row.script || row.Script || row.SCRIPT || ''
        })).filter(l => l.phone); // Filter out rows without phone numbers

        if (uploadedLeads.length === 0) {
          alert("No valid leads found in CSV. Make sure you have a 'phone' column.");
          return;
        }

        try {
          setLoading(true);
          await api.post('/leads/upload', { leads: uploadedLeads });
          alert(`Successfully uploaded ${uploadedLeads.length} leads.`);
          setCurrentPage(1);
          fetchLeads(1, statusFilter, true);
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
    const st = (status || '').toLowerCase();
    switch(st) {
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
            onClick={() => handleFilterChange(s)}
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
        <p style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>No outbound campaigns found matching your criteria.</p>
      ) : (
        <>
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
                      <div style={{ fontWeight: 600, color: 'var(--heading)' }}>{lead.name || lead.customer || 'Unknown'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                        📞 {lead.phone}
                      </div>
                    </td>
                    <td style={{ color: "var(--fg)" }}>
                      {lead.call_time ? new Date(lead.call_time).toLocaleString(undefined, {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit'
                      }) : '—'}
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

          {/* ── Pagination Controls ── */}
          {totalLeads > 0 && (
            <div
              className="campaigns-pagination-bar"
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "14px",
                marginTop: "16px",
                padding: "12px 18px",
                background: "var(--panel-card, #0f172a)",
                border: "1px solid var(--line, #334155)",
                borderRadius: "var(--radius-lg, 12px)",
                boxShadow: "var(--card-shadow, 0 1px 3px rgba(0,0,0,0.1))",
              }}
            >
              {/* Left: Showing current record range */}
              <div style={{ fontSize: "13.5px", color: "var(--muted, #94a3b8)" }}>
                Showing{" "}
                <strong style={{ color: "var(--heading, #ffffff)", fontWeight: 600 }}>
                  {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalLeads)}
                </strong>{" "}
                of{" "}
                <strong style={{ color: "var(--heading, #ffffff)", fontWeight: 600 }}>
                  {totalLeads}
                </strong>{" "}
                campaigns
              </div>

              {/* Right / Center: Pagination Navigation */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                {/* Previous Button */}
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || loading}
                  style={{
                    padding: "6px 14px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: currentPage <= 1 || loading ? "not-allowed" : "pointer",
                    opacity: currentPage <= 1 || loading ? 0.5 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    borderRadius: "6px",
                  }}
                >
                  ← Previous
                </button>

                {/* Numbered Page Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                    p === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        style={{
                          padding: "0 6px",
                          color: "var(--muted, #94a3b8)",
                          fontSize: "13px",
                          userSelect: "none",
                        }}
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={`page-${p}`}
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setCurrentPage(p)}
                        disabled={loading}
                        style={{
                          minWidth: "34px",
                          height: "32px",
                          padding: "0 8px",
                          fontSize: "13px",
                          fontWeight: currentPage === p ? 700 : 500,
                          background: currentPage === p ? "var(--primary, #0284c7)" : "transparent",
                          color: currentPage === p ? "#ffffff" : "var(--fg, #e2e8f0)",
                          borderColor: currentPage === p ? "var(--primary, #0284c7)" : "var(--line, #334155)",
                          borderRadius: "6px",
                          cursor: loading ? "not-allowed" : "pointer",
                        }}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                {/* Page indicator: Page X of Y */}
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--muted, #94a3b8)",
                    margin: "0 6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Page <strong style={{ color: "var(--heading, #ffffff)" }}>{currentPage}</strong> of{" "}
                  <strong style={{ color: "var(--heading, #ffffff)" }}>{totalPages}</strong>
                </span>

                {/* Next Button */}
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || loading}
                  style={{
                    padding: "6px 14px",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: currentPage >= totalPages || loading ? "not-allowed" : "pointer",
                    opacity: currentPage >= totalPages || loading ? 0.5 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    borderRadius: "6px",
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
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
                  value={newLead.name} 
                  onChange={e => setNewLead({...newLead, name: e.target.value})}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="group">
                <label style={{ color: "var(--heading)" }}>Phone Number *</label>
                <input 
                  type="tel" 
                  required 
                  value={newLead.phone} 
                  onChange={e => setNewLead({...newLead, phone: e.target.value})}
                  placeholder="e.g. +1234567890"
                />
              </div>

              <div className="group">
                <label style={{ color: "var(--heading)" }}>Call Date & Time *</label>
                <input 
                  type="datetime-local" 
                  required 
                  value={newLead.call_time} 
                  onChange={e => setNewLead({...newLead, call_time: e.target.value})}
                />
              </div>

              <div className="group">
                <label style={{ color: "var(--heading)" }}>Custom Script / Instructions</label>
                <textarea 
                  rows={3}
                  value={newLead.script} 
                  onChange={e => setNewLead({...newLead, script: e.target.value})}
                  placeholder="Instructions for the AI when calling this lead..."
                />
              </div>

              <div className="modal-footer" style={{ marginTop: "24px" }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn">Cancel</button>
                <button type="submit" className="btn primary">Schedule Call</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default LeadsPage;
