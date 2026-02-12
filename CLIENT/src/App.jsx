import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";   // ✅ Day 4 page

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ✅ Check token when app loads
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setIsLoggedIn(true);
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* ✅ Default Route */}
        <Route
          path="/"
          element={
            isLoggedIn ? <Navigate to="/dashboard" /> : <Login onLoginSuccess={() => setIsLoggedIn(true)} />
          }
        />

        {/* ✅ Login Page */}
        <Route
          path="/login"
          element={<Login onLoginSuccess={() => setIsLoggedIn(true)} />}
        />

        {/* ✅ Protected Dashboard */}
        <Route
          path="/dashboard"
          element={
            isLoggedIn ? <Dashboard /> : <Navigate to="/login" />
          }
        />

        {/* ✅ Protected Profile */}
        <Route
          path="/profile"
          element={
            isLoggedIn ? <Profile onLogout={handleLogout} /> : <Navigate to="/login" />
          }
        />

        {/* ✅ Fallback Route */}
        <Route
          path="*"
          element={<Navigate to="/" />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
