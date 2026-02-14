import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("all");

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

  // ✅ FILTER LOGIC
  const filteredDocs = docs.filter((doc) => {
    if (filter === "all") return true;
    return doc.status === filter;
  });

  return (
    <div style={{ padding: 20 }}>
      <h2>📄 Document Dashboard</h2>

      {/* ✅ FILTER BUTTONS */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setFilter("all")}>All</button>

        <button
          onClick={() => setFilter("pending")}
          style={{ marginLeft: 10 }}
        >
          Pending
        </button>

        <button
          onClick={() => setFilter("approved")}
          style={{ marginLeft: 10 }}
        >
          Approved
        </button>

        <button
          onClick={() => setFilter("rejected")}
          style={{ marginLeft: 10 }}
        >
          Rejected
        </button>
      </div>

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
            {/* ✅ CLICKABLE PDF LINK ⭐⭐⭐ */}
            <a
              href={`/preview/${doc.path}`}
              style={{
                fontWeight: "bold",
                fontSize: 16,
                display: "block",
                marginBottom: 5,
              }}
            >
              {doc.filename}
            </a>

            <p style={{ color: getStatusColor(doc.status) }}>
              Status: {doc.status}
            </p>

            {/* ✅ Rejection Reason */}
            {doc.status === "rejected" && doc.decision_reason && (
              <p style={{ color: "red" }}>
                Reason: {doc.decision_reason}
              </p>
            )}

            {/* ✅ Decision Controls */}
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
          </div>
        ))
      )}
    </div>
  );
}

export default Dashboard;
