import express from'express';
import userRoutes from './userRoutes.js';
import boardRoutes from './boardRoutes.js';
import climbRoutes from './climbRoutes.js';
import sessionRoutes from './sessionRoutes.js';
import attemptRoutes from './attemptRoutes.js';

const router = express.Router();

router.use('/users', userRoutes);
router.use('/boards', boardRoutes);
router.use('/climbs', climbRoutes);
router.use('/sessions', sessionRoutes);
router.use('/attempts', attemptRoutes);
// router.use('/follows', followRoutes);

export default router;