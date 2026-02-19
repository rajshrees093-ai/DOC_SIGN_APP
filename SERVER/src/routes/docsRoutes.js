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
// ✅ CLIENT IP HELPER (Day-10 Critical)
// =========================
function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown"
  );
}


// =========================
// ✅ AUDIT LOGGER HELPER
// =========================
async function insertAuditLog(documentId, action, req) {
  try {
    const ip = getClientIp(req);

    await supabase.from("audit_logs").insert([
      {
        document_id: documentId,
        action,
        ip_address: ip.toString(),
      },
    ]);

    console.log(`AUDIT LOG INSERTED ✅ → ${action}`);
  } catch (err) {
    console.error("AUDIT LOG FAILED ❌", err.message);
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
// ✅ UPLOAD PDF + AUDIT
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

      await insertAuditLog(data.id, "uploaded", req);

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
// ✅ SIGN PDF + RELIABLE AUDIT
// =========================
router.post("/sign", async (req, res) => {
  try {
    const { filename, signatures, token } = req.body;

    if (!filename || !signatures?.length)
      return res.status(400).json({ error: "Missing signature data" });

    // ⭐ ALWAYS FETCH DOCUMENT RECORD
    const { data: documentRecord } = await supabase
      .from("documents")
      .select("*")
      .eq(token ? "signing_token" : "path", token || filename)
      .single();

    if (!documentRecord)
      return res.status(400).json({ error: "Document not found ❌" });

    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath))
      return res.status(404).json({ error: "PDF not found" });

    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const sig of signatures) {
      const pageIndex = Number(sig.page) - 1;

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
      .eq("id", documentRecord.id);

    await insertAuditLog(documentRecord.id, "signed", req);

    res.json({ file: signedFilename });

  } catch (err) {
    console.error("SIGN ERROR ❌", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ REQUEST SIGNATURE + AUDIT
// =========================
router.post("/request-signature", authMiddleware, async (req, res) => {
  try {
    const { documentId, email } = req.body;

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await supabase
      .from("documents")
      .update({ signing_token: token, token_expires_at: expiresAt })
      .eq("id", documentId);

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
      from: '"Doc App" <no-reply@test.com>',
      to: email,
      subject: "Sign Document",
      text: `Sign: http://localhost:5173/public-sign/${token}`,
    });

    await insertAuditLog(documentId, "signature_requested", req);

    res.json({
      message: "Signature request sent ✅",
      preview: nodemailer.getTestMessageUrl(info),
    });

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
