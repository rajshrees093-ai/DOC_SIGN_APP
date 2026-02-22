import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PDFViewer from "./pages/PDFViewer";
import PublicSign from "./pages/PublicSign";   // ⭐ REQUIRED

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/preview/:filename" element={<PDFViewer />} />

      {/* ⭐ CRITICAL DAY-9 ROUTE */}
      <Route path="/public-sign/:token" element={<PublicSign />} />
    </Routes>
  );
}

export default App;
