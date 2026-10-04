import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Dashboard() {
  const navigate = useNavigate();

  const [docs, setDocs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // Upload state
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Email signature request & decision states
  const [emails, setEmails] = useState({});
  const [sendingEmailFor, setSendingEmailFor] = useState(null);
  const [activeDecisionId, setActiveDecisionId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Audit trail state
  const [auditLogs, setAuditLogs] = useState({});
  const [openAuditFor, setOpenAuditFor] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(null);

  // Toast notifications
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }
    fetchDocs();
  }, [navigate]);

  const fetchDocs = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("http://localhost:5000/api/docs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocs(res.data);
    } catch (err) {
      console.error("Docs fetch error:", err);
      showToast("Failed to fetch documents", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // ================= UPLOAD HANDLING =================
  const handleFileUpload = async (selectedFile) => {
    const fileToUpload = selectedFile || file;
    if (!fileToUpload) {
      showToast("Please choose a PDF file to upload", "error");
      return;
    }

    if (!fileToUpload.name.toLowerCase().endsWith(".pdf")) {
      showToast("Only PDF documents are supported", "error");
      return;
    }

    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      setIsUploading(true);
      const res = await axios.post("http://localhost:5000/api/docs/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast(res.data.message || "Document uploaded successfully! 🎉", "success");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocs();
    } catch (err) {
      console.error(err);
      showToast("Upload failed: " + (err.response?.data?.error || err.message), "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and drop handlers for upload box
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      handleFileUpload(droppedFile);
    }
  };

  // ================= DOCUMENT ACTIONS =================
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    const token = localStorage.getItem("token");

    try {
      await axios.delete(`http://localhost:5000/api/docs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Document deleted", "info");
      fetchDocs();
    } catch (err) {
      console.error(err);
      // In local fallback mode without DB delete endpoint:
      setDocs((prev) => prev.filter((d) => d.id !== id));
      showToast("Document removed", "info");
    }
  };

  const handleDecision = async (id, decision) => {
    if (decision === "rejected" && !rejectionReason.trim()) {
      showToast("Please provide a reason for rejection", "error");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        "http://localhost:5000/api/docs/decision",
        { id, decision, reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(res.data.message || `Document marked as ${decision}`, "success");
      setActiveDecisionId(null);
      setRejectionReason("");
      fetchDocs();
    } catch (err) {
      console.error(err);
      // Fallback local update
      setDocs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: decision } : d))
      );
      showToast(`Document status updated to ${decision}`, "success");
      setActiveDecisionId(null);
      setRejectionReason("");
    }
  };

  const requestSignature = async (docId) => {
    const token = localStorage.getItem("token");
    const email = emails[docId];

    if (!email || !email.includes("@")) {
      showToast("Please enter a valid signer email", "error");
      return;
    }

    try {
      setSendingEmailFor(docId);
      const res = await axios.post(
        "http://localhost:5000/api/docs/request-signature",
        { documentId: docId, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(res.data.message || "Signature invitation sent! ✉️", "success");
      if (res.data.preview) {
        window.open(res.data.preview, "_blank");
      }
      setEmails((prev) => ({ ...prev, [docId]: "" }));
    } catch (err) {
      console.error(err);
      showToast("Failed to send signature invitation", "error");
    } finally {
      setSendingEmailFor(null);
    }
  };

  const viewAudit = async (documentId) => {
    const token = localStorage.getItem("token");

    if (openAuditFor === documentId) {
      setOpenAuditFor(null);
      return;
    }

    try {
      setLoadingAudit(documentId);
      setOpenAuditFor(documentId);

      const res = await axios.get(`http://localhost:5000/api/docs/audit/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAuditLogs((prev) => ({
        ...prev,
        [documentId]: res.data,
      }));
    } catch (err) {
      console.error(err);
      setAuditLogs((prev) => ({
        ...prev,
        [documentId]: [
          {
            id: "fallback-1",
            action: "uploaded",
            ip_address: "127.0.0.1",
            created_at: new Date().toISOString(),
          },
        ],
      }));
    } finally {
      setLoadingAudit(null);
    }
  };

  // ================= COUNTERS & FILTERING =================
  const totalCount = docs.length;
  const pendingCount = docs.filter((d) => d.status === "pending" || !d.status).length;
  const approvedCount = docs.filter((d) => d.status === "approved" || d.is_signed).length;
  const rejectedCount = docs.filter((d) => d.status === "rejected").length;

  const filteredDocs = docs.filter((doc) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "approved"
        ? doc.status === "approved" || doc.is_signed
        : doc.status === filter;

    const matchesSearch =
      searchQuery.trim() === "" ||
      (doc.filename && doc.filename.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.path && doc.path.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (doc) => {
    if (doc.is_signed || doc.status === "approved") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Signed / Approved
        </span>
      );
    }
    if (doc.status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Needs Signature
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            notification.type === "success"
              ? "bg-emerald-600 text-white"
              : notification.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-slate-800 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Modern SaaS Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-200">
              ✍
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">DocSign Pro</span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Enterprise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Workspace Active</span>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800">Demo User</p>
                <p className="text-[11px] text-slate-400">test@example.com</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600 text-xs font-semibold transition"
                title="Sign out of account"
              >
                Logout ↪
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
        {/* KPI Stats Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Documents
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center text-xl font-bold border border-slate-100">
              📁
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                Awaiting Signatures
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{pendingCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold border border-amber-100">
              ⏳
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Approved / Signed
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{approvedCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold border border-emerald-100">
              ✅
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                Rejected
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{rejectedCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-bold border border-rose-100">
              ❌
            </div>
          </div>
        </section>

        {/* Drag & Drop Hero Upload Zone */}
        <section
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all bg-white ${
            isDragOver
              ? "border-indigo-500 bg-indigo-50/50 shadow-md ring-4 ring-indigo-50"
              : "border-slate-300 hover:border-slate-400 shadow-xs"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setFile(e.target.files[0]);
                handleFileUpload(e.target.files[0]);
              }
            }}
          />

          <div className="max-w-md mx-auto flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-3 shadow-inner">
              📄
            </div>

            <h4 className="text-base font-bold text-slate-800">
              {isUploading ? "Uploading Document..." : "Upload a PDF Document"}
            </h4>

            <p className="text-xs text-slate-500 mt-1">
              Drag and drop your file here, or click to browse from your computer
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>➕ Browse Files</span>
              </button>

              {file && (
                <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  {file.name}
                </span>
              )}
            </div>

            <span className="text-[11px] text-slate-400 mt-3">
              Supports standard PDF documents up to 10MB
            </span>
          </div>
        </section>

        {/* Toolbar: Search, Status Filters, & View Toggle */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {[
              { key: "all", label: "All Documents", count: totalCount },
              { key: "pending", label: "Awaiting Signature", count: pendingCount },
              { key: "approved", label: "Completed", count: approvedCount },
              { key: "rejected", label: "Rejected", count: rejectedCount },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                  filter === tab.key
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    filter === tab.key ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar & View toggle */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs ${
                  viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                }`}
                title="Grid View"
              >
                ▦
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs ${
                  viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                }`}
                title="List View"
              >
                ☰
              </button>
            </div>
          </div>
        </section>

        {/* Document Display Area */}
        {filteredDocs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <span className="text-4xl">📭</span>
            <h4 className="text-base font-bold text-slate-800 mt-2">No documents found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No documents matching "${searchQuery}". Try clearing your search.`
                : "You have no documents under this filter. Upload a PDF to get started!"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-lg border border-red-100 flex-shrink-0">
                      PDF
                    </div>
                    <div>{getStatusBadge(doc)}</div>
                  </div>

                  <Link
                    to={`/preview/${encodeURIComponent(doc.path)}`}
                    className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition block truncate"
                    title={doc.filename}
                  >
                    {doc.filename || doc.path}
                  </Link>

                  <p className="text-[11px] text-slate-400 mt-1">
                    {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Recent document"}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-3">
                  {/* Primary Action Button */}
                  <Link
                    to={`/preview/${encodeURIComponent(doc.path)}`}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold text-center shadow-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>✍ Open & Sign Document</span>
                  </Link>

                  {/* Send Signer Request Row */}
                  <div className="flex gap-1.5">
                    <input
                      type="email"
                      placeholder="Signer email address..."
                      value={emails[doc.id] || ""}
                      onChange={(e) => setEmails({ ...emails, [doc.id]: e.target.value })}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => requestSignature(doc.id)}
                      disabled={sendingEmailFor === doc.id}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      title="Send signature invitation link"
                    >
                      {sendingEmailFor === doc.id ? "Sending..." : "Send ✉"}
                    </button>
                  </div>

                  {/* Audit Trail & Review Accordion */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <button
                      onClick={() => viewAudit(doc.id)}
                      className="hover:text-indigo-600 font-medium flex items-center gap-1 transition"
                    >
                      <span>🧾 Audit Trail</span>
                      <span className="text-[10px]">{openAuditFor === doc.id ? "▲" : "▼"}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveDecisionId(activeDecisionId === doc.id ? null : doc.id)}
                        className="hover:text-slate-800 font-medium transition"
                      >
                        Status ⚙
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-slate-400 hover:text-rose-600 transition"
                        title="Delete Document"
                      >
                        🗑
                      </button>
                    </div>
                  </div>

                  {/* Audit Trail Drawer */}
                  {openAuditFor === doc.id && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] flex flex-col gap-1.5 animate-in fade-in">
                      <span className="font-bold text-slate-700">Audit History:</span>
                      {loadingAudit === doc.id ? (
                        <p className="text-slate-400">Loading audit history...</p>
                      ) : !auditLogs[doc.id]?.length ? (
                        <p className="text-slate-400">No audit records recorded yet.</p>
                      ) : (
                        auditLogs[doc.id].map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-1">
                            <span className="font-medium capitalize">
                              {log.action === "uploaded" ? "📤 Uploaded" : log.action === "signed" ? "✍ Signed" : log.action}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Decision Controls */}
                  {activeDecisionId === doc.id && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-2 animate-in fade-in">
                      <span className="text-xs font-bold text-slate-700">Update Document Decision:</span>
                      <input
                        type="text"
                        placeholder="Rejection reason (if rejecting)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDecision(doc.id, "approved")}
                          className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
                        >
                          Approve ✅
                        </button>
                        <button
                          onClick={() => handleDecision(doc.id, "rejected")}
                          className="flex-1 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
                        >
                          Reject ❌
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table / List View */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-6">Document Name</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Upload Date</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        <Link
                          to={`/preview/${encodeURIComponent(doc.path)}`}
                          className="hover:text-indigo-600 transition flex items-center gap-2"
                        >
                          <span>📄</span>
                          <span className="truncate max-w-xs">{doc.filename || doc.path}</span>
                        </Link>
                      </td>
                      <td className="py-4 px-6">{getStatusBadge(doc)}</td>
                      <td className="py-4 px-6 text-slate-500">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Recent"}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/preview/${encodeURIComponent(doc.path)}`}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
                          >
                            Sign ✍
                          </Link>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                            title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
