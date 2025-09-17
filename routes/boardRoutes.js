import express from'express';
import { getAllBoards } from '../controllers/boardController.js'

const router = express.Router();

router.get('/', getAllBoards)

export default router;