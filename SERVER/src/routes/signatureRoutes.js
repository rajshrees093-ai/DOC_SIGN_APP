const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: "No signature received" });
    }

    console.log("SIGNATURE RECEIVED ✅");

    // ⭐ Later → Save into Supabase / File / DB

    res.json({ message: "Signature stored successfully" });

  } catch (err) {
    console.error("SIGNATURE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
