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
    <div>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <br /><br />

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <br /><br />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
