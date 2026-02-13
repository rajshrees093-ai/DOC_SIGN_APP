import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { useRef, useState, useEffect } from "react";
import axios from "axios";

function PDFViewer() {
  const { filename } = useParams();

  const sigPadRef = useRef(null);
  const containerRef = useRef(null);

  const [totalPages, setTotalPages] = useState(null);
  const [selectedPage, setSelectedPage] = useState(1);

  const [sigSize, setSigSize] = useState(150);
  const [signatures, setSignatures] = useState([]);

  // ⭐ Drag states
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // ================= PAGE COUNT =================
  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get(`http://localhost:5000/api/docs/pages/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTotalPages(res.data.pages))
      .catch(console.error);
  }, [filename]);

  // ================= ADD SIGNATURE =================
  const addSignature = () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Draw signature first ✍");
      return;
    }

    const image = sigPadRef.current.getCanvas().toDataURL("image/png");

    setSignatures([
      ...signatures,
      {
        x: 100,
        y: 100,
        page: selectedPage,
        size: sigSize,
        image,
      },
    ]);

    sigPadRef.current.clear();
  };

  // ================= DRAG START =================
  const startDrag = (e, index) => {
    e.preventDefault();

    const rect = e.target.getBoundingClientRect();

    setDragIndex(index);

    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // ================= DRAG MOVE =================
  const handleMouseMove = (e) => {
    if (dragIndex === null) return;

    const rect = containerRef.current.getBoundingClientRect();

    let x = e.clientX - rect.left - dragOffset.x;
    let y = e.clientY - rect.top - dragOffset.y;

    const sig = signatures[dragIndex];

    // ⭐ Constrain inside container
    const maxX = rect.width - sig.size;
    const maxY = rect.height - sig.size / 2;

    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    const updated = [...signatures];

    updated[dragIndex] = {
      ...updated[dragIndex],
      x,
      y,
    };

    setSignatures(updated);
  };

  // ================= DRAG END =================
  const stopDrag = () => setDragIndex(null);

  // ================= FINALIZE PDF =================
  const finalizePDF = async () => {
    if (signatures.length === 0) {
      alert("No signatures added ❌");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://localhost:5000/api/docs/sign",
        {
          filename,
          signatures: signatures.map((sig) => ({
            ...sig,
            y: Number(sig.y), // already top-origin coords
          })),
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

      {totalPages && <h3>📄 Total Pages: {totalPages}</h3>}

      {/* ================= PAGE SELECTOR ================= */}
      {totalPages && (
        <div>
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

      <br />

      {/* ================= PDF + SIGNATURE LAYER ================= */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        style={{
          position: "relative",
          width: 800,
          height: 500,
          border: "2px solid #ccc",
          overflow: "hidden",
          marginBottom: 20,
          background: "white",
        }}
      >
        {/* PDF purely visual */}
        <iframe
          src={`http://localhost:5000/uploads/${filename}#toolbar=0`}
          width="800"
          height="500"
          title="PDF"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none", // ⭐ prevents drag conflicts
          }}
        />

        {/* Signatures */}
        {signatures.map((sig, index) =>
          sig.page === selectedPage ? (
            <img
              key={index}
              src={sig.image}
              alt="signature"
              onMouseDown={(e) => startDrag(e, index)}
              style={{
                position: "absolute",
                left: sig.x,
                top: sig.y,
                width: sig.size,
                cursor: "grab",
                border: "1px dashed red",
                background: "white",
              }}
            />
          ) : null
        )}
      </div>

      {/* ================= CONTROLS ================= */}
      <input
        type="range"
        min="50"
        max="300"
        value={sigSize}
        onChange={(e) => setSigSize(Number(e.target.value))}
      />

      <p>Signature Size: {sigSize}px</p>

      <SignatureCanvas
        ref={sigPadRef}
        penColor="black"
        canvasProps={{
          width: 500,
          height: 200,
          style: { border: "2px solid black" },
        }}
      />

      <br /><br />

      <button onClick={addSignature}>Add Signature ➕</button>
      <button onClick={finalizePDF} style={{ marginLeft: 10 }}>
        Finalize PDF ✅
      </button>
    </div>
  );
}

export default PDFViewer;
