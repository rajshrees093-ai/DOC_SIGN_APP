import express from "express";
import { getUserDocuments } from "../controllers/docsController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getUserDocuments);

export default router;
