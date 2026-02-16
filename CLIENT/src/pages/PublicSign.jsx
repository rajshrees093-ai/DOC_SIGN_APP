import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

function PublicSign() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/docs/public-sign/${token}`
      );

      setDoc(res.data.document);

    } catch (err) {
      console.error(err);
      setError("Invalid or expired signing link ❌");
    }
  };

  if (error) return <h2>{error}</h2>;
  if (!doc) return <h2>Validating token…</h2>;

  return (
    <div style={{ padding: 20 }}>
      <h2>📄 Public Document Signing</h2>

      <p><b>File:</b> {doc.filename}</p>

      {/* ⭐ PDF LOAD */}
      <iframe
        src={`http://localhost:5000/uploads/${doc.path}`}
        width="800"
        height="500"
        title="PDF"
      />
    </div>
  );
}

export default PublicSign;
