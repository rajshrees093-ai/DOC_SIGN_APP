import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

function PublicSign() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDocument();
  }, []);

  const fetchDocument = async () => {
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
  if (!doc) return <h2>Loading document...</h2>;

  return (
    <div style={{ padding: 20 }}>
      <h2>📄 Sign Document</h2>
      <h3>{doc.filename}</h3>

      <iframe
        src={`http://localhost:5000/uploads/${doc.path}`}
        width="100%"
        height="600px"
        title="PDF Preview"
      />

      <br /><br />

      <button onClick={() => alert("Signature UI comes next 👍")}>
        ✍ Sign Document
      </button>
    </div>
  );
}

export default PublicSign;
