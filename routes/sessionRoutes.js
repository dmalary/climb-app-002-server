import express from'express';
import { getAllSessions, getUserSessions } from '../controllers/sessionController.js'

const router = express.Router();

router.get('/', getAllSessions)
router.get('/:userId', getUserSessions)
// router.get('/', getUserSessions) // change to getAllSEssions

export default router;