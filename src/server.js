require("dotenv").config();

const app = require("./app");   // loads app.js

const PORT = process.env.PORT || 5000;

<<<<<<< HEAD
/* ✅ START SERVER */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
=======
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT} (0.0.0.0)`);
});
>>>>>>> 962a2f5 (Save work)
