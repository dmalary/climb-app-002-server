import express from'express';
import { getAllAttempts, getUserSessionAttempts } from '../controllers/attemptController.js'

const router = express.Router();

router.get('/', getAllAttempts);
router.get('/:sessionId', getUserSessionAttempts)

export default router;