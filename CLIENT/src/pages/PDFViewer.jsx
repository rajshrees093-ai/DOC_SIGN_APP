import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { useRef, useState, useEffect } from "react";
import axios from "axios";

function PDFViewer() {
  const { filename } = useParams();

  const sigRef = useRef(null);

  const [totalPages, setTotalPages] = useState(null);
  const [selectedPage, setSelectedPage] = useState(1);

  // ⭐ STORE MULTIPLE SIGNATURES
  const [signatures, setSignatures] = useState([]);

  // =========================
  // ✅ FETCH PAGE COUNT
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get(`http://localhost:5000/api/docs/pages/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setTotalPages(res.data.pages);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [filename]);

  // =========================
  // ✅ CLICK PDF → ADD SIGNATURE POSITION
  // =========================
  const handlePdfClick = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert("Draw signature first ✍");
      return;
    }

    const canvas = sigRef.current.getCanvas();
    const image = canvas.toDataURL("image/png");

    // Fake center placement for now (stable & predictable)
    const newSignature = {
      x: 100,
      y: 100,
      page: selectedPage,
      size: 150,
      image,
    };

    console.log("SIGNATURE ADDED:", newSignature);

    setSignatures([...signatures, newSignature]);

    sigRef.current.clear();
  };

  // =========================
  // ✅ UNDO LAST SIGNATURE
  // =========================
  const undoSignature = () => {
    if (signatures.length === 0) return;

    const updated = [...signatures];
    updated.pop();

    setSignatures(updated);
  };

  // =========================
  // ✅ FINAL SAVE TO BACKEND
  // =========================
  const saveAllSignatures = async () => {
    if (signatures.length === 0) {
      alert("No signatures placed ❌");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://localhost:5000/api/docs/sign",
        {
          filename,
          signatures,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const signedFile = res.data.file;

      window.open(`http://localhost:5000/uploads/${signedFile}`);

    } catch (err) {
      console.error(err);
      alert("Signing failed ❌");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>PDF Preview & Sign ✍</h2>

      {/* ✅ PAGE INFO */}
      {totalPages && <h3>📄 Total Pages: {totalPages}</h3>}

      {/* ✅ PAGE SELECTOR */}
      {totalPages && (
        <div style={{ marginBottom: 10 }}>
          <label>Select Page: </label>

          <select
            value={selectedPage}
            onChange={(e) => setSelectedPage(Number(e.target.value))}
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Page {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ✅ PDF DISPLAY */}
      <div
        style={{
          border: "2px solid #ccc",
          width: 820,
          padding: 10,
          marginBottom: 20,
        }}
      >
        <iframe
          src={`http://localhost:5000/uploads/${filename}`}
          width="800"
          height="500"
          title="PDF"
        />
      </div>

      {/* ✅ SIGNATURE PAD */}
      <h3>Draw Signature:</h3>

      <SignatureCanvas
        ref={sigRef}
        penColor="black"
        canvasProps={{
          width: 500,
          height: 200,
          style: {
            border: "2px solid black",
            borderRadius: "8px",
          },
        }}
      />

      <br /><br />

      {/* ✅ ACTION BUTTONS */}
      <button onClick={handlePdfClick}>
        Add Signature ➕
      </button>

      <button onClick={undoSignature} style={{ marginLeft: 10 }}>
        Undo Last ↩
      </button>

      <button onClick={saveAllSignatures} style={{ marginLeft: 10 }}>
        Finalize & Sign ✅
      </button>

      {/* ✅ SIGNATURE LIST */}
      <hr />

      <h3>Placed Signatures: {signatures.length}</h3>

      {signatures.map((sig, i) => (
        <div key={i}>
          ✔ Page {sig.page} | X: {sig.x} | Y: {sig.y}
        </div>
      ))}
    </div>
  );
}

export default PDFViewer;
