import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("all");
  const [file, setFile] = useState(null);

  // ⭐ Stores signer emails per document
  const [emails, setEmails] = useState({});

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
      const res = await axios.get("http://localhost:5000/api/docs", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDocs(res.data);

    } catch (err) {
      console.error("Docs fetch error:", err);
    }
  };

  // ================= UPLOAD PDF =================
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
        "http://localhost:5000/api/docs/upload",
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

  // ================= DELETE DOCUMENT =================
  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");

    try {
      await axios.delete(`http://localhost:5000/api/docs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchDocs();

    } catch (err) {
      console.error(err);
      alert("Delete failed ❌");
    }
  };

  // ================= DECISION =================
  const handleDecision = async (id, decision) => {
    const token = localStorage.getItem("token");

    try {
      const res = await axios.post(
        "http://localhost:5000/api/docs/decision",
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

  // ================= DAY-9 REQUEST SIGNATURE =================
  const requestSignature = async (docId) => {
    const token = localStorage.getItem("token");
    const email = emails[docId];

    if (!email) {
      alert("Enter signer email ❌");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/docs/request-signature",
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

  // ================= DAY-10 AUDIT VIEWER =================
  const viewAudit = async (documentId) => {
    const token = localStorage.getItem("token");

    try {
      const res = await axios.get(
        `http://localhost:5000/api/docs/audit/${documentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("AUDIT LOGS:", res.data);

      alert(JSON.stringify(res.data, null, 2));

    } catch (err) {
      console.error(err);
      alert("Failed to fetch audit logs ❌");
    }
  };

  const getStatusColor = (status) => {
    if (status === "approved") return "green";
    if (status === "rejected") return "red";
    return "orange";
  };

  const pendingCount = docs.filter(d => d.status === "pending").length;
  const approvedCount = docs.filter(d => d.status === "approved").length;
  const rejectedCount = docs.filter(d => d.status === "rejected").length;

  const filteredDocs = docs.filter((doc) => {
    if (filter === "all") return true;
    return doc.status === filter;
  });

  return (
    <div className="dashboard-container">
      <h2>📄 Document Dashboard</h2>

      <div className="upload-row">
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />

        <button className="btn" onClick={handleUpload}>
          Upload PDF ➕
        </button>
      </div>

      <div className="filters">
        <button className="btn btn-secondary" onClick={() => setFilter("all")}>
          All ({docs.length})
        </button>

        <button className="btn btn-secondary" onClick={() => setFilter("pending")}>
          Pending ({pendingCount})
        </button>

        <button className="btn btn-secondary" onClick={() => setFilter("approved")}>
          Approved ({approvedCount})
        </button>

        <button className="btn btn-secondary" onClick={() => setFilter("rejected")}>
          Rejected ({rejectedCount})
        </button>
      </div>

      {filteredDocs.length === 0 ? (
        <p>No documents found</p>
      ) : (
        <div className="doc-list">
          {filteredDocs.map((doc) => (
            <div key={doc.id} className="doc-card">
              <a href={`/preview/${doc.path}`} className="doc-title">
                {doc.filename}
              </a>

              <p className="doc-meta" style={{ color: getStatusColor(doc.status) }}>
                Status: {doc.status}
              </p>

              <div className="actions-row">
                <button className="btn btn-secondary" onClick={() => viewAudit(doc.id)}>
                  🧾 View Audit Trail
                </button>

                <input
                  className="small-input"
                  type="text"
                  placeholder="Signer email"
                  value={emails[doc.id] || ""}
                  onChange={(e) =>
                    setEmails({ ...emails, [doc.id]: e.target.value })
                  }
                />

                <button className="btn" onClick={() => requestSignature(doc.id)}>
                  📧 Request Signature
                </button>
              </div>

              {doc.status === "pending" && (
                <div style={{ marginTop: 8 }}>
                  <input
                    className="small-input"
                    type="text"
                    placeholder="Rejection reason (optional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />

                  <div className="actions-row" style={{ marginTop: 8 }}>
                    <button className="btn" onClick={() => handleDecision(doc.id, "approved")}>
                      ✅ Approve
                    </button>

                    <button className="btn btn-secondary" onClick={() => handleDecision(doc.id, "rejected")}>
                      ❌ Reject
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <button className="btn btn-secondary" onClick={() => handleDelete(doc.id)}>
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
