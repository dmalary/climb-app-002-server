import express from'express';
import { getAllAttempts } from '../controllers/attemptsController.js'

const router = express.Router();

router.get('/', getAllAttempts)

export default router;