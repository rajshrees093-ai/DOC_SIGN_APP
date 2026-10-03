require("dotenv").config();

const app = require("./app");   // loads app.js

const PORT = process.env.PORT || 5000;

/* ✅ START SERVER */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});