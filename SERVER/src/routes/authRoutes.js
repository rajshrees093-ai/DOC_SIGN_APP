//import reqd packages
const express = require("express"); //use to create api routes like get, post
const bcrypt = require("bcryptjs"); //used to encrypt (hash) passwords
const jwt= require("jsonwebtoken"); //used later for logins not directly used but imported for consistency
const mongoose = require("mongoose");
const User = require("../models/User"); //represents users collection in database

//create route
const router = express.Router(); //mini expresss app used to keep routes modular

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */

//register route
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 🚨 TEMP: skip DB when Mongo is unavailable
    if (!mongoose.connection.readyState) {
      return res.status(201).json({
        message: "User registered successfully (DB offline mode)",
        user: { name, email },
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id,
    });
  } catch (error) {
  console.error("REGISTER ERROR 👉", error);
  res.status(500).json({
    message: "Server error",
    error: error.message
  });
}

});

//login route
// LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    // 1️⃣ Get email and password from request body
    const { email, password } = req.body;

    // 2️⃣ Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 3️⃣ Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 4️⃣ Compare entered password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 5️⃣ Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 6️⃣ Send success response with token
    res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// PROTECTED ROUTE (TEST)
const auth = require("../middleware/authMiddleware");

router.get("/profile", auth, (req, res) => {
  res.status(200).json({
    message: "Access granted to protected route",
    user: req.user,
  });
});

//export router
module.exports=router;