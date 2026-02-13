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

  const [signatures, setSignatures] = useState([]);

  // ⭐ Dragging
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // ⭐ Resizing
  const [resizeIndex, setResizeIndex] = useState(null);

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
        size: 150,
        image,
      },
    ]);

    sigPadRef.current.clear();
  };

  // ================= START DRAG =================
  const startDrag = (e, index) => {
    if (resizeIndex !== null) return;

    const rect = e.target.getBoundingClientRect();

    setDragIndex(index);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // ================= START RESIZE =================
  const startResize = (index) => {
    setResizeIndex(index);
  };

  // ================= MOUSE MOVE ENGINE =================
  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();

    // ✅ DRAGGING
    if (dragIndex !== null) {
      let x = e.clientX - rect.left - dragOffset.x;
      let y = e.clientY - rect.top - dragOffset.y;

      const updated = [...signatures];
      const sig = updated[dragIndex];

      const maxX = rect.width - sig.size;
      const maxY = rect.height - sig.size / 2;

      x = Math.max(0, Math.min(x, maxX));
      y = Math.max(0, Math.min(y, maxY));

      updated[dragIndex] = { ...sig, x, y };
      setSignatures(updated);
    }

    // ✅ RESIZING
    if (resizeIndex !== null) {
      const updated = [...signatures];
      const sig = updated[resizeIndex];

      const newSize = Math.max(50, e.clientX - rect.left - sig.x);

      updated[resizeIndex] = {
        ...sig,
        size: newSize,
      };

      setSignatures(updated);
    }
  };

  const stopActions = () => {
    setDragIndex(null);
    setResizeIndex(null);
  };

  // ================= FINALIZE PDF =================
  const finalizePDF = async () => {
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

      {/* PAGE SELECTOR */}
      {totalPages && (
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
      )}

      <br /><br />

      {/* PDF CONTAINER */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={stopActions}
        style={{
          position: "relative",
          width: 800,
          height: 500,
          border: "2px solid #ccc",
          marginBottom: 20,
          background: "white",
        }}
      >
        <iframe
          src={`http://localhost:5000/uploads/${filename}#toolbar=0`}
          width="800"
          height="500"
          title="PDF"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        />

        {/* SIGNATURES */}
        {signatures.map((sig, index) =>
          sig.page === selectedPage ? (
            <div
              key={index}
              style={{
                position: "absolute",
                left: sig.x,
                top: sig.y,
              }}
            >
              <img
                src={sig.image}
                alt="sig"
                onMouseDown={(e) => startDrag(e, index)}
                style={{
                  width: sig.size,
                  cursor: "grab",
                  border: "1px dashed red",
                }}
              />

              {/* RESIZE HANDLE ⭐⭐⭐ */}
              <div
                onMouseDown={() => startResize(index)}
                style={{
                  width: 12,
                  height: 12,
                  background: "blue",
                  position: "absolute",
                  right: -6,
                  bottom: -6,
                  cursor: "nwse-resize",
                }}
              />
            </div>
          ) : null
        )}
      </div>

      <SignatureCanvas
        ref={sigPadRef}
        penColor="black"
        canvasProps={{ width: 500, height: 200 }}
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
