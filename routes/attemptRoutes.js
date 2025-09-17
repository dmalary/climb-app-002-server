import express from'express';
import { getAllAttempts } from '../controllers/attemptController.js'

const router = express.Router();

router.get('/', getAllAttempts)

export default router;