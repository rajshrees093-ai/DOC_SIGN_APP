import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import axios from "axios";

function PublicSign() {
  const { token } = useParams();

  const sigPadRef = useRef(null);

  const [doc, setDoc] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocument();
  }, []);

  const fetchDocument = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/docs/public-sign/${token}`
      );

      setDoc(res.data.document);
      setLoading(false);

    } catch (err) {
      console.error(err);
      setError("Invalid or expired signing link ❌");
      setLoading(false);
    }
  };

  const finalizeSignature = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Please draw signature first ✍");
      return;
    }

    try {
      const image = sigPadRef.current
        .getCanvas()
        .toDataURL("image/png");

      const signatures = [
        {
          x: 100,       // ⭐ Fixed position for demo
          y: 100,
          size: 200,
          page: 1,
          image,
        },
      ];

      const res = await axios.post(
        "http://localhost:5000/api/docs/sign",
        {
          filename: doc.path,
          signatures,
        }
      );

      window.open(`http://localhost:5000/uploads/${res.data.file}`);

    } catch (err) {
      console.error(err);
      alert("Signing failed ❌");
    }
  };

  if (loading) return <h2>Loading document...</h2>;
  if (error) return <h2>{error}</h2>;

  return (
    <div style={{ padding: 20 }}>
      <h2>📄 Public Signing Page</h2>
      <h3>{doc.filename}</h3>

      <iframe
        src={`http://localhost:5000/uploads/${doc.path}`}
        width="100%"
        height="500px"
        title="PDF"
      />

      <br /><br />

      <h3>✍ Draw Signature</h3>

      <SignatureCanvas
        ref={sigPadRef}
        penColor="black"
        canvasProps={{
          width: 500,
          height: 200,
          style: { border: "1px solid black" },
        }}
      />

      <br />

      <button onClick={() => sigPadRef.current.clear()}>
        Clear
      </button>

      <button
        onClick={finalizeSignature}
        style={{ marginLeft: 10 }}
      >
        ✅ Finalize Signature
      </button>
    </div>
  );
}

export default PublicSign;
