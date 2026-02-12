import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { useRef, useState, useEffect } from "react";
import axios from "axios";

function PDFViewer() {
  const { filename } = useParams();

  const sigRef = useRef(null);

  const [position, setPosition] = useState(null);

  // ⭐ TOTAL PAGES FROM BACKEND
  const [totalPages, setTotalPages] = useState(null);

  // ⭐ USER SELECTED PAGE (THIS WAS MISSING)
  const [selectedPage, setSelectedPage] = useState(1);

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
        console.error("Page count error:", err);
      });
  }, [filename]);

  // =========================
  // ✅ CAPTURE CLICK POSITION
  // =========================
  const handlePdfClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = rect.bottom - e.clientY;

    console.log("PDF CLICK:", { x, y, page: selectedPage });

    setPosition({
      x,
      y,
      page: selectedPage, // ⭐⭐⭐ USE SELECTED PAGE
    });
  };

  const clearSignature = () => {
    if (!sigRef.current) return;
    sigRef.current.clear();
  };

  // =========================
  // ✅ APPLY SIGNATURE
  // =========================
  const saveSignature = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert("Draw signature first ✍");
      return;
    }

    if (!position) {
      alert("Click on PDF to select position 📍");
      return;
    }

    try {
      const image = sigRef.current.getCanvas().toDataURL("image/png");
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://localhost:5000/api/docs/sign",
        {
          filename,
          signatures: [
            {
              ...position,
              size: 150,
              image,
            },
          ],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      window.open(`http://localhost:5000/uploads/${res.data.file}`);

    } catch (err) {
      console.error(err);
      alert("Signing failed ❌");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>PDF Preview & Sign ✍</h2>

      {/* ✅ SHOW TOTAL PAGES */}
      {totalPages && (
        <h3>📄 Total Pages: {totalPages}</h3>
      )}

      {/* ✅ PAGE SELECTOR RESTORED ⭐⭐⭐ */}
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

      {/* ✅ CLICKABLE PDF */}
      <div
        onClick={handlePdfClick}
        style={{
          border: "2px solid #ccc",
          display: "inline-block",
          cursor: "crosshair",
        }}
      >
        <iframe
          src={`http://localhost:5000/uploads/${filename}`}
          width="800"
          height="500"
          title="PDF"
          style={{ pointerEvents: "none" }}
        />
      </div>

      {/* ✅ SHOW POSITION */}
      {position && (
        <p>
          📍 Position → X: {Math.round(position.x)} | Y: {Math.round(position.y)} | Page: {position.page}
        </p>
      )}

      <h3>Draw Signature:</h3>

      <SignatureCanvas
        ref={sigRef}
        penColor="black"
        canvasProps={{
          width: 500,
          height: 200,
          style: { border: "2px solid black" },
        }}
      />

      <br /><br />

      <button onClick={clearSignature}>Clear Pad</button>
      <button onClick={saveSignature}>Apply Signature ✅</button>
    </div>
  );
}

export default PDFViewer;
