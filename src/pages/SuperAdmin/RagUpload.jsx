import { useEffect, useState, useRef } from "react";
import knowledgeService from "../../services/knowledge.service.js";
import UploadKnowledgeModal from "../../components/modals/UploadKnowledgeModal.jsx";
import ViewKnowledgeModal from "../../components/modals/ViewKnowledgeModal.jsx";
import { BookOpen, Upload, Trash2, Search, Download, Eye, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

export default function SuperAdminRagUpload() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedDocToView, setSelectedDocToView] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const selectAllCheckboxRef = useRef(null);

  const fetchDocs = async (query = "") => {
    try {
      setLoading(true);
      // Fetch specifically for Super Admin AI assistant & Organization 1
      const data = query 
        ? await knowledgeService.search(query) 
        : await knowledgeService.getAll({ target_org_id: 1 });
      setDocs(data || []);
      if (data && data.length) {
        const validIds = new Set(data.map((d) => d.id));
        setSelectedDocIds((prev) => prev.filter((id) => validIds.has(id)));
      } else {
        setSelectedDocIds([]);
      }
    } catch (err) {
      console.error("Failed to load RAG documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs(searchQuery);
  }, [searchQuery]);

  const allSelected = docs.length > 0 && selectedDocIds.length === docs.length;
  const someSelected = selectedDocIds.length > 0 && selectedDocIds.length < docs.length;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(docs.map((d) => d.id));
    }
  };

  const toggleSelectDoc = (id) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedDocIds.length) return;
    const count = selectedDocIds.length;
    if (
      !window.confirm(
        `Are you sure you want to delete ${count} selected document${count > 1 ? "s" : ""}? This will permanently remove them from the Landing & SuperAdmin AI assistant.`
      )
    ) {
      return;
    }

    try {
      setIsBulkDeleting(true);
      await Promise.allSettled(
        selectedDocIds.map((id) => knowledgeService.remove(id))
      );
      setSelectedDocIds([]);
      await fetchDocs(searchQuery);
    } catch (err) {
      console.error("Bulk delete failed:", err);
      alert("Failed to delete some documents: " + err.message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkToggleUsage = async (targetUsage) => {
    if (!selectedDocIds.length) return;
    try {
      setIsBulkUpdating(true);
      await Promise.allSettled(
        selectedDocIds.map((id) =>
          knowledgeService.update(id, { ai_usage: targetUsage })
        )
      );
      setSelectedDocIds([]);
      await fetchDocs(searchQuery);
    } catch (err) {
      console.error("Bulk status update failed:", err);
      alert(`Failed to ${targetUsage.toLowerCase()} selected documents: ` + err.message);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleUploadDoc = async (fileOrData, meta = {}) => {
    // Force target_org_id: 1 and scope: superadmin_assistant
    const uploadMeta = {
      ...meta,
      target_org_id: 1,
      scope: meta.scope || "superadmin_assistant"
    };
    if (fileOrData instanceof File) {
      await knowledgeService.uploadFile(fileOrData, uploadMeta);
    } else {
      await knowledgeService.create({ ...fileOrData, ...uploadMeta });
    }
    await fetchDocs(searchQuery);
  };

  return (
    <div style={{ padding: "24px", color: "#fff" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ background: "rgba(124, 104, 255, 0.15)", border: "1px solid rgba(124, 104, 255, 0.3)", borderRadius: "8px", padding: "8px", display: "flex" }}>
              <Sparkles size={22} color="#a78bfa" />
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
              Platform AI RAG Knowledge Upload
            </h1>
          </div>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px", maxWidth: "680px" }}>
            Upload and manage RAG documents that directly train the AI Assistant on both the 
            <strong style={{ color: "#a78bfa" }}> Landing Page</strong> and 
            <strong style={{ color: "#a78bfa" }}> Super Admin Dashboard</strong>.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          style={{
            background: "linear-gradient(135deg, #7c68ff 0%, #6366f1 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 20px",
            fontWeight: "600",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(124, 104, 255, 0.35)",
            transition: "transform 0.15s ease"
          }}
        >
          <Upload size={18} />
          <span>+ Upload Platform RAG</span>
        </button>
      </div>

      {/* RAG Knowledge Quick Dropzone Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.5) 100%)",
          border: "1px dashed rgba(124, 104, 255, 0.4)",
          borderRadius: "12px",
          padding: "28px 20px",
          textAlign: "center",
          marginBottom: "24px"
        }}
      >
        <BookOpen size={40} color="#a78bfa" style={{ marginBottom: "10px" }} />
        <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#f1f5f9", margin: "0 0 6px 0" }}>
          Train Landing & SuperAdmin AI Assistant
        </h3>
        <p style={{ color: "#94a3b8", fontSize: "13.5px", maxWidth: "520px", margin: "0 auto 16px auto", lineHeight: "1.5" }}>
          Upload PDF manuals, feature guides, pricing documents, or company FAQs. The system automatically chunks and indexes vectors for real-time customer and super admin queries.
        </p>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          style={{
            background: "rgba(124, 104, 255, 0.2)",
            color: "#c4b5fd",
            border: "1px solid rgba(124, 104, 255, 0.4)",
            borderRadius: "6px",
            padding: "8px 18px",
            fontWeight: "600",
            fontSize: "13.5px",
            cursor: "pointer"
          }}
        >
          Select Files to Upload
        </button>
      </div>

      {/* Search & Bulk Action Toolbar */}
      <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={16} color="#64748b" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search platform documents or extracted RAG context..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 38px",
                background: "#0f172a",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "14px",
                outline: "none"
              }}
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                background: "#1e293b",
                color: "#94a3b8",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "9px 16px",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Dynamic Bulk Action Bar */}
        {selectedDocIds.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              background: "rgba(124, 104, 255, 0.12)",
              border: "1px solid rgba(124, 104, 255, 0.3)",
              borderRadius: "8px"
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#c4b5fd" }}>
              ✓ {selectedDocIds.length} of {docs.length} selected
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleBulkToggleUsage("Active")}
                disabled={isBulkUpdating}
                style={{
                  background: "#166534",
                  color: "#86efac",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                ⚡ Activate Selected
              </button>
              <button
                onClick={() => handleBulkToggleUsage("Inactive")}
                disabled={isBulkUpdating}
                style={{
                  background: "#334155",
                  color: "#cbd5e1",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                ⏸️ Deactivate Selected
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                style={{
                  background: "#991b1b",
                  color: "#fca5a5",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                {isBulkDeleting ? "Deleting..." : `🗑️ Delete (${selectedDocIds.length})`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Documents Data Table */}
      <div
        style={{
          background: "#0f172a",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "10px",
          overflow: "hidden"
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
          <thead>
            <tr style={{ background: "#1e293b", color: "#94a3b8", borderBottom: "1px solid #334155" }}>
              <th style={{ width: "42px", textAlign: "center", padding: "12px 8px" }}>
                <input
                  type="checkbox"
                  ref={selectAllCheckboxRef}
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  style={{ cursor: "pointer", accentColor: "#7c68ff" }}
                />
              </th>
              <th style={{ padding: "12px 14px", fontWeight: "600" }}>Document Title</th>
              <th style={{ padding: "12px 14px", fontWeight: "600" }}>Format</th>
              <th style={{ padding: "12px 14px", fontWeight: "600" }}>Scope</th>
              <th style={{ padding: "12px 14px", fontWeight: "600" }}>Chunks</th>
              <th style={{ padding: "12px 14px", fontWeight: "600" }}>AI Usage</th>
              <th style={{ padding: "12px 14px", fontWeight: "600" }}>Status</th>
              <th style={{ padding: "12px 14px", fontWeight: "600", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                  Loading Platform RAG knowledge base...
                </td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "36px", color: "#94a3b8" }}>
                  No Platform RAG documents found. Click "+ Upload Platform RAG" above to add your first document.
                </td>
              </tr>
            ) : (
              docs.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <tr
                    key={doc.id}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      background: isSelected ? "rgba(124, 104, 255, 0.08)" : "transparent"
                    }}
                  >
                    <td style={{ textAlign: "center", padding: "12px 8px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectDoc(doc.id)}
                        style={{ cursor: "pointer", accentColor: "#7c68ff" }}
                      />
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: "600", color: "#f8fafc" }}>{doc.title}</div>
                      {doc.content && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "2px",
                            maxWidth: "320px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis"
                          }}
                        >
                          {doc.content}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          background: "#1e293b",
                          color: "#cbd5e1",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "700",
                          textTransform: "uppercase"
                        }}
                      >
                        {doc.file_type || "TXT"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          background: "rgba(124, 104, 255, 0.15)",
                          color: "#c4b5fd",
                          border: "1px solid rgba(124, 104, 255, 0.3)",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}
                      >
                        Platform / Landing AI
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#94a3b8" }}>{doc.chunks ?? 0}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          background: doc.ai_usage === "Inactive" ? "#334155" : "#166534",
                          color: doc.ai_usage === "Inactive" ? "#94a3b8" : "#86efac",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}
                      >
                        {doc.ai_usage || "Active"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          color: doc.status === "Pending" ? "#fde047" : "#4ade80",
                          fontSize: "12px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <CheckCircle2 size={14} />
                        {doc.status || "Indexed"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button
                          onClick={async () => {
                            try {
                              const nextUsage = doc.ai_usage === "Active" ? "Inactive" : "Active";
                              await knowledgeService.update(doc.id, { ai_usage: nextUsage });
                              fetchDocs(searchQuery);
                            } catch (err) {
                              alert("Failed to toggle status: " + err.message);
                            }
                          }}
                          style={{
                            background: doc.ai_usage === "Active" ? "#334155" : "#1e293b",
                            color: "#cbd5e1",
                            border: "1px solid #475569",
                            borderRadius: "6px",
                            padding: "4px 10px",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                        >
                          {doc.ai_usage === "Active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDocToView(doc);
                            setIsViewModalOpen(true);
                          }}
                          style={{
                            background: "#1e293b",
                            color: "#cbd5e1",
                            border: "1px solid #475569",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                          title="View document details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await knowledgeService.downloadFile(doc.id, doc.title, doc.file_type);
                            } catch (err) {
                              alert("Download failed: " + err.message);
                            }
                          }}
                          style={{
                            background: "#1e293b",
                            color: "#cbd5e1",
                            border: "1px solid #475569",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                          title="Download file"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm("Delete this document from Platform RAG?")) {
                              try {
                                await knowledgeService.remove(doc.id);
                                fetchDocs(searchQuery);
                              } catch (err) {
                                alert("Delete failed: " + err.message);
                              }
                            }
                          }}
                          style={{
                            background: "#7f1d1d",
                            color: "#fca5a5",
                            border: "none",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "12px",
                            cursor: "pointer"
                          }}
                          title="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      <UploadKnowledgeModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadDoc}
        isSuperAdmin={true}
      />

      {/* View Modal */}
      <ViewKnowledgeModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        doc={selectedDocToView}
      />
    </div>
  );
}
