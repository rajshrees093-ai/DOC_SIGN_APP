require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 5000;

/* ✅ START SERVER */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT} (0.0.0.0)`);
});
