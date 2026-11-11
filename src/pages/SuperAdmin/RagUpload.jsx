import { useEffect, useState, useRef } from "react";
import knowledgeService from "../../services/knowledge.service.js";
import UploadKnowledgeModal from "../../components/modals/UploadKnowledgeModal.jsx";
import ViewKnowledgeModal from "../../components/modals/ViewKnowledgeModal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { BookOpen, Upload, Trash2, Search, Download, Eye, Sparkles, CheckCircle2 } from "lucide-react";

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
    <section id="super-admin-rag-upload" className="page active">
      {/* Header */}
      <div className="header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div
              style={{
                background: "rgba(124, 104, 255, 0.12)",
                border: "1px solid rgba(124, 104, 255, 0.25)",
                borderRadius: "8px",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Sparkles size={22} color="#7c68ff" />
            </div>
            <h1 className="title" style={{ margin: 0, color: "var(--heading, #0f172a)" }}>
              Platform AI RAG Knowledge Upload
            </h1>
          </div>
          <p className="subtitle" style={{ margin: 0, maxWidth: "680px" }}>
            Upload and manage RAG documents that directly train the AI Assistant on both the{" "}
            <strong style={{ color: "#7c68ff" }}>Landing Page</strong> and{" "}
            <strong style={{ color: "#7c68ff" }}>Super Admin Dashboard</strong>.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="btn primary"
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
        className="card"
        style={{
          background: "var(--panel-card, #ffffff)",
          border: "1px dashed rgba(124, 104, 255, 0.4)",
          borderRadius: "12px",
          padding: "28px 20px",
          textAlign: "center",
          marginBottom: "24px",
          boxShadow: "var(--card-shadow)"
        }}
      >
        <BookOpen size={40} color="#7c68ff" style={{ marginBottom: "10px" }} />
        <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--heading)", margin: "0 0 6px 0", fontFamily: "var(--font-heading)" }}>
          Train Landing & SuperAdmin AI Assistant
        </h3>
        <p style={{ color: "var(--muted)", fontSize: "13.5px", maxWidth: "520px", margin: "0 auto 16px auto", lineHeight: "1.5" }}>
          Upload PDF manuals, feature guides, pricing documents, or company FAQs. The system automatically chunks and indexes vectors for real-time customer and super admin queries.
        </p>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="btn"
          style={{
            background: "rgba(124, 104, 255, 0.12)",
            color: "#7c68ff",
            border: "1px solid rgba(124, 104, 255, 0.35)",
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
            <Search size={16} color="var(--muted, #64748b)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search platform documents or extracted RAG context..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 38px",
                background: "var(--panel, #ffffff)",
                border: "1px solid var(--line, #e2e8f0)",
                borderRadius: "8px",
                color: "var(--fg, #0f172a)",
                fontSize: "14px",
                outline: "none",
                boxShadow: "var(--card-shadow)"
              }}
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="btn"
              style={{
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
              background: "rgba(124, 104, 255, 0.1)",
              border: "1px solid rgba(124, 104, 255, 0.25)",
              borderRadius: "8px"
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#7c68ff" }}>
              ✓ {selectedDocIds.length} of {docs.length} selected
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleBulkToggleUsage("Active")}
                disabled={isBulkUpdating}
                className="btn btn-sm success"
                style={{ fontSize: "12px", fontWeight: "600" }}
              >
                ⚡ Activate Selected
              </button>
              <button
                onClick={() => handleBulkToggleUsage("Inactive")}
                disabled={isBulkUpdating}
                className="btn btn-sm"
                style={{ fontSize: "12px", fontWeight: "600" }}
              >
                ⏸️ Deactivate Selected
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="btn btn-sm danger"
                style={{ fontSize: "12px", fontWeight: "600" }}
              >
                {isBulkDeleting ? "Deleting..." : `🗑️ Delete (${selectedDocIds.length})`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Documents Data Table */}
      <div className="table">
        <table>
          <thead>
            <tr>
              <th style={{ width: "42px", textAlign: "center", padding: "12px 8px" }}>
                <input
                  type="checkbox"
                  ref={selectAllCheckboxRef}
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  style={{ cursor: "pointer", accentColor: "#7c68ff" }}
                />
              </th>
              <th>Document Title</th>
              <th>Format</th>
              <th>Scope</th>
              <th>Chunks</th>
              <th>AI Usage</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
                  Loading Platform RAG knowledge base...
                </td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
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
                      backgroundColor: isSelected ? "rgba(124, 104, 255, 0.08)" : undefined
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
                    <td>
                      <div style={{ fontWeight: "600", color: isSelected ? "#7c68ff" : "var(--heading)" }}>
                        {doc.title}
                      </div>
                      {doc.content && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--muted)",
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
                    <td>
                      <span
                        style={{
                          background: "var(--line-light)",
                          color: "var(--fg)",
                          border: "1px solid var(--line)",
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
                    <td>
                      <span
                        style={{
                          background: "rgba(124, 104, 255, 0.12)",
                          color: "#7c68ff",
                          border: "1px solid rgba(124, 104, 255, 0.25)",
                          padding: "3px 9px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600"
                        }}
                      >
                        Platform / Landing AI
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{doc.chunks ?? 0}</td>
                    <td>
                      <Badge color={doc.ai_usage === "Inactive" ? "gray" : "green"}>
                        {doc.ai_usage || "Active"}
                      </Badge>
                    </td>
                    <td>
                      {doc.status === "Pending" ? (
                        <Badge color="yellow">⏳ Pending</Badge>
                      ) : (
                        <Badge color="green">
                          <CheckCircle2 size={13} style={{ marginRight: "3px" }} />
                          {doc.status || "Indexed"}
                        </Badge>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
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
                          className="btn btn-sm"
                          style={{
                            fontSize: "12px",
                            padding: "4px 10px"
                          }}
                        >
                          {doc.ai_usage === "Active" ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDocToView(doc);
                            setIsViewModalOpen(true);
                          }}
                          className="btn btn-sm"
                          style={{ padding: "4px 8px" }}
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
                          className="btn btn-sm"
                          style={{ padding: "4px 8px" }}
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
                          className="btn btn-sm danger"
                          style={{ padding: "4px 8px" }}
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
    </section>
  );
}
