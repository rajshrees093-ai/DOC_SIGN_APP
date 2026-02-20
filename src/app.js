const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const docsRoutes = require("./routes/docsRoutes");
const signatureRoutes = require("./routes/signatureRoutes.js");
 // ✅ REQUIRED

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/docs", docsRoutes);

/* ✅ CRITICAL LINE */
app.use("/api/signatures", signatureRoutes);

app.get("/", (req, res) => res.send("API running ✅"));

module.exports = app;
