require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

/* ✅ Correct static path */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/docs", require("./routes/docsRoutes"));

app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});
