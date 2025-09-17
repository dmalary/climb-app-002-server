import express from'express';
import { getAllSessions } from '../controllers/sessionController.js'

const router = express.Router();

router.get('/', getAllSessions)

export default router;