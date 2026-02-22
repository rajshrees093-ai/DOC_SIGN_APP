const express = require("express");
const cors = require("cors");
const path = require("path");   // ✅ REQUIRED

const authRoutes = require("./routes/authRoutes");
const docsRoutes = require("./routes/docsRoutes");
const signatureRoutes = require("./routes/signatureRoutes.js");

const app = express();

app.use(cors());
app.use(express.json());

/* ✅ CRITICAL FIX */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/docs", docsRoutes);
app.use("/api/signatures", signatureRoutes);

app.get("/", (req, res) => res.send("API running ✅"));

module.exports = app;