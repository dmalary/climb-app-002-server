import express from'express';
import { getBoardData } from '../controllers/boardImportController.js'

const router = express.Router();

// router.get('/', getBoardData)
router.post('/', getBoardData)

export default router;