console.log("DOCS ROUTES FILE LOADED ✅");

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const crypto = require("crypto");

const supabase = require("../config/supabase");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

function getUploadsDir() {
  const candidates = [
    path.resolve("uploads"),
    path.join(__dirname, "../../uploads"),
    path.join(__dirname, "../../../uploads"),
    path.join(__dirname, "../uploads"),
    path.resolve("SERVER/uploads"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const fallback = path.resolve("uploads");
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

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

    if (!error && data && data.length > 0) return res.json(data);
  } catch (err) {
    console.warn("Supabase documents unavailable, using local uploads fallback");
  }

  // Local fallback: list files from uploads directory
  try {
    const uploadsDir = getUploadsDir();
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith(".pdf") && !f.startsWith("signed-"));
    const localDocs = files.map((file, idx) => ({
      id: `local-${idx + 1}`,
      filename: `Document-${file}`,
      path: file,
      file_url: `http://localhost:5000/uploads/${file}`,
      status: "pending",
      is_signed: false,
      created_at: new Date().toISOString(),
    }));
    return res.json(localDocs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   ✅ UPLOAD PDF → SUPABASE / LOCAL
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
      const uploadsDir = getUploadsDir();
      fs.writeFileSync(path.join(uploadsDir, uniqueName), file.buffer);

      let publicUrl = `http://localhost:5000/uploads/${uniqueName}`;

      /* Try Supabase Storage */
      try {
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(uniqueName, file.buffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from("documents")
            .getPublicUrl(uniqueName);

          publicUrl = publicUrlData.publicUrl;

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

          if (!error && data) {
            await insertAuditLog(req, data.id, "uploaded");
          }
        }
      } catch (sbErr) {
        console.warn("Supabase storage upload skipped (local fallback used):", sbErr.message);
      }

      res.json({ message: "Upload successful ✅", filename: uniqueName });
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
    const uploadsDir = getUploadsDir();
    const localPath = path.join(uploadsDir, req.params.filename);

    if (fs.existsSync(localPath)) {
      const pdfBytes = fs.readFileSync(localPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      return res.json({ pages: pdfDoc.getPages().length });
    }

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
   ✅ STREAM PDF FILE
   ========================= */
router.get("/file/:filename", async (req, res) => {
  try {
    const uploadsDir = getUploadsDir();
    const localPath = path.join(uploadsDir, req.params.filename);

    if (fs.existsSync(localPath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${req.params.filename}"`);
      return fs.createReadStream(localPath).pipe(res);
    }

    const { data, error } = await supabase.storage
      .from("documents")
      .download(req.params.filename);

    if (error) return res.status(404).json({ error: "File not found ❌" });

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${req.params.filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("STREAM ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* =========================
   ✅ SIGN PDF → SUPABASE / LOCAL
   ========================= */
router.post("/sign", async (req, res) => {
  try {
    const { filename, signatures } = req.body;

    if (!filename || !signatures?.length)
      return res.status(400).json({ error: "Missing signature data ❌" });

    let pdfBytes;
    const uploadsDir = getUploadsDir();
    const localPath = path.join(uploadsDir, filename);

    if (fs.existsSync(localPath)) {
      pdfBytes = fs.readFileSync(localPath);
    } else {
      const { data: fileData, error: downloadError } =
        await supabase.storage.from("documents").download(filename);

      if (downloadError)
        return res.status(404).json({ error: "PDF not found ❌" });

      const arrayBuffer = await fileData.arrayBuffer();
      pdfBytes = Buffer.from(arrayBuffer);
    }

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    for (const sig of signatures) {
      const pageIndex = Number(sig.page) - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;

      const page = pages[pageIndex];
      const { width: pdfWidth, height: pdfHeight } = page.getSize();

      const pngBytes = Buffer.from(
        sig.image.replace(/^data:image\/png;base64,/, ""),
        "base64"
      );

      const pngImage = await pdfDoc.embedPng(pngBytes);

      let sigX, sigY, sigWidth, sigHeight;

      // Handle Step 9: Normalized relative percentage coordinates (x%, y%)
      if (sig.xPercent !== undefined && sig.yPercent !== undefined) {
        sigWidth = sig.widthPercent !== undefined
          ? (Number(sig.widthPercent) / 100) * pdfWidth
          : (Number(sig.size || 150) / 600) * pdfWidth;

        sigHeight = sig.heightPercent !== undefined
          ? (Number(sig.heightPercent) / 100) * pdfHeight
          : sigWidth / 2;

        sigX = (Number(sig.xPercent) / 100) * pdfWidth;
        // Invert Y coordinate because PDF coordinate origin (0, 0) is at bottom-left!
        sigY = pdfHeight - ((Number(sig.yPercent) / 100) * pdfHeight) - sigHeight;
      } else {
        // Fallback for legacy pixel coordinates
        sigWidth = Number(sig.size || 150);
        sigHeight = Number(sig.size || 150) / 2;
        sigX = Number(sig.x);
        sigY = pdfHeight - Number(sig.y) - sigHeight;
      }

      page.drawImage(pngImage, {
        x: Math.max(0, sigX),
        y: Math.max(0, sigY),
        width: sigWidth,
        height: sigHeight,
      });
    }

    const signedBytes = await pdfDoc.save();
    const signedFilename = `signed-${filename}`;
    const buffer = Buffer.from(signedBytes);

    // Save locally
    fs.writeFileSync(path.join(uploadsDir, signedFilename), buffer);

    // Try Supabase save
    try {
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
    } catch (sbErr) {
      console.warn("Supabase signed upload skipped (saved locally):", sbErr.message);
    }

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