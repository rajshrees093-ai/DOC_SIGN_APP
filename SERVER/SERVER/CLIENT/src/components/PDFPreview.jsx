import { Document, Page } from "react-pdf";
import { useState } from "react";

export default function PDFPreview({ url }) {
  const [numPages, setNumPages] = useState(null);

  return (
    <div className="mt-4">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      >
        {Array.from(new Array(numPages), (_, i) => (
          <Page key={i} pageNumber={i + 1} />
        ))}
      </Document>
    </div>
  );
}
