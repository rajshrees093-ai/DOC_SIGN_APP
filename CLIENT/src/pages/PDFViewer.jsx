import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { useRef, useState, useEffect } from "react";
import axios from "axios";

function PDFViewer() {
  const { filename } = useParams();

  const sigRef = useRef(null);
  const pdfRef = useRef(null);

  const [totalPages, setTotalPages] = useState(null);
  const [selectedPage, setSelectedPage] = useState(1);

  const [signatureImage, setSignatureImage] = useState(null);

  // ⭐ POSITION OF DRAGGABLE SIGNATURE
  const [sigPosition, setSigPosition] = useState({ x: 100, y: 100 });

  const [dragging, setDragging] = useState(false);

  // =========================
  // ✅ FETCH PAGE COUNT
  // =========================
  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get(`http://localhost:5000/api/docs/pages/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTotalPages(res.data.pages))
      .catch(console.error);
  }, [filename]);

  // =========================
  // ✅ GENERATE SIGNATURE IMAGE
  // =========================
  const generateSignature = () => {
    if (!sigRef.current || sigRef.current.isEmpty()) {
      alert("Draw signature first ✍");
      return;
    }

    const image = sigRef.current.getCanvas().toDataURL("image/png");

    setSignatureImage(image);
    sigRef.current.clear();

    alert("Drag signature onto PDF ✅");
  };

  // =========================
  // ✅ DRAG LOGIC
  // =========================
  const startDrag = () => setDragging(true);
  const stopDrag = () => setDragging(false);

  const handleMouseMove = (e) => {
    if (!dragging) return;

    const rect = pdfRef.current.getBoundingClientRect();

    const x = e.clientX - rect.left;
    const y = rect.bottom - e.clientY;

    setSigPosition({ x, y });
  };

  // =========================
  // ✅ FINALIZE SIGNATURE
  // =========================
  const saveSignature = async () => {
    if (!signatureImage) {
      alert("Generate signature first ✍");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://localhost:5000/api/docs/sign",
        {
          filename,
          signatures: [
            {
              x: sigPosition.x,
              y: sigPosition.y,
              page: selectedPage,
              size: 150,
              image: signatureImage,
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

      {totalPages && <h3>📄 Total Pages: {totalPages}</h3>}

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

      {/* ================= PDF AREA ================= */}
      <div
        ref={pdfRef}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        style={{
          position: "relative",
          width: 800,
          height: 500,
          border: "2px solid #ccc",
          marginBottom: 20,
          userSelect: "none",
        }}
      >
        <iframe
          src={`http://localhost:5000/uploads/${filename}`}
          width="800"
          height="500"
          title="PDF"
          style={{ position: "absolute", top: 0, left: 0 }}
        />

        {/* ⭐ DRAGGABLE SIGNATURE PREVIEW */}
        {signatureImage && (
          <img
            src={signatureImage}
            alt="signature"
            onMouseDown={startDrag}
            style={{
              position: "absolute",
              left: sigPosition.x,
              top: 500 - sigPosition.y,
              width: 150,
              cursor: "move",
              border: "1px dashed red",
              background: "white",
            }}
          />
        )}
      </div>

      {/* ================= SIGNATURE PAD ================= */}
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

      <button onClick={generateSignature}>
        Generate Signature 🖊
      </button>

      <button onClick={saveSignature} style={{ marginLeft: 10 }}>
        Apply to PDF ✅
      </button>
    </div>
  );
}

export default PDFViewer;
