import express from'express';
import { getAllAttempts, getUserSessionAttempts, getSessionAttempts } from '../controllers/attemptController.js'

const router = express.Router();

router.get('/', getAllAttempts);
router.get('/:sessionId', getSessionAttempts)
// router.get('/:userId', getUserSessionAttempts)

export default router;