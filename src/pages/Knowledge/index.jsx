import { useEffect, useState, useRef } from "react";
import Badge from "../../components/ui/Badge.jsx";
import knowledgeService from "../../services/knowledge.service.js";
import UploadKnowledgeModal from "../../components/modals/UploadKnowledgeModal.jsx";
import ViewKnowledgeModal from "../../components/modals/ViewKnowledgeModal.jsx";

export default function Knowledge() {
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
      const data = query ? await knowledgeService.search(query) : await knowledgeService.getAll();
      setDocs(data || []);
      // Remove any selected IDs that no longer exist
      if (data && data.length) {
        const validIds = new Set(data.map((d) => d.id));
        setSelectedDocIds((prev) => prev.filter((id) => validIds.has(id)));
      } else {
        setSelectedDocIds([]);
      }
    } catch (err) {
      console.error("Failed to load knowledge documents:", err);
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
        `Are you sure you want to delete ${count} selected document${count > 1 ? "s" : ""}? This will permanently remove them and delete all their vector chunks from the Knowledge Base.`
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
    if (fileOrData instanceof File) {
      await knowledgeService.uploadFile(fileOrData, meta);
    } else {
      await knowledgeService.create({ ...fileOrData, ...meta });
    }
    await fetchDocs(searchQuery);
  };

  return (
    <section id="knowledge" className="page active">
      <div className="header">
        <div>
          <h1 className="title">Knowledge Base</h1>
          <p className="subtitle">
            Information the AI receptionist uses while answering inbound callers
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {selectedDocIds.length > 0 && (
            <button
              className="btn btn-sm danger"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              style={{ padding: "8px 16px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}
            >
              {isBulkDeleting ? "Deleting..." : `🗑️ Delete Selected (${selectedDocIds.length})`}
            </button>
          )}

          <button
            className="btn primary"
            onClick={() => setIsUploadModalOpen(true)}
          >
            + Upload Document
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "20px", textAlign: "center", padding: "32px 20px" }}>
        <div style={{ fontSize: "40px" }}>📚</div>
        <h3 style={{ marginTop: "10px", color: "var(--heading)", fontFamily: "var(--font-heading)", fontSize: "18px" }}>Upload Company Knowledge</h3>
        <p style={{ color: "var(--muted)", margin: "8px auto 14px", maxWidth: "480px", fontSize: "13.5px" }}>
          Upload PDF manuals, clinical guidelines, pricing sheets, and FAQ documents. The AI automatically chunks and indexes them for real-time RAG answers.
        </p>
        <button
          className="btn primary"
          onClick={() => setIsUploadModalOpen(true)}
        >
          Choose Files
        </button>
      </div>

      {/* Search Bar & Multi-Select Action Bar */}
      <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input
            type="text"
            className="search"
            placeholder="🔍 Search documents or extracted text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          {searchQuery && (
            <button
              className="btn"
              style={{ padding: "8px 14px", fontSize: "13px" }}
              onClick={() => setSearchQuery("")}
            >
              Clear
            </button>
          )}
        </div>

        {/* Dynamic Bulk Selection Action Toolbar */}
        {selectedDocIds.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
              padding: "10px 16px",
              background: "rgba(2, 132, 199, 0.08)",
              border: "1px solid rgba(2, 132, 199, 0.25)",
              borderRadius: "var(--radius-md)",
              animation: "fadeIn 0.2s ease-in-out"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--accent)" }}>
                ✓ {selectedDocIds.length} of {docs.length} selected
              </span>
              <button
                className="btn btn-sm"
                onClick={() => setSelectedDocIds([])}
              >
                Clear Selection
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <button
                className="btn btn-sm success"
                disabled={isBulkUpdating}
                onClick={() => handleBulkToggleUsage("Active")}
              >
                ⚡ Activate Selected
              </button>

              <button
                className="btn btn-sm"
                disabled={isBulkUpdating}
                onClick={() => handleBulkToggleUsage("Inactive")}
              >
                ⏸️ Deactivate Selected
              </button>

              <button
                className="btn btn-sm danger"
                disabled={isBulkDeleting}
                onClick={handleBulkDelete}
              >
                {isBulkDeleting ? "Deleting..." : `🗑️ Delete Selected (${selectedDocIds.length})`}
              </button>
            </div>
          </div>
        )}
      </div>

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
                  style={{
                    cursor: "pointer",
                    width: "16px",
                    height: "16px",
                    accentColor: "var(--accent)",
                    verticalAlign: "middle"
                  }}
                  title={allSelected ? "Deselect All" : "Select All"}
                />
              </th>
              <th>Document</th>
              <th>Type</th>
              <th>Scope</th>
              <th>Doc Type</th>
              <th>Chunks</th>
              <th>AI Usage</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  Loading knowledge base...
                </td>
              </tr>
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                  No knowledge documents found matching your search.
                </td>
              </tr>
            ) : (
              docs.map((doc) => {
                const isSelected = selectedDocIds.includes(doc.id);
                return (
                  <tr
                    key={doc.id}
                    style={{
                      backgroundColor: isSelected ? "rgba(2, 132, 199, 0.05)" : undefined,
                      transition: "background-color 0.15s ease"
                    }}
                  >
                    <td style={{ width: "42px", textAlign: "center", padding: "12px 8px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectDoc(doc.id)}
                        style={{
                          cursor: "pointer",
                          width: "16px",
                          height: "16px",
                          accentColor: "var(--accent)",
                          verticalAlign: "middle"
                        }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: "700", color: isSelected ? "var(--accent)" : "var(--heading)" }}>
                        {doc.title}
                      </div>
                      {doc.content && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--muted)",
                            marginTop: "2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "340px"
                          }}
                        >
                          {doc.content}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ textTransform: "uppercase", fontSize: "12px", fontWeight: "700", color: "var(--fg)" }}>
                        {doc.file_type || "TXT"}
                      </span>
                    </td>
                    <td>
                      <Badge color={doc.scope === "superadmin_assistant" ? "purple" : "blue"}>
                        {doc.scope === "superadmin_assistant" ? "Super Admin" : "Organization"}
                      </Badge>
                    </td>
                    <td>
                      <Badge color={doc.document_type === "SCRIPT" ? "orange" : "teal"}>
                        {doc.document_type || "RAG"}
                      </Badge>
                    </td>
                    <td>{doc.chunks ?? 0}</td>
                    <td>
                      <Badge color={doc.ai_usage === "Inactive" ? "gray" : "green"}>
                        {doc.ai_usage || "Active"}
                      </Badge>
                    </td>
                    <td>
                      <Badge color={doc.status === "Pending" ? "yellow" : "green"}>
                        {doc.status || "Indexed"}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          className={`btn btn-sm ${doc.ai_usage === "Active" ? "" : "primary"}`}
                          style={doc.ai_usage === "Active" ? { background: "#2a3441", color: "rgba(244, 245, 243, 0.8)" } : {}}
                          onClick={async () => {
                            try {
                              const nextUsage = doc.ai_usage === "Active" ? "Inactive" : "Active";
                              await knowledgeService.update(doc.id, { ai_usage: nextUsage });
                              fetchDocs(searchQuery);
                            } catch (err) {
                              console.error("Toggle active status failed", err);
                              alert("Failed to toggle RAG active status: " + err.message);
                            }
                          }}
                        >
                          {doc.ai_usage === "Active" ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            setSelectedDocToView(doc);
                            setIsViewModalOpen(true);
                          }}
                        >
                          View
                        </button>

                        <button
                          className="btn btn-sm"
                          onClick={async () => {
                            try {
                              await knowledgeService.downloadFile(doc.id, doc.title, doc.file_type);
                            } catch (err) {
                              console.error("Download failed", err);
                              alert("Failed to download document: " + err.message);
                            }
                          }}
                        >
                          📥 Download
                        </button>

                        <button
                          className="btn btn-sm danger"
                          onClick={async () => {
                            try {
                              if (window.confirm("Are you sure you want to delete this document?")) {
                                await knowledgeService.remove(doc.id);
                                fetchDocs(searchQuery);
                              }
                            } catch (err) {
                              console.error("Delete failed", err);
                              alert("Failed to delete document: " + err.message);
                            }
                          }}
                        >
                          Delete
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

      <UploadKnowledgeModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadDoc}
        isSuperAdmin={true /* TODO: wire from auth context */}
      />
      
      <ViewKnowledgeModal 
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        doc={selectedDocToView}
      />
    </section>
  );
}
