import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { useRef, useState, useEffect } from "react";
import axios from "axios";

function PDFViewer() {
  const { filename } = useParams();

  const sigPadRef = useRef(null);
  const containerRef = useRef(null);

  // ✅ Page awareness
  const [totalPages, setTotalPages] = useState(null);
  const [selectedPage, setSelectedPage] = useState(1);

  // ✅ Signature system
  const [sigSize, setSigSize] = useState(150);
  const [signatures, setSignatures] = useState([]);

  // ✅ Drag engine
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // ================= PAGE COUNT =================
  useEffect(() => {
    const token = localStorage.getItem("token");

    axios
      .get(`http://localhost:5000/api/docs/pages/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("TOTAL PAGES:", res.data.pages);
        setTotalPages(res.data.pages);
      })
      .catch(console.error);
  }, [filename]);

  // ================= ADD SIGNATURE =================
  const generateSignature = () => {
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
    setDragIndex(index);

    setDragOffset({
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
    });
  };

  const stopDrag = () => setDragIndex(null);

  // ================= SMOOTH DRAGGING =================
  const handleMouseMove = (e) => {
    if (dragIndex === null) return;

    const rect = containerRef.current.getBoundingClientRect();

    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    const updated = [...signatures];

    updated[dragIndex] = {
      ...updated[dragIndex],
      x,
      y,
    };

    setSignatures(updated);
  };

  // ================= REMOVE SIGNATURE =================
  const deleteSignature = (index) => {
    const updated = [...signatures];
    updated.splice(index, 1);
    setSignatures(updated);
  };

  // ================= SAVE PDF =================
  const saveAllSignatures = async () => {
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
            y: 500 - sig.y, // ⭐ Convert to PDF-lib coordinates
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

      {/* ✅ PAGE COUNT */}
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
          marginBottom: 20,
          overflow: "hidden",
          background: "white",
        }}
      >
        {/* PDF purely visual */}
        <iframe
          src={`http://localhost:5000/uploads/${filename}`}
          width="800"
          height="500"
          title="PDF"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none", // ⭐ Prevent drag interference
          }}
        />

        {/* SIGNATURE OVERLAY */}
        {signatures.map((sig, index) => (
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
              cursor: "move",
              border: "1px dashed red",
              background: "white",
            }}
          />
        ))}
      </div>

      {/* ================= SIZE CONTROL ================= */}
      <h3>Resize New Signatures:</h3>

      <input
        type="range"
        min="50"
        max="300"
        value={sigSize}
        onChange={(e) => setSigSize(Number(e.target.value))}
      />

      <p>Size: {sigSize}px</p>

      {/* ================= SIGNATURE PAD ================= */}
      <h3>Draw Signature:</h3>

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

      <button onClick={generateSignature}>Add Signature ➕</button>
      <button onClick={saveAllSignatures} style={{ marginLeft: 10 }}>
        Finalize PDF ✅
      </button>

      {/* ================= SIGNATURE MANAGER ================= */}
      <hr />
      <h3>Signature Manager</h3>

      {signatures.map((sig, index) => (
        <div key={index}>
          ✔ Signature {index + 1} (Page {sig.page})
          <button
            onClick={() => deleteSignature(index)}
            style={{ marginLeft: 10 }}
          >
            ❌ Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export default PDFViewer;
