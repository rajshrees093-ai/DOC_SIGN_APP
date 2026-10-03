import { useState } from "react";

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
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

          <div className="form-row flex gap-2">
            <button className="btn flex-1" type="submit">Login</button>
            <button
              type="button"
              className="btn btn-secondary text-xs px-2"
              onClick={() => {
                setEmail("test@example.com");
                setPassword("password123");
              }}
            >
              Fill Test Credentials 🔑
            </button>
          </div>

          <div className="login-help text-xs bg-slate-50 p-2 rounded border border-slate-200 mt-2">
            <span className="font-semibold text-slate-700">Test Account:</span>
            <br />
            Email: <code className="bg-slate-200 px-1 rounded text-indigo-700">test@example.com</code>
            <br />
            Password: <code className="bg-slate-200 px-1 rounded text-indigo-700">password123</code>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
