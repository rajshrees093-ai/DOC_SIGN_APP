import { useState } from "react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
  e.preventDefault();

  try {fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        email,
        password,
    }),
})


    const data = await res.json();

    console.log("SERVER RESPONSE:", data);   // ⭐ IMPORTANT

    if (!res.ok) {
      alert(data.message);
      return;
    }

    // ⭐ SAVE TOKEN
    localStorage.setItem("token", data.token);

    console.log("TOKEN SAVED:", data.token); // ⭐ IMPORTANT

    alert(data.message); // uses backend message

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    alert("Server not reachable");
  }
}



  return (
    <div>
      <h2>Login</h2>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <br />

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;
