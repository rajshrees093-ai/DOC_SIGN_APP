console.log("DOCS ROUTES FILE LOADED ✅");

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");

const nodemailer = require("nodemailer");
const crypto = require("crypto");

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
// ✅ Multer Config
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === "application/pdf";
  const isPdfExt = path.extname(file.originalname).toLowerCase() === ".pdf";

  if (!isPdfMime || !isPdfExt) {
    return cb(new Error("Only PDF files allowed"), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});


// =========================
// ✅ Helper → Audit Logger (DAY 10 CORE)
// =========================
async function insertAuditLog(req, documentId, action) {
  try {
    const clientIp =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "unknown";

    await supabase.from("audit_logs").insert([
      {
        user_id: req.user?.id || null,
        document_id: documentId,
        action,
        ip_address: clientIp.toString(),
      },
    ]);

    console.log(`AUDIT LOG → ${action} ✅`);

  } catch (err) {
    console.error("AUDIT LOG ERROR:", err.message);
  }
}


// =========================
// ✅ GET USER DOCUMENTS
// =========================
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("owner", req.user.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ UPLOAD PDF
// =========================
router.post("/upload", authMiddleware, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "No file received" });

      const file = req.file;

      const { data, error } = await supabase.from("documents").insert([
        {
          filename: file.originalname,
          path: file.filename,
          owner: req.user.id,
          status: "pending",
          is_signed: false,
        },
      ]).select().single();

      if (error) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: error.message });
      }

      await insertAuditLog(req, data.id, "uploaded");

      res.json({ message: "Upload successful ✅" });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});


// =========================
// ✅ PAGE COUNT
// =========================
router.get("/pages/:filename", authMiddleware, async (req, res) => {
  try {
    const filePath = path.join(uploadDir, req.params.filename);

    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: "File not found" });

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    res.json({ pages: pdfDoc.getPages().length });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ SIGN PDF + AUDIT LOG
// =========================
router.post("/sign", async (req, res) => {
  try {
    const { filename, signatures, token } = req.body;

    if (!filename || !signatures?.length)
      return res.status(400).json({ error: "Missing signature data" });

    const { data: documentRecord } = await supabase
      .from("documents")
      .select("*")
      .eq("path", filename)
      .single();

    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: "PDF not found" });

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const sig of signatures) {
      const pageIndex = Number(sig.page) - 1;

      if (!pages[pageIndex])
        return res.status(400).json({ error: "Invalid page number" });

      const pngBytes = Buffer.from(
        sig.image.replace(/^data:image\/png;base64,/, ""),
        "base64"
      );

      const pngImage = await pdfDoc.embedPng(pngBytes);

      pages[pageIndex].drawImage(pngImage, {
        x: Number(sig.x),
        y: Number(sig.y),
        width: Number(sig.size),
        height: Number(sig.size) / 2,
      });
    }

    const signedBytes = await pdfDoc.save();
    const signedFilename = `signed-${filename}`;

    fs.writeFileSync(path.join(uploadDir, signedFilename), signedBytes);

    await supabase
      .from("documents")
      .update({ is_signed: true })
      .eq("path", filename);

    await insertAuditLog(req, documentRecord?.id, "signed");

    res.json({ file: signedFilename });

  } catch (err) {
    console.error("SIGN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ DOCUMENT DECISION (FIXED + DAY 10 AUDIT)
// =========================
router.post("/decision", authMiddleware, async (req, res) => {
  try {
    const { id, decision, reason } = req.body;

    if (!id || !decision)
      return res.status(400).json({ error: "Missing decision data ❌" });

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Document not found ❌" });

    if (!data.is_signed)
      return res.status(400).json({ error: "Document not signed ❌" });

    if (data.status !== "pending")
      return res.status(400).json({ error: "Decision already made ❌" });

    await supabase
      .from("documents")
      .update({
        status: decision,
        decision_reason: reason || null,
        decided_at: new Date(),
        decided_by: req.user.id,
      })
      .eq("id", id);

    await insertAuditLog(req, id, decision);

    res.json({ message: `Document ${decision} ✅` });

  } catch (err) {
    console.error("DECISION ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ REQUEST SIGNATURE
// =========================
router.post("/request-signature", authMiddleware, async (req, res) => {
  try {
    const { documentId, email } = req.body;

    if (!documentId || !email)
      return res.status(400).json({ error: "Missing data ❌" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await supabase
      .from("documents")
      .update({ signing_token: token, token_expires_at: expiresAt })
      .eq("id", documentId);

    await insertAuditLog(req, documentId, "signature_requested");

    res.json({ message: "Signature request created ✅" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ FETCH AUDIT LOGS
// =========================
router.get("/audit/:documentId", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("document_id", req.params.documentId)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
