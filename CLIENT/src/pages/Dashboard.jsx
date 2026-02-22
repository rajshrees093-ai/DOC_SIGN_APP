import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("all");
  const [file, setFile] = useState(null);

  const [emails, setEmails] = useState({});
  const [auditLogs, setAuditLogs] = useState({});
  const [openAuditFor, setOpenAuditFor] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    const token = localStorage.getItem("token");

    try {
      const res = await axios.get("https://doc-sign-app.onrender.com/api/docs", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("DOCUMENTS:", res.data);
      setDocs(res.data);

    } catch (err) {
      console.error("Docs fetch error:", err);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Choose PDF first ❌");
      return;
    }

    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(
        "https://doc-sign-app.onrender.com/api/docs/upload",
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert(res.data.message || "Upload successful ✅");

      setFile(null);
      fetchDocs();

    } catch (err) {
      console.error(err);
      alert("Upload failed ❌");
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");

    try {
      await axios.delete(`https://doc-sign-app.onrender.com/api/docs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchDocs();

    } catch (err) {
      console.error(err);
      alert("Delete failed ❌");
    }
  };

  const handleDecision = async (id, decision) => {
    const token = localStorage.getItem("token");

    try {
      const res = await axios.post(
        "https://doc-sign-app.onrender.com/api/docs/decision",
        { id, decision, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(res.data.message);
      setReason("");
      fetchDocs();

    } catch (err) {
      console.error(err);
      alert("Decision failed ❌");
    }
  };

  const requestSignature = async (docId) => {
    const token = localStorage.getItem("token");
    const email = emails[docId];

    if (!email) {
      alert("Enter signer email ❌");
      return;
    }

    try {
      const res = await axios.post(
        "https://doc-sign-app.onrender.com/api/docs/request-signature",
        { documentId: docId, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(res.data.message);

      if (res.data.preview) {
        console.log("EMAIL PREVIEW:", res.data.preview);
        window.open(res.data.preview, "_blank");
      }

    } catch (err) {
      console.error(err);
      alert("Signature request failed ❌");
    }
  };

  const viewAudit = async (documentId) => {
    const token = localStorage.getItem("token");

    try {
      if (openAuditFor === documentId) {
        setOpenAuditFor(null);
        return;
      }

      setLoadingAudit(documentId);
      setOpenAuditFor(documentId);

      const res = await axios.get(
        `https://doc-sign-app.onrender.com/api/docs/audit/${documentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("AUDIT RESPONSE:", res.data);

      setAuditLogs(prev => ({
        ...prev,
        [documentId]: res.data,
      }));

    } catch (err) {
      console.error(err);
      alert("Failed to fetch audit logs ❌");
    } finally {
      setLoadingAudit(null);
    }
  };

  const getStatusColor = (status) => {
    if (status === "approved") return "text-green-600";
    if (status === "rejected") return "text-red-600";
    return "text-yellow-600";
  };

  const pendingCount = docs.filter(d => d.status === "pending").length;
  const approvedCount = docs.filter(d => d.status === "approved").length;
  const rejectedCount = docs.filter(d => d.status === "rejected").length;

  const filteredDocs = docs.filter((doc) => {
    if (filter === "all") return true;
    return doc.status === filter;
  });

  return (
    /* ✅ ONLY LINE CHANGED HERE */
    <div className="dashboard-container max-w-5xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">📄 Document Dashboard</h2>

      <div className="upload-row flex gap-2 mb-4 flex-wrap">
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />

        <button className="btn bg-blue-500 text-white px-4 py-2 rounded-lg" onClick={handleUpload}>
          Upload PDF ➕
        </button>
      </div>

      <div className="filters flex gap-2 mb-6 flex-wrap">
        {[
          { key: "all", label: `All (${docs.length})` },
          { key: "pending", label: `Pending (${pendingCount})` },
          { key: "approved", label: `Approved (${approvedCount})` },
          { key: "rejected", label: `Rejected (${rejectedCount})` },
        ].map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`btn btn-secondary px-4 py-2 rounded-lg border transition ${
              filter === btn.key ? "bg-blue-500 text-white" : ""
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {filteredDocs.length === 0 ? (
        <p>No documents found</p>
      ) : (
        <div className="doc-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="doc-card border rounded-xl p-4 shadow-sm bg-white">
              <a href={`/preview/${doc.path}`} className="doc-title font-semibold text-blue-600">
                {doc.filename}
              </a>

              <p className={`doc-meta font-medium ${getStatusColor(doc.status)}`}>
                Status: {doc.status}
              </p>

              <div className="actions-row flex flex-col gap-2 mt-2">
                <button className="btn btn-secondary" onClick={() => viewAudit(doc.id)}>
                  🧾 View Audit Trail
                </button>

                <input
                  className="small-input border rounded px-2 py-1 text-sm"
                  type="text"
                  placeholder="Signer email"
                  value={emails[doc.id] || ""}
                  onChange={(e) =>
                    setEmails({ ...emails, [doc.id]: e.target.value })
                  }
                />

                <button className="btn bg-blue-500 text-white px-3 py-1 rounded" onClick={() => requestSignature(doc.id)}>
                  📧 Request Signature
                </button>
              </div>

              {openAuditFor === doc.id && (
                <div className="audit-panel mt-2 text-sm bg-gray-50 p-2 rounded">
                  {loadingAudit === doc.id ? (
                    <p>Loading audit trail...</p>
                  ) : !auditLogs[doc.id]?.length ? (
                    <p>No audit records yet 📭</p>
                  ) : (
                    auditLogs[doc.id].map((log) => (
                      <div key={log.id}>
                        ✅ {log.action} | 🌐 {log.ip_address} | ⏱{" "}
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    ))
                  )}
                </div>
              )}

              {doc.status === "pending" && (
                <div style={{ marginTop: 8 }}>
                  <input
                    className="small-input border rounded px-2 py-1 text-sm w-full"
                    type="text"
                    placeholder="Rejection reason (optional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />

                  <div className="actions-row flex gap-2 mt-2">
                    <button className="btn bg-green-500 text-white px-3 py-1 rounded" onClick={() => handleDecision(doc.id, "approved")}>
                      ✅ Approve
                    </button>

                    <button className="btn btn-secondary bg-red-500 text-white px-3 py-1 rounded" onClick={() => handleDecision(doc.id, "rejected")}>
                      ❌ Reject
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <button className="btn btn-secondary text-red-500" onClick={() => handleDelete(doc.id)}>
                  Delete 🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
