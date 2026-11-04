import { useState, useRef } from "react";

export default function UploadKnowledgeModal({ isOpen, onClose, onUpload, isSuperAdmin = false }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState("RAG");
  const [scope, setScope] = useState("organization");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select at least one file to upload.");
      return;
    }

    try {
      setUploading(true);
      for (const file of selectedFiles) {
        await onUpload(file, { scope, document_type: documentType });
      }
      setSelectedFiles([]);
      setDocumentType("RAG");
      setScope("organization");
      onClose();
    } catch (err) {
      console.error("Failed to upload knowledge files:", err);
      alert(`Upload failed: ${err.message || "Unknown error occurred"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Upload Knowledge Document</h2>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Document Type & Scope Selectors */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "13px",
                  background: "#fff",
                  color: "#111827",
                }}
              >
                <option value="RAG">📚 RAG Knowledge Base</option>
                <option value="SCRIPT">📝 AI Script</option>
              </select>
            </div>

            {isSuperAdmin && (
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                  Assign To
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "13px",
                    background: "#fff",
                    color: "#111827",
                  }}
                >
                  <option value="superadmin_assistant">🛡️ Super Admin AI Assistant</option>
                  <option value="organization">🏢 Organization Receptionist</option>
                </select>
              </div>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            multiple
            accept=".pdf,.txt,.md,.doc,.docx"
          />

          <div
            className="dropzone-box"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="dropzone-icon">📄</div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "6px" }}>
              Drop files here
            </h3>
            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}>
              Supported: PDF, TXT, Markdown. Multiple files allowed.
            </p>
            <button
              type="button"
              className="modal-btn-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse Files
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div style={{ marginTop: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <strong style={{ fontSize: "13px", color: "#1e293b" }}>Selected Files:</strong>
              <ul style={{ marginTop: "6px", paddingLeft: "20px", fontSize: "12px", color: "#475569" }}>
                {selectedFiles.map((file, idx) => (
                  <li key={idx}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                ))}
              </ul>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="modal-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="modal-btn-primary"
              onClick={handleUploadSubmit}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload & Index"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
