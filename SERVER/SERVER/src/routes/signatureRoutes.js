console.log("🔥 SIGNATURE ROUTES DEFINITELY LOADED");

const express = require("express");
const router = express.Router();
const supabase = require("../utils/supabaseClient");

console.log("✅ Signature Routes Loaded (Supabase)");

/*
=====================================================
 Day 11 – Signature Decision API
=====================================================

Endpoint:
POST /api/signatures/decide

Purpose:
Allows signer to SIGN or REJECT a signature request

Allowed Transitions:
pending → signed
pending → rejected

Blocked:
signed → anything ❌
rejected → anything ❌
=====================================================
*/

router.post("/decide", async (req, res) => {
  try {
    const { signatureId, action, reason } = req.body;

    /* ✅ Step 1: Validate Input */
    if (!signatureId || !action) {
      return res.status(400).json({
        success: false,
        error: "signatureId and action are required"
      });
    }

    /* ✅ Step 2: Validate Action */
    const allowedActions = ["signed", "rejected"];

    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Use 'signed' or 'rejected'"
      });
    }

    /* ✅ Step 3: Fetch Signature Row */
    const { data: signature, error: fetchError } = await supabase
      .from("signatures")
      .select("*")
      .eq("id", signatureId)
      .single();

    if (fetchError || !signature) {
      return res.status(404).json({
        success: false,
        error: "Signature not found"
      });
    }

    /* ✅ Step 4: Prevent Double Decisions */
    if (signature.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: `Signature already ${signature.status}`
      });
    }

    /* ✅ Step 5: Rejection Rule */
    if (action === "rejected" && !reason) {
      return res.status(400).json({
        success: false,
        error: "Rejection reason is required"
      });
    }

    /* ✅ Step 6: Prepare Update */
    const updatePayload = {
      status: action,
      decided_at: new Date()
    };

    if (action === "rejected") {
      updatePayload.rejection_reason = reason;
    }

    /* ✅ Step 7: Update Signature */
    const { data: updatedSignature, error: updateError } = await supabase
      .from("signatures")
      .update(updatePayload)
      .eq("id", signatureId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: updateError.message
      });
    }

    /* ✅ Step 8: Success Response */
    res.json({
      success: true,
      message: "Decision saved successfully ✅",
      signature: updatedSignature
    });

  } catch (err) {
    console.error("❌ Decision API Crash:", err);

    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});

module.exports = router;
