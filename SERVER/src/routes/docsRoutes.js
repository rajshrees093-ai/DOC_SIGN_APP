console.log("DOCS ROUTES FILE LOADED ✅");

const express = require("express");
const multer = require("multer");
const path = require("path");

const supabase = require("../config/supabase");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// ✅ Multer Storage Config
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });


// =========================
// ✅ GET USER DOCUMENTS
// =========================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("owner", req.user.id);

    if (error) {
      console.error("FETCH ERROR:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json(data);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ UPLOAD DOCUMENT
// =========================
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;

      const { error } = await supabase.from("documents").insert([
        {
          filename: file.originalname, // Visible name
          path: file.filename,         // Stored filename
          owner: req.user.id,
        },
      ]);

      if (error) {
        console.error("SUPABASE ERROR:", error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: "Upload successful ✅" });

    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);


// =========================
// ✅ DELETE DOCUMENT
// =========================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("owner", req.user.id); // Security check ⭐

    if (error) {
      console.error("DELETE ERROR:", error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "Deleted successfully ✅" });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
