import knowledgeService from "../../services/knowledge.service.js";
import Badge from "../ui/Badge.jsx";

export default function ViewKnowledgeModal({ isOpen, onClose, doc }) {
  if (!isOpen || !doc) return null;

  const handleDownload = async () => {
    try {
      await knowledgeService.downloadFile(doc.id, doc.title, doc.file_type);
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download document: " + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: "800px", width: "90%" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">View Document: {doc.title}</h2>
          <button className="modal-close-btn" onClick={onClose} type="button">
            ×
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: "65vh", overflowY: "auto", padding: "16px 0" }}>
          <div style={{ marginBottom: "16px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <Badge color="blue">{doc.file_type || "TXT"}</Badge>
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>
              {doc.chunks ?? 0} Indexed RAG Chunks
            </span>
            <button
              type="button"
              className="btn primary btn-sm"
              onClick={handleDownload}
              style={{ marginLeft: "auto" }}
            >
              📥 Download File
            </button>
          </div>
          
          <div style={{ 
            background: "var(--line-light)", 
            padding: "20px", 
            borderRadius: "var(--radius-md)", 
            border: "1px solid var(--line)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: "13.5px",
            lineHeight: "1.6",
            color: "var(--fg)",
            fontFamily: "monospace",
            maxHeight: "420px",
            overflowY: "auto"
          }}>
            {doc.content || "No content extracted from this document."}
          </div>
        </div>

        <div className="modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            className="btn"
            onClick={handleDownload}
          >
            📥 Download
          </button>
          <button type="button" className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
