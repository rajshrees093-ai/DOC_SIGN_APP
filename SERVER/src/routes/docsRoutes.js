console.log("DOCS ROUTES FILE LOADED ✅");

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");

const supabase = require("../config/supabase");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// =========================
// ✅ Multer Storage Config
// =========================
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
          filename: file.originalname,
          path: file.filename,
          owner: req.user.id,
          status: "pending",        // ⭐ DEFAULT STATUS
          decision: null,
          decision_reason: null,
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
      .eq("owner", req.user.id);

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


// =========================
// ✅ SIGN PDF (MULTI-SIGNATURE + PAGE SUPPORT)
// =========================
router.post("/sign", authMiddleware, async (req, res) => {
  try {
    const { filename, signatures } = req.body;

    if (!filename || !signatures || signatures.length === 0) {
      return res.status(400).json({ error: "Missing signature data" });
    }

    const filePath = path.join("uploads", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "PDF not found" });
    }

    const existingPdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    const pages = pdfDoc.getPages();

    for (const sig of signatures) {
      const { x, y, image, size, page } = sig;

      const pageIndex = Number(page) - 1;

      if (!pages[pageIndex]) {
        return res.status(400).json({ error: "Invalid page number" });
      }

      const base64Data = image.replace(/^data:image\/png;base64,/, "");
      const pngBytes = Buffer.from(base64Data, "base64");

      const pngImage = await pdfDoc.embedPng(pngBytes);

      pages[pageIndex].drawImage(pngImage, {
        x: Number(x),
        y: Number(y),
        width: Number(size),
        height: Number(size) / 2,
      });
    }

    const signedPdfBytes = await pdfDoc.save();

    const signedFilename = `signed-${filename}`;
    const signedPath = path.join("uploads", signedFilename);

    fs.writeFileSync(signedPath, signedPdfBytes);

    console.log("SIGNATURE APPLIED ✅");

    res.json({ file: signedFilename });

  } catch (err) {
    console.error("SIGN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ GET PDF PAGE COUNT
// =========================
router.get("/pages/:filename", authMiddleware, async (req, res) => {
  try {
    const { filename } = req.params;

    const filePath = path.join("uploads", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const totalPages = pdfDoc.getPages().length;

    res.json({ pages: totalPages });

  } catch (err) {
    console.error("PAGE COUNT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ ACCEPT / REJECT DOCUMENT ⭐⭐⭐
// =========================
router.post("/decision", authMiddleware, async (req, res) => {
  try {
    const { id, decision, decision_reason } = req.body;

    if (!id || !decision) {
      return res.status(400).json({ error: "Missing decision data" });
    }

    if (!["accepted", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision value" });
    }

    const updateData = {
      decision,
      status: decision === "accepted" ? "approved" : "rejected",
    };

    if (decision === "rejected") {
      updateData.decision_reason = decision_reason || "No reason provided";
    }

    const { error } = await supabase
      .from("documents")
      .update(updateData)
      .eq("id", id)
      .eq("owner", req.user.id);

    if (error) {
      console.error("DECISION ERROR:", error);
      return res.status(400).json({ error: error.message });
    }

    console.log("DOCUMENT DECISION UPDATED ✅");

    res.json({ message: "Decision saved successfully ✅" });

  } catch (err) {
    console.error("DECISION SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
