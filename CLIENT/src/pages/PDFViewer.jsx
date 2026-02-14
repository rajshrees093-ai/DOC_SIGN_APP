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

  // ⭐ SIGNATURE SPACES
  const [blocks, setBlocks] = useState([
    { x: 200, y: 150, width: 200, height: 100 },
  ]);

  const [activeBlock, setActiveBlock] = useState(0);

  const [dragBlock, setDragBlock] = useState(null);
  const [resizeBlock, setResizeBlock] = useState(null);

  const [dragSigIndex, setDragSigIndex] = useState(null);
  const [sigOffset, setSigOffset] = useState({ x: 0, y: 0 });

  const [resizeSigIndex, setResizeSigIndex] = useState(null);

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

  // ================= BLOCK CONTROLS =================
  const addBlock = () => {
    setBlocks([
      ...blocks,
      { x: 100, y: 100, width: 200, height: 100 },
    ]);
  };

  const deleteBlock = () => {
    if (blocks.length === 1) {
      alert("At least one space required ❌");
      return;
    }

    const updated = [...blocks];
    updated.splice(activeBlock, 1);

    setBlocks(updated);
    setActiveBlock(0);
  };

  // ================= SIGNATURE DELETE =================
  const deleteSignature = (index) => {
    const updated = [...signatures];
    updated.splice(index, 1);
    setSignatures(updated);
  };

  // ================= BLOCK DRAG =================
  const startBlockDrag = (index) => {
    setActiveBlock(index);
    setDragBlock(index);
  };

  const startBlockResize = (e, index) => {
    e.stopPropagation();
    setActiveBlock(index);
    setResizeBlock(index);
  };

  // ================= SIGNATURE DRAG =================
  const startSignatureDrag = (e, index) => {
    e.stopPropagation();

    const rect = e.target.getBoundingClientRect();

    setDragSigIndex(index);
    setResizeSigIndex(null);

    setSigOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const startSignatureResize = (e, index) => {
    e.stopPropagation();
    setResizeSigIndex(index);
    setDragSigIndex(null);
  };

  // ================= MOUSE MOVE ENGINE =================
  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();

    if (dragBlock !== null) {
      const updated = [...blocks];
      const block = updated[dragBlock];

      updated[dragBlock] = {
        ...block,
        x: e.clientX - rect.left - block.width / 2,
        y: e.clientY - rect.top - block.height / 2,
      };

      setBlocks(updated);
    }

    if (resizeBlock !== null) {
      const updated = [...blocks];
      const block = updated[resizeBlock];

      updated[resizeBlock] = {
        ...block,
        width: Math.max(100, e.clientX - rect.left - block.x),
        height: Math.max(50, e.clientY - rect.top - block.y),
      };

      setBlocks(updated);
    }

    if (dragSigIndex !== null) {
      const updated = [...signatures];
      const sig = updated[dragSigIndex];

      updated[dragSigIndex] = {
        ...sig,
        x: e.clientX - rect.left - sigOffset.x,
        y: e.clientY - rect.top - sigOffset.y,
      };

      setSignatures(updated);
    }

    if (resizeSigIndex !== null) {
      const updated = [...signatures];
      const sig = updated[resizeSigIndex];

      const newSize = Math.max(50, e.clientX - rect.left - sig.x);

      updated[resizeSigIndex] = {
        ...sig,
        size: newSize,
      };

      setSignatures(updated);
    }
  };

  const stopActions = () => {
    setDragBlock(null);
    setResizeBlock(null);
    setDragSigIndex(null);
    setResizeSigIndex(null);
  };

  // ================= PLACE SIGNATURE =================
  const placeSignature = () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Draw signature first ✍");
      return;
    }

    const block = blocks[activeBlock];
    const image = sigPadRef.current.getCanvas().toDataURL("image/png");

    setSignatures([
      ...signatures,
      {
        x: block.x + 10,
        y: block.y + 10,
        size: block.width - 20,
        page: selectedPage, // ⭐⭐⭐ CRITICAL FIX
        image,
      },
    ]);

    sigPadRef.current.clear();
  };

  const finalizePDF = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://localhost:5000/api/docs/sign",
        { filename, signatures },
        { headers: { Authorization: `Bearer ${token}` } }
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

      {/* ✅ PAGE SELECTOR ⭐⭐⭐ */}
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

      <button onClick={addBlock}>➕ Add Signature Space</button>
      <button onClick={deleteBlock} style={{ marginLeft: 10 }}>
        ❌ Delete Space
      </button>
      <button onClick={placeSignature} style={{ marginLeft: 10 }}>
        ✅ Place Signature
      </button>
      <button onClick={finalizePDF} style={{ marginLeft: 10 }}>
        🚀 Finalize PDF
      </button>

      <br /><br />

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={stopActions}
        style={{
          position: "relative",
          width: 800,
          height: 500,
          border: "2px solid #ccc",
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

        {/* BLOCKS */}
        {blocks.map((block, index) => (
          <div
            key={index}
            onMouseDown={() => startBlockDrag(index)}
            style={{
              position: "absolute",
              left: block.x,
              top: block.y,
              width: block.width,
              height: block.height,
              border:
                activeBlock === index
                  ? "2px solid green"
                  : "2px dashed gray",
              background: "rgba(0,255,0,0.05)",
              cursor: "move",
            }}
          >
            <div
              onMouseDown={(e) => startBlockResize(e, index)}
              style={{
                width: 12,
                height: 12,
                background: "green",
                position: "absolute",
                right: -6,
                bottom: -6,
                cursor: "nwse-resize",
              }}
            />
          </div>
        ))}

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
                onMouseDown={(e) => startSignatureDrag(e, index)}
                onDoubleClick={() => deleteSignature(index)}
                style={{
                  width: sig.size,
                  border: "1px dashed red",
                }}
              />

              <div
                onMouseDown={(e) => startSignatureResize(e, index)}
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

      <br /><br />

      <SignatureCanvas
        ref={sigPadRef}
        penColor="black"
        canvasProps={{ width: 500, height: 200 }}
      />
    </div>
  );
}

export default PDFViewer;
