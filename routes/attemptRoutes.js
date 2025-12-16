import express from'express';
import { getAllAttempts, getUserAttempts, getSessionAttempts } from '../controllers/attemptController.js'

const router = express.Router();

router.get('/user/:userId', getUserAttempts)
router.get('/:sessionId', getSessionAttempts)
router.get('/', getAllAttempts);

export default router;