import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("all");
  const [file, setFile] = useState(null); // ⭐ Upload state

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

  // ================= UPLOAD PDF ⭐⭐⭐ =================
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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert(res.data.message);
      setFile(null);
      fetchDocs();

    } catch (err) {
      console.error(err);
      alert("Upload failed ❌");
    }
  };

  // ================= DELETE DOCUMENT ⭐⭐⭐ =================
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

  const getStatusColor = (status) => {
    if (status === "approved") return "green";
    if (status === "rejected") return "red";
    return "orange";
  };

  // ================= COUNTERS =================
  const pendingCount = docs.filter(d => d.status === "pending").length;
  const approvedCount = docs.filter(d => d.status === "approved").length;
  const rejectedCount = docs.filter(d => d.status === "rejected").length;

  // ================= FILTER =================
  const filteredDocs = docs.filter((doc) => {
    if (filter === "all") return true;
    return doc.status === filter;
  });

  return (
    <div style={{ padding: 20 }}>
      <h2>📄 Document Dashboard</h2>

      {/* ================= UPLOAD SECTION ⭐⭐⭐ ================= */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button onClick={handleUpload} style={{ marginLeft: 10 }}>
          Upload PDF ➕
        </button>
      </div>

      {/* ================= FILTER BUTTONS ================= */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setFilter("all")}>
          All ({docs.length})
        </button>

        <button
          onClick={() => setFilter("pending")}
          style={{ marginLeft: 10 }}
        >
          Pending ({pendingCount})
        </button>

        <button
          onClick={() => setFilter("approved")}
          style={{ marginLeft: 10 }}
        >
          Approved ({approvedCount})
        </button>

        <button
          onClick={() => setFilter("rejected")}
          style={{ marginLeft: 10 }}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {/* ================= DOCUMENT LIST ================= */}
      {filteredDocs.length === 0 ? (
        <p>No documents found</p>
      ) : (
        filteredDocs.map((doc) => (
          <div
            key={doc.id}
            style={{
              border: "1px solid #ccc",
              padding: 10,
              marginBottom: 10,
            }}
          >
            <a
              href={`/preview/${doc.path}`}
              style={{
                fontWeight: "bold",
                fontSize: 16,
                display: "block",
              }}
            >
              {doc.filename}
            </a>

            <p style={{ color: getStatusColor(doc.status) }}>
              Status: {doc.status}
            </p>

            {doc.status === "rejected" && doc.decision_reason && (
              <p style={{ color: "red" }}>
                Reason: {doc.decision_reason}
              </p>
            )}

            {/* ================= DECISION CONTROLS ================= */}
            {doc.status === "pending" && (
              <>
                <input
                  type="text"
                  placeholder="Rejection reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />

                <br /><br />

                <button onClick={() => handleDecision(doc.id, "approved")}>
                  ✅ Approve
                </button>

                <button
                  onClick={() => handleDecision(doc.id, "rejected")}
                  style={{ marginLeft: 10 }}
                >
                  ❌ Reject
                </button>
              </>
            )}

            {/* ================= DELETE BUTTON ⭐⭐⭐ ================= */}
            <button
              onClick={() => handleDelete(doc.id)}
              style={{ marginTop: 10 }}
            >
              Delete 🗑
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default Dashboard;
