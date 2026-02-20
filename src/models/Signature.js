const mongoose = require("mongoose");

const signatureSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true
    },

    signerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    x: { type: Number, required: true },
    y: { type: Number, required: true },
    page: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "signed", "rejected"],
      default: "pending"
    },

    rejectionReason: {
      type: String,
      default: null
    },

    decidedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Signature", signatureSchema);
