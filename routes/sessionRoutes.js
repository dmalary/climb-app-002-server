import express from'express';
import { getAllSessions, getUserSessions } from '../controllers/sessionController.js'

const router = express.Router();

router.get('/', getAllSessions)
router.get('/:userId', getUserSessions)

export default router;