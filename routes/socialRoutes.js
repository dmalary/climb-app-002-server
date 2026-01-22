import express from "express";
import { likeSession, unlikeSession } from "../controllers/likeController.js";
import {
  listSessionComments,
  addSessionComment,
  deleteSessionComment,
} from "../controllers/commentController.js";

const router = express.Router();

// Likes
router.post("/sessions/:sessionId/like", likeSession);
router.delete("/sessions/:sessionId/like", unlikeSession);

// Comments
router.get("/sessions/:sessionId/comments", listSessionComments);
router.post("/sessions/:sessionId/comments", addSessionComment);
router.delete("/comments/:commentId", deleteSessionComment);

export default router;
