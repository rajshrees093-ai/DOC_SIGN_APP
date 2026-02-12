require("dotenv").config();

const app = require("./app");   // ⭐ IMPORTANT LINE

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
