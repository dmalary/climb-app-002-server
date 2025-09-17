import express from'express';
import { getAllClimbs } from '../controllers/climbController.js'

const router = express.Router();

router.get('/', getAllClimbs)

export default router;