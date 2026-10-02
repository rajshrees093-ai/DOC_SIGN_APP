import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { DndContext, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import SignatureCanvas from "react-signature-canvas";
import axios from "axios";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

function DraggableSignatureStamp({ x, y, width, height, image, onResize }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: "public-sig-stamp",
  });

  const style = {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: isDragging ? 50 : 20,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group cursor-move select-none border-2 border-indigo-500 rounded bg-white/80 backdrop-blur-xs flex items-center justify-center shadow-lg"
      {...listeners}
      {...attributes}
    >
      <img src={image} alt="Signature" className="w-full h-full object-contain pointer-events-none p-1" />
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onResize(e);
        }}
        className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 rounded cursor-se-resize shadow"
        title="Drag to resize"
      />
    </div>
  );
}

function PublicSign() {
  const { token } = useParams();

  const sigPadRef = useRef(null);
  const pageContainerRef = useRef(null);

  const [doc, setDoc] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState({ width: 600, height: 800 });

  const [sigImage, setSigImage] = useState(null);
  const [sigPos, setSigPos] = useState({ x: 100, y: 400, width: 180, height: 70 });
  const [isSigning, setIsSigning] = useState(false);
  const [signedFileUrl, setSignedFileUrl] = useState(null);

  useEffect(() => {
    fetchDocument();
  }, [token]);

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

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  const handlePageRenderSuccess = () => {
    if (pageContainerRef.current) {
      const rect = pageContainerRef.current.getBoundingClientRect();
      setPageSize({ width: rect.width, height: rect.height });
    }
  };

  const handleDragEnd = (event) => {
    const { delta } = event;
    if (!delta) return;

    setSigPos((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(pageSize.width - prev.width, prev.x + delta.x)),
      y: Math.max(0, Math.min(pageSize.height - prev.height, prev.y + delta.y)),
    }));
  };

  const handleApplySignature = () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Please draw your signature in the box below first ✍");
      return;
    }
    const dataUrl = sigPadRef.current.getCanvas().toDataURL("image/png");
    setSigImage(dataUrl);
  };

  const finalizeSignature = async () => {
    if (!sigImage) {
      alert("Please draw and apply your signature first ✍");
      return;
    }

    if (!pageContainerRef.current) {
      alert("Document is still loading");
      return;
    }

    const rect = pageContainerRef.current.getBoundingClientRect();
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Relative percentage coordinates (x%, y%)
    const xPercent = (sigPos.x / displayWidth) * 100;
    const yPercent = (sigPos.y / displayHeight) * 100;
    const widthPercent = (sigPos.width / displayWidth) * 100;
    const heightPercent = (sigPos.height / displayHeight) * 100;

    try {
      setIsSigning(true);
      const res = await axios.post("http://localhost:5000/api/docs/sign", {
        filename: doc.path,
        signatures: [
          {
            page: currentPage,
            image: sigImage,
            xPercent,
            yPercent,
            widthPercent,
            heightPercent,
          },
        ],
      });

      const signedFile = res.data.file;
      const fullUrl = `http://localhost:5000/uploads/${signedFile}`;
      setSignedFileUrl(fullUrl);
      window.open(fullUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Signing failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Loading document for signature...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-xl font-bold text-slate-800 mt-3">{error}</h2>
          <p className="text-sm text-slate-500 mt-2">
            Please ask the document owner to send a new invitation link.
          </p>
        </div>
      </div>
    );
  }

  const pdfStreamUrl = `http://localhost:5000/api/docs/file/${doc.path}`;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-600">
              Signer Portal
            </span>
            <h1 className="text-lg font-bold text-slate-900">{doc.filename}</h1>
          </div>

          {/* Page controls */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2 py-0.5 rounded hover:bg-slate-200 disabled:opacity-30 font-bold"
            >
              ‹
            </button>
            <span className="text-xs font-semibold text-slate-600">
              Page {currentPage} of {numPages || "..."}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(numPages || 1, p + 1))}
              disabled={!numPages || currentPage >= numPages}
              className="px-2 py-0.5 rounded hover:bg-slate-200 disabled:opacity-30 font-bold"
            >
              ›
            </button>
          </div>

          <button
            onClick={finalizeSignature}
            disabled={isSigning || !sigImage}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            {isSigning ? "Signing Document..." : "✅ Complete & Submit Signature"}
          </button>
        </div>
      </header>

      {/* Completion Banner */}
      {signedFileUrl && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3 text-center text-sm text-emerald-800">
          Document signed successfully!{" "}
          <a
            href={signedFileUrl}
            target="_blank"
            rel="noreferrer"
            className="font-bold underline text-emerald-950"
          >
            Download Completed PDF ↗
          </a>
        </div>
      )}

      {/* Workspace */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* PDF Page Canvas */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <DndContext onDragEnd={handleDragEnd}>
            <div
              ref={pageContainerRef}
              className="relative rounded-lg shadow-xl overflow-hidden bg-white border border-slate-200"
            >
              <Document
                file={pdfStreamUrl}
                onLoadSuccess={handleDocumentLoadSuccess}
                loading={
                  <div className="w-[500px] h-[700px] flex items-center justify-center text-slate-400">
                    Loading PDF preview...
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderSuccess={handlePageRenderSuccess}
                />
              </Document>

              {/* Render Signature Stamp on Document */}
              {sigImage && (
                <DraggableSignatureStamp
                  x={sigPos.x}
                  y={sigPos.y}
                  width={sigPos.width}
                  height={sigPos.height}
                  image={sigImage}
                  onResize={() => {}}
                />
              )}
            </div>
          </DndContext>
          {sigImage && (
            <p className="text-xs text-slate-500 mt-2">
              💡 Tip: Click and drag your signature to reposition it on the page.
            </p>
          )}
        </div>

        {/* Signature Creation Panel */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-800">✍ Create Your Signature</h2>
          <p className="text-xs text-slate-500">
            Draw your signature in the box below, then click &quot;Apply to Document&quot; to place it.
          </p>

          <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50">
            <SignatureCanvas
              ref={sigPadRef}
              penColor="black"
              canvasProps={{
                width: 320,
                height: 160,
                className: "w-full cursor-crosshair",
              }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                sigPadRef.current?.clear();
                setSigImage(null);
              }}
              className="flex-1 py-1.5 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              onClick={handleApplySignature}
              className="flex-2 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              Apply to Document ➔
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PublicSign;
