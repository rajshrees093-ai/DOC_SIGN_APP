import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PDFViewer from "./pages/PDFViewer";

function App() {
  return (
    <Routes>
      <Route path="/preview/:filename" element={<PDFViewer />} />
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

export default App;
