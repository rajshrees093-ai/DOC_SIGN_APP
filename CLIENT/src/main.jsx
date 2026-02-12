import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ✅ REQUIRED FOR react-pdf (VERY IMPORTANT)
import { pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

// ✅ Tell react-pdf where worker lives
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
