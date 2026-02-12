import { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    // ✅ Protect route
    if (!token) {
      window.location.href = "/";
      return;
    }

    // ✅ Fetch documents
    axios
      .get("http://localhost:5000/api/docs", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setDocs(res.data);
      })
      .catch((err) => {
        console.error("Docs fetch error:", err);
      });

    // ✅ Fetch user profile
    axios
      .get("http://localhost:5000/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUser(res.data);
      })
      .catch((err) => {
        console.error("Profile error:", err);
      });
  }, []);

  // ✅ Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // ✅ File Upload
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(res.data.message);

      // ✅ Reload docs after upload
      const docsRes = await axios.get("http://localhost:5000/api/docs", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDocs(docsRes.data);
      setFile(null);

    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed ❌");
    }
  };

  // ✅ Delete Document
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

  return (
    <div style={{ padding: "20px" }}>
      <h2>📄 Document Dashboard</h2>

      {/* ✅ Welcome User */}
      {user && <h3>Welcome, {user.name} 👋</h3>}

      {/* ✅ Logout */}
      <button onClick={handleLogout}>Logout</button>

      <hr />

      {/* ✅ Upload Section */}
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={handleUpload}>Upload PDF</button>

      <hr />

      {/* ✅ Documents List */}
      {docs.length === 0 ? (
        <p>No documents found</p>
      ) : (
        docs.map((doc) => (
          <div key={doc.id} style={{ marginBottom: "10px" }}>
            <strong>{doc.filename}</strong>

            <button
              onClick={() => handleDelete(doc.id)}
              style={{ marginLeft: "10px" }}
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
