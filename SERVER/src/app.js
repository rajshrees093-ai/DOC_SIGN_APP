const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const docsRoutes = require("./routes/docsRoutes");

const app = express();

app.use(cors());
app.use(express.json());   // Reads JSON body

// ✅ WRITE IT RIGHT HERE
app.use(express.static("uploads"));

// Routes (must come AFTER middleware)
app.use("/api/auth", authRoutes);
app.use("/api/docs", docsRoutes);

app.get("/", (req, res) => {
  res.send("API is running");
});

module.exports = app;
