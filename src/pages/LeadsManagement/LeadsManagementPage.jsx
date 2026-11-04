import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  PhoneCall,
  Award,
  CalendarCheck,
  Clock,
  Search,
  X,
  RotateCcw,
  RefreshCw,
  Eye,
  Edit2,
  Headphones,
  CheckCircle2,
  AlertCircle,
  PhoneIncoming,
  PhoneOutgoing,
  Calendar,
  MessageSquare,
  FileText,
  Volume2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Send,
  User
} from "lucide-react";
import leadsService from "../../services/leads.service.js";
import Badge from "../../components/ui/Badge.jsx";
import "./leadsManagement.css";

const LEAD_STATUS_COLORS = {
  New: "blue",
  Contacted: "yellow",
  Qualified: "purple",
  Converted: "green",
  Lost: "red",
};

const APPT_STATUS_COLORS = {
  "Not Booked": "gray",
  Pending: "yellow",
  Booked: "green",
  Confirmed: "green",
  Completed: "blue",
  Cancelled: "red",
  Rescheduled: "yellow",
};

export default function LeadsManagementPage() {
  // Metrics state
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    qualifiedLeads: 0,
    appointmentsBooked: 0,
    followUpRequired: 0,
  });

  // Services dropdown
  const [servicesList, setServicesList] = useState([]);

  // Leads list state
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);

  // Filters state
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [callType, setCallType] = useState("all");
  const [leadStatus, setLeadStatus] = useState("all");
  const [appointmentStatus, setAppointmentStatus] = useState("all");
  const [selectedService, setSelectedService] = useState("all");
  const [sortBy, setSortBy] = useState("call_time");
  const [sortOrder, setSortOrder] = useState("desc");

  // Drawer & Modal state
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [leadDetails, setLeadDetails] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState("overview"); // overview | timeline | transcript
  const [quickNoteText, setQuickNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Edit Modal state
  const [editingLead, setEditingLead] = useState(null);
  const [editForm, setEditForm] = useState({
    lead_status: "New",
    appointment_status: "Not Booked",
    follow_up_required: false,
    follow_up_date: "",
    notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Fetch metrics & services
  const fetchAuxData = async () => {
    try {
      const [metricsData, servicesData] = await Promise.all([
        leadsService.getMetrics(),
        leadsService.getServices(),
      ]);
      if (metricsData) setMetrics(metricsData);
      if (Array.isArray(servicesData)) setServicesList(servicesData);
    } catch (err) {
      console.error("[LeadsManagement] Failed to fetch metrics/services:", err);
    }
  };

  // Fetch leads with active filters
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (search.trim()) params.search = search.trim();
      if (dateRange !== "all") params.date_range = dateRange;
      if (callType !== "all") params.call_type = callType;
      if (leadStatus !== "all") params.lead_status = leadStatus;
      if (appointmentStatus !== "all") params.appointment_status = appointmentStatus;
      if (selectedService !== "all") params.product_service = selectedService;

      const data = await leadsService.getLeads(params);
      if (data) {
        setLeads(data.results || []);
        setTotalLeads(data.total || 0);
        setTotalPages(data.total_pages || 1);
      }
    } catch (err) {
      console.error("[LeadsManagement] Failed to load leads:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, sortBy, sortOrder, search, dateRange, callType, leadStatus, appointmentStatus, selectedService]);

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Open Drawer and load details
  const handleOpenDrawer = async (leadId, tab = "overview") => {
    setSelectedLeadId(leadId);
    setDrawerTab(tab);
    setDrawerLoading(true);
    try {
      const details = await leadsService.getLeadDetails(leadId);
      setLeadDetails(details);
    } catch (err) {
      console.error("[LeadsManagement] Failed to load lead details:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleCloseDrawer = () => {
    setSelectedLeadId(null);
    setLeadDetails(null);
    setQuickNoteText("");
  };

  // Open Edit Modal
  const handleOpenEdit = (lead) => {
    setEditingLead(lead);
    setEditForm({
      lead_status: lead.lead_status || "New",
      appointment_status: lead.appointment_status || "Not Booked",
      follow_up_required: Boolean(lead.follow_up_required),
      follow_up_date: lead.follow_up_date ? lead.follow_up_date.split("T")[0] : "",
      notes: lead.notes || "",
    });
  };

  const handleCloseEdit = () => {
    setEditingLead(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingLead) return;
    try {
      setSavingEdit(true);
      const payload = {
        lead_status: editForm.lead_status,
        appointment_status: editForm.appointment_status,
        follow_up_required: editForm.follow_up_required,
        follow_up_date: editForm.follow_up_date ? `${editForm.follow_up_date}T09:00:00Z` : null,
        notes: editForm.notes,
      };
      await leadsService.updateLead(editingLead.id, payload);
      handleCloseEdit();
      fetchLeads();
      fetchAuxData();
      if (selectedLeadId === editingLead.id) {
        handleOpenDrawer(editingLead.id, drawerTab);
      }
    } catch (err) {
      alert("Failed to update lead: " + (err.response?.data?.detail || err.message));
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick note add in drawer
  const handleAddQuickNote = async (e) => {
    e.preventDefault();
    if (!quickNoteText.trim() || !selectedLeadId) return;
    try {
      setSubmittingNote(true);
      await leadsService.addActivity(selectedLeadId, {
        event_type: "note_added",
        title: "Internal Note Added",
        description: quickNoteText.trim(),
      });
      setQuickNoteText("");
      const details = await leadsService.getLeadDetails(selectedLeadId);
      setLeadDetails(details);
    } catch (err) {
      alert("Failed to add note: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmittingNote(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setDateRange("all");
    setCallType("all");
    setLeadStatus("all");
    setAppointmentStatus("all");
    setSelectedService("all");
    setCurrentPage(1);
  };

  // Sync / Refresh data
  const handleSyncData = async () => {
    try {
      setLoading(true);
      await leadsService.syncLeads();
      await fetchAuxData();
      await fetchLeads();
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="leads-page">
      {/* ── Page Header ── */}
      <div className="leads-header">
        <div>
          <h1 className="title">AI Receptionist Leads Management</h1>
          <p className="subtitle">
            Collect, track, and manage leads generated across all inbound and outbound AI voice calls.
          </p>
        </div>
        <div className="leads-header-actions">
          <button className="btn" onClick={handleSyncData} title="Resync database records" disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Sync Live Records</span>
          </button>
        </div>
      </div>

      {/* ── Dynamic Summary Cards ── */}
      <div className="leads-metrics-grid">
        <div className="leads-metric-card total">
          <div className="metric-header">
            <span className="metric-title">Total Leads</span>
            <div className="metric-icon-wrap total">
              <Users size={16} />
            </div>
          </div>
          <div className="metric-value">{metrics.totalLeads}</div>
        </div>

        <div className="leads-metric-card new">
          <div className="metric-header">
            <span className="metric-title">New Leads</span>
            <div className="metric-icon-wrap new">
              <UserPlus size={16} />
            </div>
          </div>
          <div className="metric-value">{metrics.newLeads}</div>
        </div>

        <div className="leads-metric-card contacted">
          <div className="metric-header">
            <span className="metric-title">Contacted Leads</span>
            <div className="metric-icon-wrap contacted">
              <PhoneCall size={16} />
            </div>
          </div>
          <div className="metric-value">{metrics.contactedLeads}</div>
        </div>

        <div className="leads-metric-card qualified">
          <div className="metric-header">
            <span className="metric-title">Qualified Leads</span>
            <div className="metric-icon-wrap qualified">
              <Award size={16} />
            </div>
          </div>
          <div className="metric-value">{metrics.qualifiedLeads}</div>
        </div>

        <div className="leads-metric-card booked">
          <div className="metric-header">
            <span className="metric-title">Appointments Booked</span>
            <div className="metric-icon-wrap booked">
              <CalendarCheck size={16} />
            </div>
          </div>
          <div className="metric-value">{metrics.appointmentsBooked}</div>
        </div>

        <div className="leads-metric-card followup">
          <div className="metric-header">
            <span className="metric-title">Follow-up Required</span>
            <div className="metric-icon-wrap followup">
              <Clock size={16} />
            </div>
          </div>
          <div className="metric-value">{metrics.followUpRequired}</div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="leads-filter-panel">
        <div className="filter-top-row">
          <div className="search-box">
            <Search size={15} color="var(--muted)" />
            <input
              type="text"
              placeholder="Search by customer name, phone, or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
            {search && (
              <button className="search-clear-btn" onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn-reset-filters" onClick={handleResetFilters} title="Reset all filters">
              <RotateCcw size={13} />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>

        <div className="filter-selects-row">
          {/* Date range filter */}
          <div className="filter-control">
            <span className="filter-label">Date:</span>
            <select
              className="filter-select"
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* Call type filter */}
          <div className="filter-control">
            <span className="filter-label">Call:</span>
            <select
              className="filter-select"
              value={callType}
              onChange={(e) => {
                setCallType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Calls</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </div>

          {/* Lead Status filter */}
          <div className="filter-control">
            <span className="filter-label">Lead Status:</span>
            <select
              className="filter-select"
              value={leadStatus}
              onChange={(e) => {
                setLeadStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="converted">Converted</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Appointment Status filter */}
          <div className="filter-control">
            <span className="filter-label">Appointment:</span>
            <select
              className="filter-select"
              value={appointmentStatus}
              onChange={(e) => {
                setAppointmentStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Bookings</option>
              <option value="booked">Booked</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="not booked">Not Booked</option>
            </select>
          </div>

          {/* Product / Service filter */}
          <div className="filter-control">
            <span className="filter-label">Service:</span>
            <select
              className="filter-select"
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Services</option>
              {servicesList.map((s, idx) => (
                <option key={idx} value={s}>
                  {s.replace(/\n/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Leads Table ── */}
      <div className="leads-table-container">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--muted)" }}>
            <RefreshCw size={24} className="spin" style={{ margin: "0 auto 12px auto", display: "block" }} />
            Loading real leads from database...
          </div>
        ) : leads.length === 0 ? (
          <div className="leads-empty-state">
            <div className="leads-empty-state-icon">
              <Users size={28} />
            </div>
            <h3>No Leads Found</h3>
            <p>
              {search || dateRange !== "all" || callType !== "all" || leadStatus !== "all" || appointmentStatus !== "all"
                ? "No leads matched your specific filter criteria. Try adjusting or clearing your filters."
                : "No leads recorded in the database yet. New leads will be captured automatically as inbound and outbound calls connect."}
            </p>
            {(search || dateRange !== "all" || callType !== "all" || leadStatus !== "all" || appointmentStatus !== "all") && (
              <button className="btn primary" onClick={handleResetFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Lead ID</th>
                  <th
                    className="sortable"
                    onClick={() => {
                      setSortBy("name");
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    }}
                  >
                    Customer <ArrowUpDown size={12} style={{ display: "inline", marginLeft: "4px" }} />
                  </th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Call Type</th>
                  <th
                    className="sortable"
                    onClick={() => {
                      setSortBy("call_time");
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    }}
                  >
                    Call Date & Time <ArrowUpDown size={12} style={{ display: "inline", marginLeft: "4px" }} />
                  </th>
                  <th>Product / Service</th>
                  <th>Appointment Date & Time</th>
                  <th>Lead Status</th>
                  <th>Appointment Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const leadBadgeColor = LEAD_STATUS_COLORS[lead.lead_status] || "blue";
                  const apptBadgeColor = APPT_STATUS_COLORS[lead.appointment_status] || "gray";

                  return (
                    <tr key={lead.id}>
                      {/* Lead ID */}
                      <td>
                        <span className="lead-id-tag">{lead.lead_number}</span>
                      </td>

                      {/* Customer */}
                      <td>
                        {lead.customer === "Not provided" ? (
                          <span className="lead-not-provided">Not provided</span>
                        ) : (
                          <span className="lead-customer-name">{lead.customer}</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td>
                        <span className="lead-phone">{lead.phone}</span>
                      </td>

                      {/* Email */}
                      <td>
                        {lead.email === "Not provided" ? (
                          <span className="lead-not-provided">Not provided</span>
                        ) : (
                          <span className="lead-email">{lead.email}</span>
                        )}
                      </td>

                      {/* Call Type */}
                      <td>
                        <Badge color={lead.call_type?.toLowerCase() === "outbound" ? "purple" : "blue"}>
                          {lead.call_type?.toLowerCase() === "outbound" ? (
                            <PhoneOutgoing size={11} style={{ marginRight: 4, display: "inline" }} />
                          ) : (
                            <PhoneIncoming size={11} style={{ marginRight: 4, display: "inline" }} />
                          )}
                          {lead.call_type || "Inbound"}
                        </Badge>
                      </td>

                      {/* Call Date & Time */}
                      <td style={{ color: "var(--fg)", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {formatDateTime(lead.call_time)}
                      </td>

                      {/* Product / Service */}
                      <td>
                        {lead.product_service?.includes("Discussed") ? (
                          <span className="lead-discussed">{lead.product_service}</span>
                        ) : (
                          <span style={{ color: "#ffffff", fontWeight: 500 }}>
                            {lead.product_service || "—"}
                          </span>
                        )}
                      </td>

                      {/* Appointment Date & Time */}
                      <td>
                        {lead.appointment_date_time === "Not booked" ? (
                          <span className="lead-not-booked">Not booked</span>
                        ) : (
                          <span className="lead-booked-time">
                            <Calendar size={13} />
                            {lead.appointment_date_time}
                          </span>
                        )}
                      </td>

                      {/* Lead Status */}
                      <td>
                        <Badge color={leadBadgeColor}>{lead.lead_status || "New"}</Badge>
                      </td>

                      {/* Appointment Status */}
                      <td>
                        <Badge color={apptBadgeColor}>{lead.appointment_status || "Not Booked"}</Badge>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div className="lead-actions-cell" style={{ justifyContent: "flex-end" }}>
                          <button
                            className="btn-table-action primary"
                            title="View Full Lead Details"
                            onClick={() => handleOpenDrawer(lead.id, "overview")}
                          >
                            <Eye size={12} />
                            <span>Details</span>
                          </button>
                          <button
                            className="btn-table-action"
                            title="Quick Edit Lead Status & Notes"
                            onClick={() => handleOpenEdit(lead)}
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            className="btn-table-action"
                            title="View Call Recording & History"
                            onClick={() => handleOpenDrawer(lead.id, "transcript")}
                          >
                            <Headphones size={12} />
                            <span>History</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            <div className="leads-pagination">
              <div>
                Showing <b>{leads.length}</b> of <b>{totalLeads}</b> verified leads (Page {currentPage} of {totalPages})
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft size={13} style={{ display: "inline" }} /> Previous
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next <ChevronRight size={13} style={{ display: "inline" }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Lead Details Drawer (Slide-Over) ── */}
      {selectedLeadId && (
        <div className="drawer-backdrop" onClick={handleCloseDrawer}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-title-area">
                <span className="drawer-lead-id">{leadDetails?.lead_number || `LEAD-${selectedLeadId}`}</span>
                <h2 className="drawer-customer-name">
                  {leadDetails?.customer?.name || "Customer Details"}
                </h2>
                <div className="drawer-badges-row">
                  <Badge color={LEAD_STATUS_COLORS[leadDetails?.lead_status] || "blue"}>
                    {leadDetails?.lead_status || "New"}
                  </Badge>
                  <Badge color={APPT_STATUS_COLORS[leadDetails?.appointment_status] || "gray"}>
                    {leadDetails?.appointment_status || "Not Booked"}
                  </Badge>
                  {leadDetails?.call?.call_type && (
                    <Badge color={leadDetails.call.call_type.toLowerCase() === "outbound" ? "purple" : "blue"}>
                      {leadDetails.call.call_type}
                    </Badge>
                  )}
                </div>
              </div>
              <button className="drawer-close-btn" onClick={handleCloseDrawer}>
                <X size={20} />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "rgba(9, 13, 22, 0.7)" }}>
              <button
                className={`btn ${drawerTab === "overview" ? "primary" : ""}`}
                style={{ borderRadius: 0, border: "none", padding: "10px 18px", fontSize: "13px" }}
                onClick={() => setDrawerTab("overview")}
              >
                Overview & Customer
              </button>
              <button
                className={`btn ${drawerTab === "transcript" ? "primary" : ""}`}
                style={{ borderRadius: 0, border: "none", padding: "10px 18px", fontSize: "13px" }}
                onClick={() => setDrawerTab("transcript")}
              >
                Call & Transcript ({leadDetails?.call?.transcript?.length || 0})
              </button>
              <button
                className={`btn ${drawerTab === "timeline" ? "primary" : ""}`}
                style={{ borderRadius: 0, border: "none", padding: "10px 18px", fontSize: "13px" }}
                onClick={() => setDrawerTab("timeline")}
              >
                Activity Timeline ({leadDetails?.timeline?.length || 0})
              </button>
            </div>

            {drawerLoading ? (
              <div style={{ textAlign: "center", padding: "60px", color: "var(--muted)" }}>
                <RefreshCw size={24} className="spin" style={{ margin: "0 auto 12px auto", display: "block" }} />
                Loading lead details...
              </div>
            ) : !leadDetails ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                Lead details could not be found.
              </div>
            ) : (
              <div className="drawer-body">
                {/* ── TAB 1: OVERVIEW & CUSTOMER ── */}
                {drawerTab === "overview" && (
                  <>
                    {/* Customer Info Card */}
                    <div className="detail-card">
                      <div className="detail-card-title">
                        <User size={15} color="#38bdf8" /> Customer Information
                      </div>
                      <div className="detail-fields-grid">
                        <div className="detail-field">
                          <span className="detail-field-label">Customer Name</span>
                          <span className="detail-field-value">
                            {leadDetails.customer.name === "Not provided" ? (
                              <span className="lead-not-provided">Not provided</span>
                            ) : (
                              leadDetails.customer.name
                            )}
                          </span>
                        </div>

                        <div className="detail-field">
                          <span className="detail-field-label">Phone Number</span>
                          <span className="detail-field-value" style={{ fontFamily: "monospace" }}>
                            {leadDetails.customer.phone}
                          </span>
                        </div>

                        <div className="detail-field">
                          <span className="detail-field-label">Email Address</span>
                          <span className="detail-field-value">
                            {leadDetails.customer.email === "Not provided" ? (
                              <span className="lead-not-provided">Not provided</span>
                            ) : (
                              leadDetails.customer.email
                            )}
                          </span>
                        </div>

                        <div className="detail-field">
                          <span className="detail-field-label">Lead Source</span>
                          <span className="detail-field-value">{leadDetails.customer.lead_source}</span>
                        </div>
                      </div>
                    </div>

                    {/* Product / Service Card */}
                    <div className="detail-card">
                      <div className="detail-card-title">
                        <FileText size={15} color="#a855f7" /> Product / Service Information
                      </div>
                      <div className="detail-fields-grid">
                        <div className="detail-field" style={{ gridColumn: "span 2" }}>
                          <span className="detail-field-label">Discussed or Booked</span>
                          <span className="detail-field-value" style={{ color: "#ffffff", fontWeight: 600 }}>
                            {leadDetails.product_service.display}
                          </span>
                        </div>

                        {leadDetails.product_service.discussed && (
                          <div className="detail-field">
                            <span className="detail-field-label">Product Discussed</span>
                            <span className="detail-field-value">{leadDetails.product_service.discussed}</span>
                          </div>
                        )}

                        {leadDetails.product_service.booked && (
                          <div className="detail-field">
                            <span className="detail-field-label">Product Booked</span>
                            <span className="detail-field-value" style={{ color: "#10b981" }}>
                              {leadDetails.product_service.booked}
                            </span>
                          </div>
                        )}

                        <div className="detail-field" style={{ gridColumn: "span 2" }}>
                          <span className="detail-field-label">Customer Notes & Follow-up</span>
                          <span className="detail-field-value" style={{ color: "var(--muted)" }}>
                            {leadDetails.product_service.notes || "No special instructions recorded."}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Appointment Card */}
                    <div className="detail-card">
                      <div className="detail-card-title">
                        <CalendarCheck size={15} color="#10b981" /> Appointment Information
                      </div>
                      {leadDetails.appointment ? (
                        <div className="detail-fields-grid">
                          <div className="detail-field">
                            <span className="detail-field-label">Appointment Reference</span>
                            <span className="detail-field-value" style={{ color: "#10b981", fontWeight: 700 }}>
                              {leadDetails.appointment.reference_id}
                            </span>
                          </div>

                          <div className="detail-field">
                            <span className="detail-field-label">Status</span>
                            <span className="detail-field-value">
                              <Badge color={APPT_STATUS_COLORS[leadDetails.appointment.status] || "green"}>
                                {leadDetails.appointment.status}
                              </Badge>
                            </span>
                          </div>

                          <div className="detail-field">
                            <span className="detail-field-label">Date & Time</span>
                            <span className="detail-field-value">
                              {leadDetails.appointment.date} at {leadDetails.appointment.time}
                            </span>
                          </div>

                          <div className="detail-field">
                            <span className="detail-field-label">Staff Member</span>
                            <span className="detail-field-value">
                              {leadDetails.appointment.staff} ({leadDetails.appointment.department})
                            </span>
                          </div>

                          {leadDetails.appointment.calendar_event_id && (
                            <div className="detail-field" style={{ gridColumn: "span 2" }}>
                              <span className="detail-field-label">Google Calendar Event ID</span>
                              <span className="detail-field-value" style={{ fontFamily: "monospace", fontSize: "11px", color: "#38bdf8" }}>
                                {leadDetails.appointment.calendar_event_id}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ color: "var(--faint)", fontStyle: "italic", fontSize: "13px" }}>
                          No confirmed appointment booked for this lead.
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── TAB 2: CALL & TRANSCRIPT ── */}
                {drawerTab === "transcript" && (
                  <>
                    <div className="detail-card">
                      <div className="detail-card-title">
                        <PhoneCall size={15} color="#38bdf8" /> Call Session Information
                      </div>
                      {leadDetails.call ? (
                        <div className="detail-fields-grid">
                          <div className="detail-field">
                            <span className="detail-field-label">Direction</span>
                            <span className="detail-field-value">{leadDetails.call.call_type}</span>
                          </div>
                          <div className="detail-field">
                            <span className="detail-field-label">Duration</span>
                            <span className="detail-field-value">{leadDetails.call.duration}</span>
                          </div>
                          <div className="detail-field">
                            <span className="detail-field-label">Start Time</span>
                            <span className="detail-field-value">{formatDateTime(leadDetails.call.started_at)}</span>
                          </div>
                          <div className="detail-field">
                            <span className="detail-field-label">Outcome</span>
                            <span className="detail-field-value">{leadDetails.call.status}</span>
                          </div>
                          <div className="detail-field" style={{ gridColumn: "span 2" }}>
                            <span className="detail-field-label">Call SID / Identifier</span>
                            <span className="detail-field-value" style={{ fontFamily: "monospace", fontSize: "11px" }}>
                              {leadDetails.call.call_sid}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: "var(--faint)", fontStyle: "italic" }}>
                          No call record linked to this lead.
                        </div>
                      )}

                      {/* Audio Recording Player */}
                      {leadDetails.call?.recording_url && (
                        <div className="recording-player-box">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--muted)" }}>
                            <Volume2 size={14} color="#38bdf8" />
                            <span>Voice Call Audio Recording:</span>
                          </div>
                          <audio controls src={leadDetails.call.recording_url} preload="none">
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      )}
                    </div>

                    {/* Turn-by-Turn Conversation Transcript */}
                    <div className="detail-card">
                      <div className="detail-card-title">
                        <MessageSquare size={15} color="#38bdf8" /> Verified Call Transcript & AI Responses
                      </div>
                      {leadDetails.call?.transcript && leadDetails.call.transcript.length > 0 ? (
                        <div className="transcript-container">
                          {leadDetails.call.transcript.map((item, idx) => (
                            <div key={idx} className={`transcript-bubble ${item.role}`}>
                              <div className="transcript-bubble-header">
                                {item.role === "user" ? "Customer" : "AI Receptionist"}
                              </div>
                              <div>{item.message}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: "var(--faint)", fontStyle: "italic", fontSize: "13px", padding: "10px 0" }}>
                          Transcript not yet available or call disconnected prior to speech.
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── TAB 3: ACTIVITY TIMELINE ── */}
                {drawerTab === "timeline" && (
                  <div className="detail-card">
                    <div className="detail-card-title">
                      <Clock size={15} color="#38bdf8" /> Lead Activity Timeline
                    </div>
                    {leadDetails.timeline && leadDetails.timeline.length > 0 ? (
                      <div className="timeline-list">
                        {leadDetails.timeline.map((act) => {
                          let bulletType = "default";
                          if (act.event_type.includes("appointment")) bulletType = "appointment";
                          else if (act.event_type.includes("call")) bulletType = "call";
                          else if (act.event_type.includes("status")) bulletType = "status";

                          return (
                            <div key={act.id} className="timeline-item">
                              <div className={`timeline-bullet ${bulletType}`} />
                              <div className="timeline-content">
                                <div className="timeline-header">
                                  <span className="timeline-title">{act.title}</span>
                                  <span className="timeline-time">{formatDateTime(act.created_at)}</span>
                                </div>
                                {act.description && <span className="timeline-desc">{act.description}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: "var(--faint)", fontStyle: "italic", fontSize: "13px" }}>
                        No events recorded in the timeline yet.
                      </div>
                    )}

                    {/* Add Custom Note to Timeline */}
                    <form onSubmit={handleAddQuickNote} className="quick-note-box">
                      <input
                        type="text"
                        placeholder="Add an internal note or follow-up note to timeline..."
                        value={quickNoteText}
                        onChange={(e) => setQuickNoteText(e.target.value)}
                        disabled={submittingNote}
                      />
                      <button type="submit" className="btn primary" disabled={submittingNote || !quickNoteText.trim()}>
                        <Send size={13} />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Edit Lead Modal ── */}
      {editingLead && (
        <div className="modal-overlay" onClick={handleCloseEdit}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Lead — {editingLead.lead_number}</h3>
              <button className="drawer-close-btn" onClick={handleCloseEdit}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Lead Status</label>
                  <select
                    value={editForm.lead_status}
                    onChange={(e) => setEditForm({ ...editForm, lead_status: e.target.value })}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Appointment Status</label>
                  <select
                    value={editForm.appointment_status}
                    onChange={(e) => setEditForm({ ...editForm, appointment_status: e.target.value })}
                  >
                    <option value="Not Booked">Not Booked</option>
                    <option value="Pending">Pending</option>
                    <option value="Booked">Booked</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    id="chk-followup"
                    checked={editForm.follow_up_required}
                    onChange={(e) => setEditForm({ ...editForm, follow_up_required: e.target.checked })}
                  />
                  <label htmlFor="chk-followup" style={{ cursor: "pointer", margin: 0 }}>
                    Follow-up Required
                  </label>
                </div>

                {editForm.follow_up_required && (
                  <div className="form-group">
                    <label>Follow-up Date</label>
                    <input
                      type="date"
                      value={editForm.follow_up_date}
                      onChange={(e) => setEditForm({ ...editForm, follow_up_date: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Internal Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Enter notes about customer requirements or follow-up..."
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn" onClick={handleCloseEdit} disabled={savingEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
