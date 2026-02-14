import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [reasons, setReasons] = useState({}); // ⭐ store reject reasons

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    fetchDocs(token);
    fetchProfile(token);
  }, []);

  const fetchDocs = async (token) => {
    try {
      const res = await axios.get("http://localhost:5000/api/docs", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDocs(res.data);
    } catch (err) {
      console.error("Docs fetch error:", err);
    }
  };

  const fetchProfile = async (token) => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/auth/profile",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUser(res.data);
    } catch (err) {
      console.error("Profile error:", err);
    }
  };

  // ================= LOGOUT =================
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // ================= UPLOAD =================
  const handleUpload = async () => {
    if (!file) {
      alert("Choose a file first ❌");
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

      alert(res.data.message);
      fetchDocs(token);
      setFile(null);
    } catch (err) {
      console.error(err);
      alert("Upload failed ❌");
    }
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");

    try {
      await axios.delete(`http://localhost:5000/api/docs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDocs(docs.filter((doc) => doc.id !== id));
    } catch (err) {
      console.error(err);
      alert("Delete failed ❌");
    }
  };

  // ================= ACCEPT =================
  const handleAccept = async (id) => {
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        "http://localhost:5000/api/docs/decision",
        {
          id,
          decision: "accepted",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setDocs(
        docs.map((doc) =>
          doc.id === id ? { ...doc, decision: "accepted" } : doc
        )
      );
    } catch (err) {
      console.error(err);
      alert("Accept failed ❌");
    }
  };

  // ================= REJECT =================
  const handleReject = async (id) => {
    const token = localStorage.getItem("token");
    const reason = reasons[id];

    if (!reason) {
      alert("Enter rejection reason ❌");
      return;
    }

    try {
      await axios.post(
        "http://localhost:5000/api/docs/decision",
        {
          id,
          decision: "rejected",
          decision_reason: reason,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setDocs(
        docs.map((doc) =>
          doc.id === id
            ? { ...doc, decision: "rejected", decision_reason: reason }
            : doc
        )
      );
    } catch (err) {
      console.error(err);
      alert("Reject failed ❌");
    }
  };

  // ================= UI =================
  return (
    <div style={{ padding: 20 }}>
      <h2>📄 Document Dashboard</h2>

      {user && <h3>Welcome, {user.name} 👋</h3>}

      <button onClick={handleLogout}>Logout</button>

      <hr />

      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={handleUpload}>Upload PDF</button>

      <hr />

      {docs.length === 0 ? (
        <p>No documents found</p>
      ) : (
        docs.map((doc) => (
          <div
            key={doc.id}
            style={{
              border: "1px solid #ccc",
              padding: 10,
              marginBottom: 10,
            }}
          >
            <a href={`/preview/${doc.path}`}>
              {doc.filename}
            </a>

            <p>
              Status:{" "}
              <strong>
                {doc.decision || "pending"}
              </strong>
            </p>

            {/* ACCEPT / REJECT ONLY IF PENDING */}
            {(doc.decision === "pending" || !doc.decision) && (
              <>
                <button onClick={() => handleAccept(doc.id)}>
                  ✅ Accept
                </button>

                <input
                  placeholder="Reject reason"
                  value={reasons[doc.id] || ""}
                  onChange={(e) =>
                    setReasons({
                      ...reasons,
                      [doc.id]: e.target.value,
                    })
                  }
                  style={{ marginLeft: 10 }}
                />

                <button
                  onClick={() => handleReject(doc.id)}
                  style={{ marginLeft: 5 }}
                >
                  ❌ Reject
                </button>
              </>
            )}

            {doc.decision === "rejected" && (
              <p style={{ color: "red" }}>
                Reason: {doc.decision_reason}
              </p>
            )}

            <button
              onClick={() => handleDelete(doc.id)}
              style={{ marginLeft: 10 }}
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default Dashboard;
