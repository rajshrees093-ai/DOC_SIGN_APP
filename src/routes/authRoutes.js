const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const router = express.Router();

// In-memory user store for offline / dev mode
const localUsers = new Map();

// Seed default test user
(async () => {
  const hash = await bcrypt.hash("password123", 10);
  localUsers.set("test@example.com", {
    id: "demo-user-123",
    email: "test@example.com",
    password: hash,
  });
})();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Try Supabase first
  try {
    const { error } = await supabase
      .from("users")
      .insert([{ email, password: hashedPassword }]);

    if (!error) {
      return res.json({ message: "User registered" });
    }
  } catch (err) {
    console.warn("Supabase register error:", err.message);
  }

  // Local fallback
  localUsers.set(email.toLowerCase(), {
    id: `local-user-${Date.now()}`,
    email,
    password: hashedPassword,
  });

  res.json({ message: "User registered (local session)" });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Built-in test account check
  if (normalizedEmail === "test@example.com" && password === "password123") {
    const token = jwt.sign(
      { id: "demo-user-123", email: "test@example.com" },
      process.env.JWT_SECRET || "supersecretkey"
    );
    return res.json({ token, message: "Logged in as test user" });
  }

  // 2. Try Supabase
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalizedEmail);

    if (!error && data && data.length > 0) {
      const user = data[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "supersecretkey");
        return res.json({ token });
      }
    }
  } catch (err) {
    console.warn("Supabase login unavailable:", err.message);
  }

  // 3. Try local registered users
  const localUser = localUsers.get(normalizedEmail);
  if (localUser) {
    const isMatch = await bcrypt.compare(password, localUser.password);
    if (isMatch) {
      const token = jwt.sign(
        { id: localUser.id, email: localUser.email },
        process.env.JWT_SECRET || "supersecretkey"
      );
      return res.json({ token });
    }
  }

  return res.status(400).json({ message: "Invalid credentials" });
});

module.exports = router;
