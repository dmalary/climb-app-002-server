import express from'express';
import { getAllSessions, getUserSessions, getSession } from '../controllers/sessionController.js'

const router = express.Router();

router.get('/user/:userId', getUserSessions)
router.get('/:sessionId', getSession)
router.get('/', getAllSessions)
// router.get('/', getUserSessions) // change to getAllSEssions

export default router;