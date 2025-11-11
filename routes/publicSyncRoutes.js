import express from'express';
import { getPublicData } from '../controllers/publicSyncController.js'

const router = express.Router();

// router.get('/', getPublicData)
// router.post('/', getPublicData)
router.post('/sync-public', getPublicData)

export default router;