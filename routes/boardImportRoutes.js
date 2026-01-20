import express from'express';
import { getUserBoardData } from '../controllers/userBoardDataController.js'

const router = express.Router();

// router.get('/', getUserBoardData)
router.post('/', getUserBoardData)

export default router;