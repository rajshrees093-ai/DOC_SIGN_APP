console.log("APP.JS EXECUTED ✅");
const express = require("express");
const cors = require("cors");
console.log("Docs route loaded");



const authRoutes = require("./routes/authRoutes");
const docsRoutes = require("./routes/docsRoutes");



const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/docs", docsRoutes);

app.get("/", (req, res) => res.send("API running"));

module.exports = app;
