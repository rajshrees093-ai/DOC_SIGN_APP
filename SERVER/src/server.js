require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

/* ✅ Middleware */
app.use(cors());
app.use(express.json());

/* ✅ Static uploads folder */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/* ✅ Routes */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/docs", require("./routes/docsRoutes"));

/* ✅ ADD THIS LINE (Day 11 Fix) */
app.use("/api/signatures", require("./routes/signatureRoutes"));

/* ✅ Health check */
app.get("/", (req, res) => {
  res.send("API Running ✅");
});

/* ✅ Use env PORT if present */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
