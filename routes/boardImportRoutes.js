import express from'express';
import { getUserBoardData } from '../controllers/boardImportController.js'

const router = express.Router();

// router.get('/', getUserBoardData)
router.post('/', getUserBoardData)

export default router;