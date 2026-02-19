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
// ✅ SIGN PDF + AUDIT LOG
// =========================
router.post("/sign", async (req, res) => {
  try {
    const { filename, signatures, token } = req.body;

    if (!filename || !signatures?.length)
      return res.status(400).json({ error: "Missing signature data" });

    let documentRecord = null;

    if (token) {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("signing_token", token)
        .single();

      if (!data) return res.status(400).json({ error: "Invalid token ❌" });
      if (new Date(data.token_expires_at) < new Date())
        return res.status(400).json({ error: "Token expired ❌" });

      documentRecord = data;
    }

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
      .eq("path", filename);

    const clientIp =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "unknown";

    await supabase.from("audit_logs").insert([
      {
        document_id: documentRecord?.id || null,
        action: "signed",
        ip_address: clientIp.toString(),
      },
    ]);

    res.json({ file: signedFilename });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ REQUEST SIGNATURE (ETHEREAL)
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
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("document_id", req.params.documentId);

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
