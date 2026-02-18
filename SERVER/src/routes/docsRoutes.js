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
// ✅ Multer Storage Config
// =========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
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
  limits: { fileSize: 10 * 1024 * 1024 },
});


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
// ✅ UPLOAD DOCUMENT
// =========================
router.post("/upload", authMiddleware, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: "No file received" });

      const file = req.file;

      const { error } = await supabase.from("documents").insert([
        {
          filename: file.originalname,
          path: file.filename,
          owner: req.user.id,
          status: "pending",
          is_signed: false,
        },
      ]);

      if (error) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: error.message });
      }

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
// ✅ DAY-8 / DAY-9 — SIGN PDF (CRITICAL FIXED)
// =========================
router.post("/sign", async (req, res) => {
  try {
    const { filename, signatures, token } = req.body;

    if (!filename || !signatures?.length)
      return res.status(400).json({ error: "Missing signature data" });

    // ✅ Token Validation for Public Signing
    if (token) {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("signing_token", token)
        .single();

      if (!data)
        return res.status(400).json({ error: "Invalid token ❌" });

      if (new Date(data.token_expires_at) < new Date())
        return res.status(400).json({ error: "Token expired ❌" });
    }

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
    const signedPath = path.join(uploadDir, signedFilename);

    fs.writeFileSync(signedPath, signedBytes);

    await supabase
      .from("documents")
      .update({ is_signed: true })
      .eq("path", filename);

    console.log("FINAL SIGNED PDF GENERATED ✅");

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

    const { data } = await supabase
      .from("documents")
      .select("status, is_signed")
      .eq("id", id)
      .single();

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

    res.json({ message: `Document ${decision} ✅` });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ DAY-9 — REQUEST SIGNATURE (ETHEREAL)
// =========================
router.post("/request-signature", authMiddleware, async (req, res) => {
  try {
    const { documentId, email } = req.body;

    if (!documentId || !email)
      return res.status(400).json({ error: "Missing documentId or email" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await supabase
      .from("documents")
      .update({
        signing_token: token,
        token_expires_at: expiresAt,
      })
      .eq("id", documentId)
      .eq("owner", req.user.id);

    const signingLink = `http://localhost:5173/public-sign/${token}`;

    const testAccount = await nodemailer.createTestAccount();

    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const info = await transporter.sendMail({
      from: '"Doc Signature App" <no-reply@test.com>',
      to: email,
      subject: "Document Signature Request",
      text: `Click to sign document:\n${signingLink}`,
    });

    res.json({
      message: "Signature link generated ✅",
      preview: nodemailer.getTestMessageUrl(info),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ DAY-9 — PUBLIC TOKEN VALIDATION
// =========================
router.get("/public-sign/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("signing_token", token)
      .single();

    if (!data) return res.status(404).json({ error: "Invalid token ❌" });

    if (new Date(data.token_expires_at) < new Date())
      return res.status(400).json({ error: "Token expired ❌" });

    res.json({ document: data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Create Audit Fetch Route
router.get("/audit/:documentId", authMiddleware, async (req, res) => {
  try {
    const { documentId } = req.params;

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// =========================
// ✅ DAY-10 AUDIT LOGGING
// =========================

const clientIp =
  req.headers["x-forwarded-for"] ||
  req.socket.remoteAddress ||
  "unknown";

await supabase.from("audit_logs").insert([
  {
    document_id: token
      ? (await supabase
          .from("documents")
          .select("id")
          .eq("signing_token", token)
          .single()).data.id
      : null,

    action: "SIGNED",
    ip_address: clientIp,
    created_at: new Date(),
  },
]);

console.log("AUDIT LOG INSERTED ✅");



module.exports = router;
