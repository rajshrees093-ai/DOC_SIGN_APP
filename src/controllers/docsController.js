import Document from "../models/Document.js";

export const getUserDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.user.id });

    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching documents" });
  }
};
