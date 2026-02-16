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

      console.log("PUBLIC DOC:", res.data);

      setDoc(res.data.document);

    } catch (err) {
      console.error(err);
      setError("Invalid or expired signing link ❌");
    }
  };

  if (error) return <h2>{error}</h2>;
  if (!doc) return <h2>Loading document...</h2>;

  // ⭐ TEMP DEBUG RENDER
  return (
    <pre>{JSON.stringify(doc, null, 2)}</pre>
  );
}

export default PublicSign;
