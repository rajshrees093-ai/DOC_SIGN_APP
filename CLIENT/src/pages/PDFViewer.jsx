import { useParams, Link } from "react-router-dom";
import { useRef, useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import SignatureCanvas from "react-signature-canvas";
import axios from "axios";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// Draggable Signature Item Component
function DraggableSignatureItem({ sig, onRemove, onResize, isSelected, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: sig.id,
  });

  const style = {
    position: "absolute",
    left: `${sig.x}px`,
    top: `${sig.y}px`,
    width: `${sig.width}px`,
    height: `${sig.height}px`,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 50 : 20,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(sig.id);
      }}
      className={`group cursor-move select-none border-2 rounded ${
        isSelected ? "border-indigo-600 ring-2 ring-indigo-300" : "border-indigo-400 border-dashed"
      } bg-white/70 backdrop-blur-xs flex items-center justify-center`}
      {...listeners}
      {...attributes}
    >
      <img
        src={sig.image}
        alt="Signature"
        className="w-full h-full object-contain pointer-events-none p-1"
      />

      {/* Delete button */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(sig.id);
        }}
        className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow opacity-80 group-hover:opacity-100 transition"
        title="Remove signature"
      >
        ×
      </button>

      {/* Resize Handle */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onResize(e, sig.id);
        }}
        className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 rounded cursor-se-resize shadow"
        title="Drag to resize"
      />
    </div>
  );
}

// Draggable Placeholder Box Component (DocuSign field block)
function DraggableBlockItem({ block, isSelected, onSelect, onRemove, onResize }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
  });

  const style = {
    position: "absolute",
    left: `${block.x}px`,
    top: `${block.y}px`,
    width: `${block.width}px`,
    height: `${block.height}px`,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 40 : 15,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id);
      }}
      className={`group cursor-move select-none border-2 rounded flex flex-col items-center justify-center transition-colors ${
        isSelected
          ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-200"
          : "border-emerald-400 border-dashed bg-emerald-50/20"
      }`}
      {...listeners}
      {...attributes}
    >
      <span className="text-xs font-semibold text-emerald-700 pointer-events-none">
        ✍ Sign Here
      </span>

      {/* Delete button */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove(block.id);
        }}
        className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow opacity-80 group-hover:opacity-100 transition"
        title="Delete box"
      >
        ×
      </button>

      {/* Resize Handle */}
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onResize(e, block.id);
        }}
        className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-600 rounded cursor-se-resize shadow"
        title="Drag to resize"
      />
    </div>
  );
}

// Droppable Page Overlay
function PageDroppableArea({ children, pageContainerRef, onPageClick }) {
  const { setNodeRef } = useDroppable({
    id: "pdf-page-droppable",
  });

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        if (pageContainerRef) pageContainerRef.current = el;
      }}
      onClick={onPageClick}
      className="relative select-none overflow-hidden rounded shadow-xl bg-white"
    >
      {children}
    </div>
  );
}

function PDFViewer() {
  const { filename } = useParams();

  const sigPadRef = useRef(null);
  const pageContainerRef = useRef(null);

  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [pageSize, setPageSize] = useState({ width: 600, height: 800 });

  const [blocks, setBlocks] = useState([
    { id: "block-1", x: 150, y: 300, width: 180, height: 70, page: 1 },
  ]);
  const [selectedBlockId, setSelectedBlockId] = useState("block-1");

  const [signatures, setSignatures] = useState([]);
  const [selectedSigId, setSelectedSigId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [signedFileUrl, setSignedFileUrl] = useState(null);
  const [notification, setNotification] = useState(null);

  // Resize state
  const [resizingItem, setResizingItem] = useState(null);

  // PDF URL streamed from backend
  const pdfUrl = `http://localhost:5000/api/docs/file/${filename}`;

  const showToast = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    showToast(`PDF loaded successfully (${numPages} pages) ✅`, "success");
  };

  const handlePageRenderSuccess = (page) => {
    if (pageContainerRef.current) {
      const rect = pageContainerRef.current.getBoundingClientRect();
      setPageSize({
        width: rect.width,
        height: rect.height,
      });
    }
  };

  // ================= @dnd-kit DRAG HANDLER =================
  const handleDragEnd = (event) => {
    const { active, delta } = event;
    if (!delta || (delta.x === 0 && delta.y === 0)) return;

    const id = active.id;

    // Check if dragging a signature
    setSignatures((prev) =>
      prev.map((sig) => {
        if (sig.id === id) {
          const newX = Math.max(0, Math.min(pageSize.width - sig.width, sig.x + delta.x));
          const newY = Math.max(0, Math.min(pageSize.height - sig.height, sig.y + delta.y));
          return { ...sig, x: newX, y: newY };
        }
        return sig;
      })
    );

    // Check if dragging a placeholder block
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id === id) {
          const newX = Math.max(0, Math.min(pageSize.width - block.width, block.x + delta.x));
          const newY = Math.max(0, Math.min(pageSize.height - block.height, block.y + delta.y));
          return { ...block, x: newX, y: newY };
        }
        return block;
      })
    );
  };

  // ================= RESIZING LOGIC =================
  const startResize = (e, id, type) => {
    e.stopPropagation();
    const item =
      type === "sig"
        ? signatures.find((s) => s.id === id)
        : blocks.find((b) => b.id === id);

    if (!item) return;

    setResizingItem({
      id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      initialWidth: item.width,
      initialHeight: item.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizingItem) return;

      const deltaX = e.clientX - resizingItem.startX;
      const deltaY = e.clientY - resizingItem.startY;

      const newWidth = Math.max(60, resizingItem.initialWidth + deltaX);
      const newHeight = Math.max(30, resizingItem.initialHeight + deltaY);

      if (resizingItem.type === "sig") {
        setSignatures((prev) =>
          prev.map((s) => (s.id === resizingItem.id ? { ...s, width: newWidth, height: newHeight } : s))
        );
      } else {
        setBlocks((prev) =>
          prev.map((b) => (b.id === resizingItem.id ? { ...b, width: newWidth, height: newHeight } : b))
        );
      }
    };

    const handleMouseUp = () => {
      if (resizingItem) setResizingItem(null);
    };

    if (resizingItem) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingItem]);

  // ================= ADD / REMOVE BLOCKS =================
  const addBlock = () => {
    const newId = `block-${Date.now()}`;
    const newBlock = {
      id: newId,
      x: 100,
      y: 150,
      width: 180,
      height: 70,
      page: currentPage,
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newId);
    showToast("Added signature placeholder box", "info");
  };

  const removeBlock = (id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const removeSignature = (id) => {
    setSignatures((prev) => prev.filter((s) => s.id !== id));
    if (selectedSigId === id) setSelectedSigId(null);
  };

  // ================= CAPTURE SIGNATURE FROM PAD =================
  const applySignature = () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Please draw your signature first ✍");
      return;
    }

    const image = sigPadRef.current.getCanvas().toDataURL("image/png");

    // Position signature into selected block if available, or default coordinates
    const targetBlock = blocks.find((b) => b.id === selectedBlockId && b.page === currentPage);
    const newSigId = `sig-${Date.now()}`;

    const newSig = {
      id: newSigId,
      image,
      page: currentPage,
      x: targetBlock ? targetBlock.x : 120,
      y: targetBlock ? targetBlock.y : 200,
      width: targetBlock ? targetBlock.width : 160,
      height: targetBlock ? targetBlock.height : 60,
    };

    setSignatures([...signatures, newSig]);
    setSelectedSigId(newSigId);
    setIsModalOpen(false);
    sigPadRef.current.clear();
    showToast("Signature placed on page! You can drag to position it.", "success");
  };

  // ================= FINALIZE AND SIGN (Step 9 Percentage Coordinates) =================
  const finalizePDF = async () => {
    if (signatures.length === 0) {
      alert("Please add at least one signature before finalizing ✍");
      return;
    }

    if (!pageContainerRef.current) {
      alert("PDF page is not loaded yet");
      return;
    }

    const rect = pageContainerRef.current.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Convert DOM pixels to relative percentages (x%, y%)
    const normalizedSignatures = signatures.map((sig) => {
      const xPercent = (sig.x / displayWidth) * 100;
      const yPercent = (sig.y / displayHeight) * 100;
      const widthPercent = (sig.width / displayWidth) * 100;
      const heightPercent = (sig.height / displayHeight) * 100;

      return {
        page: sig.page,
        image: sig.image,
        xPercent,
        yPercent,
        widthPercent,
        heightPercent,
      };
    });

    try {
      setIsFinalizing(true);
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://localhost:5000/api/docs/sign",
        {
          filename,
          signatures: normalizedSignatures,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const signedFile = res.data.file;
      const fullUrl = `http://localhost:5000/uploads/${signedFile}`;
      setSignedFileUrl(fullUrl);
      showToast("PDF signed successfully! 🎉", "success");
    } catch (err) {
      console.error("SIGN ERROR:", err);
      alert("Signing failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition ${
            notification.type === "success"
              ? "bg-emerald-600 text-white"
              : notification.type === "error"
              ? "bg-rose-600 text-white"
              : "bg-slate-800 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Top Header & Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-slate-500 hover:text-slate-800 font-medium text-sm flex items-center gap-1"
            >
              ← Back to Dashboard
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="font-semibold text-slate-800 text-base truncate max-w-xs md:max-w-md">
              {filename}
            </h1>
          </div>

          {/* Page & Zoom Controls */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2 py-1 rounded hover:bg-slate-200 disabled:opacity-30 font-bold text-slate-700"
            >
              ‹
            </button>
            <span className="text-xs font-semibold text-slate-600">
              Page {currentPage} of {numPages || "..."}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages || 1, p + 1))}
              disabled={!numPages || currentPage >= numPages}
              className="px-2 py-1 rounded hover:bg-slate-200 disabled:opacity-30 font-bold text-slate-700"
            >
              ›
            </button>

            <span className="text-slate-300 mx-1">|</span>

            <button
              onClick={() => setScale((s) => Math.max(0.7, s - 0.1))}
              className="px-2 py-0.5 rounded hover:bg-slate-200 text-xs font-semibold text-slate-700"
              title="Zoom out"
            >
              −
            </button>
            <span className="text-xs font-semibold text-slate-600">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale((s) => Math.min(1.8, s + 0.1))}
              className="px-2 py-0.5 rounded hover:bg-slate-200 text-xs font-semibold text-slate-700"
              title="Zoom in"
            >
              +
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={addBlock}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition flex items-center gap-1"
            >
              ➕ Add Sign Box
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5"
            >
              ✍ Draw Signature
            </button>

            <button
              onClick={finalizePDF}
              disabled={isFinalizing || signatures.length === 0}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1.5"
            >
              {isFinalizing ? "Finalizing..." : "🚀 Finalize PDF"}
            </button>
          </div>
        </div>
      </header>

      {/* Signed Result Banner */}
      {signedFileUrl && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-center text-sm text-emerald-800 flex items-center justify-center gap-3">
          <span>Document successfully signed & preserved!</span>
          <a
            href={signedFileUrl}
            target="_blank"
            rel="noreferrer"
            className="font-bold underline text-emerald-900 hover:text-emerald-700"
          >
            View / Download Signed PDF ↗
          </a>
        </div>
      )}

      {/* Main PDF Canvas Area */}
      <main className="flex-1 overflow-auto p-6 flex justify-center items-start">
        <DndContext onDragEnd={handleDragEnd}>
          <PageDroppableArea
            pageContainerRef={pageContainerRef}
            onPageClick={() => {
              setSelectedBlockId(null);
              setSelectedSigId(null);
            }}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={handleDocumentLoadSuccess}
              loading={
                <div className="w-[600px] h-[800px] flex flex-col items-center justify-center bg-white text-slate-400 gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium">Loading document via react-pdf...</p>
                </div>
              }
              error={
                <div className="w-[600px] h-[400px] flex flex-col items-center justify-center bg-white text-rose-500 p-6 text-center gap-2">
                  <span className="text-3xl">⚠️</span>
                  <p className="font-semibold">Failed to render PDF</p>
                  <p className="text-xs text-slate-500">
                    Ensure server is running and file exists in storage.
                  </p>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onRenderSuccess={handlePageRenderSuccess}
              />
            </Document>

            {/* Render Draggable Placeholder Blocks for this page */}
            {blocks
              .filter((b) => b.page === currentPage)
              .map((block) => (
                <DraggableBlockItem
                  key={block.id}
                  block={block}
                  isSelected={selectedBlockId === block.id}
                  onSelect={(id) => {
                    setSelectedBlockId(id);
                    setSelectedSigId(null);
                  }}
                  onRemove={removeBlock}
                  onResize={(e, id) => startResize(e, id, "block")}
                />
              ))}

            {/* Render Draggable Signatures for this page */}
            {signatures
              .filter((s) => s.page === currentPage)
              .map((sig) => (
                <DraggableSignatureItem
                  key={sig.id}
                  sig={sig}
                  isSelected={selectedSigId === sig.id}
                  onSelect={(id) => {
                    setSelectedSigId(id);
                    setSelectedBlockId(null);
                  }}
                  onRemove={removeSignature}
                  onResize={(e, id) => startResize(e, id, "sig")}
                />
              ))}
          </PageDroppableArea>
        </DndContext>
      </main>

      {/* Signature Pad Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">✍ Draw Your Signature</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Use your mouse or finger to draw your official signature. It will be embedded onto the
              active page at the selected position.
            </p>

            <div className="mt-4 border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
              <SignatureCanvas
                ref={sigPadRef}
                penColor="black"
                canvasProps={{
                  width: 460,
                  height: 180,
                  className: "w-full cursor-crosshair",
                }}
              />
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => sigPadRef.current?.clear()}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Clear Pad
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applySignature}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
                >
                  Apply Signature ✅
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PDFViewer;
