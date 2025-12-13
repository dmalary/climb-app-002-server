import express from'express';
import { getAllAttempts, getUserAttempts, getSessionAttempts } from '../controllers/attemptController.js'

const router = express.Router();

router.get('/', getAllAttempts);
router.get('/session/:sessionId', getSessionAttempts)
router.get('/user/:userId', getUserAttempts)

export default router;