console.log("DOCS ROUTES FILE LOADED ✅");

const express = require("express");
const multer = require("multer");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const crypto = require("crypto");

const supabase = require("../config/supabase");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================
   ✅ Multer Memory Storage
   ========================= */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

/* =========================
   ✅ Audit Logger
   ========================= */
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

/* =========================
   ✅ GET USER DOCUMENTS
   ========================= */
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

/* =========================
   ✅ UPLOAD PDF → SUPABASE
   ========================= */
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ error: "No file received ❌" });

      const file = req.file;
      const fileExt = path.extname(file.originalname);

      if (fileExt.toLowerCase() !== ".pdf") {
        return res.status(400).json({ error: "Only PDF allowed ❌" });
      }

      const uniqueName = Date.now() + fileExt;

      /* ✅ Upload ORIGINAL binary buffer */
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(uniqueName, file.buffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        console.error(uploadError);
        return res.status(400).json({ error: uploadError.message });
      }

      const { data: publicUrlData } = supabase.storage
        .from("documents")
        .getPublicUrl(uniqueName);

      const publicUrl = publicUrlData.publicUrl;

      const { data, error } = await supabase
        .from("documents")
        .insert([
          {
            filename: file.originalname,
            path: uniqueName,
            file_url: publicUrl,
            owner: req.user.id,
            status: "pending",
            is_signed: false,
          },
        ])
        .select()
        .single();

      if (error) return res.status(400).json({ error: error.message });

      await insertAuditLog(req, data.id, "uploaded");

      res.json({ message: "Upload successful ✅" });
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  }
);

/* =========================
   ✅ PAGE COUNT
   ========================= */
router.get("/pages/:filename", authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase.storage
      .from("documents")
      .download(req.params.filename);

    if (error) return res.status(404).json({ error: "File not found ❌" });

    const pdfBytes = await data.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    res.json({ pages: pdfDoc.getPages().length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   ✅ SIGN PDF → SUPABASE
   ========================= */
router.post("/sign", async (req, res) => {
  try {
    const { filename, signatures } = req.body;

    if (!filename || !signatures?.length)
      return res.status(400).json({ error: "Missing signature data ❌" });

    const { data: fileData, error: downloadError } =
      await supabase.storage.from("documents").download(filename);

    if (downloadError)
      return res.status(404).json({ error: "PDF not found ❌" });

    const pdfBytes = await fileData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const sig of signatures) {
      const pngBytes = Buffer.from(
        sig.image.replace(/^data:image\/png;base64,/, ""),
        "base64"
      );

      const pngImage = await pdfDoc.embedPng(pngBytes);

      pages[sig.page - 1].drawImage(pngImage, {
        x: Number(sig.x),
        y: Number(sig.y),
        width: Number(sig.size),
        height: Number(sig.size) / 2,
      });
    }

    const signedBytes = await pdfDoc.save();
    const signedFilename = `signed-${filename}`;

    /* ✅ CRITICAL FIX → convert to Buffer */
    const buffer = Buffer.from(signedBytes);

    await supabase.storage.from("documents").upload(signedFilename, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

    const { data: signedUrlData } = supabase.storage
      .from("documents")
      .getPublicUrl(signedFilename);

    await supabase
      .from("documents")
      .update({
        is_signed: true,
        signed_url: signedUrlData.publicUrl,
      })
      .eq("path", filename);

    res.json({ file: signedFilename });
  } catch (err) {
    console.error("SIGN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   ✅ AUDIT LOGS
   ========================= */
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