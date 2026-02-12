import { useEffect, useState } from "react";
import axios from "axios";
import PDFPreview from "../components/PDFPreview";

export default function Dashboard() {
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get("http://localhost:5000/api/docs", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDocs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Documents</h1>

      {docs.map((doc) => (
        <div key={doc._id} className="shadow p-3 mb-2 rounded">
          <p>{doc.filename}</p>

          <button
            className="text-blue-500"
            onClick={() => setSelectedDoc(doc.path)}
          >
            Preview
          </button>
        </div>
      ))}

      {selectedDoc && (
        <PDFPreview url={`http://localhost:5000/${selectedDoc}`} />
      )}
    </div>
  );
}
