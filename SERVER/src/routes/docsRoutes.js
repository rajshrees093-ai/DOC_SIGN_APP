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
// ✅ Ensure Upload Folder Exists
// =========================
const uploadDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Uploads folder created ✅");
}


// =========================
// ✅ Multer Storage Config
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});


// =========================
// ✅ File Filter (PDF ONLY)
// =========================
const fileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === "application/pdf";
  const isPdfExt = path.extname(file.originalname).toLowerCase() === ".pdf";

  if (!isPdfMime || !isPdfExt) {
    return cb(new Error("Only PDF files are allowed"), false);
  }

  cb(null, true);
};


// =========================
// ✅ Multer Instance
// =========================
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});


// =========================
// ✅ GET USER DOCUMENTS
// =========================
router.get("/", authMiddleware, async (req, res) => {
  try {
    console.log("LOGGED USER:", req.user.id);

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("owner", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("FETCH ERROR:", error);
      return res.status(400).json({ error: error.message });
    }

    console.log("FETCHED DOCS:", data);

    res.json(data);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ UPLOAD DOCUMENT
// =========================
router.post("/upload", authMiddleware, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    try {
      if (err) {
        console.error("MULTER ERROR:", err.message);
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file received" });
      }

      const file = req.file;

      console.log("FILE RECEIVED ✅", file.originalname);

      const { data, error } = await supabase
        .from("documents")
        .insert([
          {
            filename: file.originalname,
            path: file.filename,
            owner: req.user.id,
            status: "pending",
          },
        ])
        .select();

      if (error) {
        console.error("SUPABASE ERROR:", error);

        fs.unlinkSync(file.path);

        return res.status(400).json({ error: error.message });
      }

      console.log("DOCUMENT SAVED TO DB ✅");

      res.json({
        message: "Upload successful ✅",
        document: data,
      });

    } catch (error) {
      console.error("UPLOAD ERROR:", error);
      res.status(500).json({ error: error.message });
    }
  });
});


// =========================
// ✅ DELETE DOCUMENT
// =========================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("owner", req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Document not found" });
    }

    const filePath = path.join(uploadDir, data.path);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("FILE DELETED FROM DISK ✅");
    }

    const { error: deleteError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("owner", req.user.id);

    if (deleteError) {
      console.error("DELETE ERROR:", deleteError);
      return res.status(400).json({ error: deleteError.message });
    }

    res.json({ message: "Deleted successfully ✅" });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ PAGE COUNT
// =========================
router.get("/pages/:filename", authMiddleware, async (req, res) => {
  try {
    const { filename } = req.params;

    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    res.json({ pages: pdfDoc.getPages().length });

  } catch (err) {
    console.error("PAGE COUNT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ SIGN PDF
// =========================
router.post("/sign", authMiddleware, async (req, res) => {
  try {
    const { filename, signatures } = req.body;

    if (!filename || !signatures || signatures.length === 0) {
      return res.status(400).json({ error: "Missing signature data" });
    }

    const filePath = path.join(uploadDir, filename);

    console.log("SIGN FILE PATH:", filePath);

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
    const signedPath = path.join(uploadDir, signedFilename);

    fs.writeFileSync(signedPath, signedPdfBytes);

    console.log("SIGNATURE APPLIED ✅");

    res.json({ file: signedFilename });

  } catch (err) {
    console.error("SIGN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ DOCUMENT DECISION
// =========================
router.post("/decision", authMiddleware, async (req, res) => {
  try {
    const { id, decision, reason } = req.body;

    if (!id || !decision) {
      return res.status(400).json({ error: "Missing decision data" });
    }

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision value" });
    }

    const { error } = await supabase
      .from("documents")
      .update({
        status: decision,
        decision_reason: reason || null,
      })
      .eq("id", id)
      .eq("owner", req.user.id);

    if (error) {
      console.error("DECISION ERROR:", error);
      return res.status(400).json({ error: error.message });
    }

    console.log("DOCUMENT DECISION UPDATED ✅");

    res.json({ message: `Document ${decision} ✅` });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
