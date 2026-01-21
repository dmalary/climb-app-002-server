import express from'express';
import { ensureBoardImages } from '../controllers/boardImageController.js'

const router = express.Router();

router.get('/ensure', ensureBoardImages)

export default router;