import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PDFViewer from "./pages/PDFViewer";
import PublicSign from "./pages/PublicSign";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preview/:filename"
        element={
          <ProtectedRoute>
            <PDFViewer />
          </ProtectedRoute>
        }
      />

      {/* Public signer access */}
      <Route path="/public-sign/:token" element={<PublicSign />} />
    </Routes>
  );
}

export default App;
