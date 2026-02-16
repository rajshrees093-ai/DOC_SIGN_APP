console.log("DOCS ROUTES FILE LOADED ✅");

const express = require("express");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");

const supabase = require("../config/supabase");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// =========================
// ✅ Multer MEMORY Storage (DAY 8)
// =========================
const upload = multer({ storage: multer.memoryStorage() });


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
// ✅ UPLOAD PDF → SUPABASE STORAGE
// =========================
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file received" });
    }

    const file = req.file;
    const filename = Date.now() + ".pdf";

    console.log("UPLOADING TO STORAGE:", filename);

    // ⭐ Upload to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(filename, file.buffer, {
        contentType: "application/pdf",
      });

    if (storageError) {
      console.error("STORAGE ERROR:", storageError);
      return res.status(400).json({ error: storageError.message });
    }

    // ⭐ Store metadata in DB
    const { data, error } = await supabase
      .from("documents")
      .insert([
        {
          filename: file.originalname,
          path: filename,
          owner: req.user.id,
          status: "pending",
          is_signed: false,
        },
      ])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    console.log("UPLOAD COMPLETE ✅");

    res.json({ message: "Upload successful ✅", document: data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ SIGN PDF (DAY 8 STORAGE VERSION)
// =========================
router.post("/sign", authMiddleware, async (req, res) => {
  try {
    const { filename, signatures } = req.body;

    if (!filename || !signatures?.length) {
      return res.status(400).json({ error: "Missing signature data" });
    }

    console.log("FETCHING PDF FROM STORAGE:", filename);

    // ⭐ Download original PDF
    const { data: fileData, error: downloadError } =
      await supabase.storage.from("documents").download(filename);

    if (downloadError) {
      console.error("DOWNLOAD ERROR:", downloadError);
      return res.status(400).json({ error: downloadError.message });
    }

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
        x: sig.x,
        y: sig.y,
        width: sig.size,
        height: sig.size / 2,
      });
    }

    const signedBytes = await pdfDoc.save();

    const signedFilename = `signed-${filename}`;

    console.log("UPLOADING SIGNED PDF:", signedFilename);

    // ⭐ Upload signed PDF
    await supabase.storage.from("documents").upload(
      signedFilename,
      signedBytes,
      { contentType: "application/pdf", upsert: true }
    );

    // ⭐ Mark signed
    await supabase
      .from("documents")
      .update({ is_signed: true })
      .eq("path", filename);

    console.log("SIGNING COMPLETE ✅");

    res.json({ file: signedFilename });

  } catch (err) {
    console.error("SIGN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ✅ DECISION ROUTE (UNCHANGED LOGIC)
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


module.exports = router;
