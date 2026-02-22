import { useState } from "react";

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    try {
      const res = await fetch("https://doc-sign-app.onrender.com/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      console.log("SERVER RESPONSE:", data);

      if (!res.ok) {
        alert(data.message || "Login failed");
        return;
      }

      // ✅ Save JWT token
      localStorage.setItem("token", data.token);

      console.log("TOKEN SAVED:", data.token);

      alert("Login successful ✅");

      // ✅ Redirect to dashboard (IMPORTANT FOR DAY 4)
      window.location.href = "/dashboard";

    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert("Server not reachable ❌ (Check backend)");
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2 className="login-title">Sign in to DocSign</h2>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-row">
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-row">
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-row">
            <button className="btn" type="submit">Login</button>
          </div>

          <div className="login-help">Don't have an account? Contact the admin to create one.</div>
        </form>
      </div>
    </div>
  );
}

export default Login;
