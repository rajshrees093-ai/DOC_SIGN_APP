console.log("APP.JS EXECUTED ✅");

const express = require("express");
const cors = require("cors");

/* ✅ Import Routes */
const authRoutes = require("./routes/authRoutes");
const docsRoutes = require("./routes/docsRoutes");

/* ✅ ADD THIS IMPORT */
const signatureRoutes = require("./routes/signatureRoutes");

const app = express();

/* ✅ Middleware */
app.use(cors());
app.use(express.json());

/* ✅ Static uploads folder */
app.use(express.static("uploads"));

/* ✅ Routes */
app.use("/api/auth", authRoutes);
app.use("/api/docs", docsRoutes);

/* ✅ ADD THIS ROUTE (CRITICAL FIX) */
app.use("/api/signatures", signatureRoutes);

/* ✅ Health check */
app.get("/", (req, res) => res.send("API running ✅"));

module.exports = app;
