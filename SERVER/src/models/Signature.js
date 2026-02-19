const mongoose = require("mongoose");

const signatureSchema = new mongoose.Schema(
  {
    /* ✅ Which document this signature belongs to */
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true
    },

    /* ✅ Which user is supposed to sign */
    signerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    /* ✅ Signature placement coordinates */
    x: {
      type: Number,
      required: true
    },

    y: {
      type: Number,
      required: true
    },

    page: {
      type: Number,
      required: true
    },

    /* ✅ Signature decision state */
    status: {
      type: String,
      enum: ["pending", "signed", "rejected"],
      default: "pending"
    },

    /* ✅ Only filled when rejected */
    rejectionReason: {
      type: String,
      default: null
    },

    /* ✅ When decision was made */
    decidedAt: {
      type: Date,
      default: null
    }
  },
  {
    /* ✅ Auto timestamps (VERY useful for audit/debugging) */
    timestamps: true
  }
);

module.exports = mongoose.model("Signature", signatureSchema);
