import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  filename: String,
  path: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

export default mongoose.model("Document", documentSchema);
