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

// create an activity feed

// app.get("/api/stream", (req, res) => {
//   // Required headers for SSE
//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Connection", "keep-alive");

//   // Initial event
//   res.write(`data: ${JSON.stringify({ message: "Connected to stream" })}\n\n`);

//   // Example: push random user data every 3s
//   const interval = setInterval(() => {
//     const randomUser = db.users[Math.floor(Math.random() * db.users.length)];
//     res.write(`data: ${JSON.stringify(randomUser)}\n\n`);
//   }, 3000);

//   // Cleanup if client disconnects
//   req.on("close", () => {
//     clearInterval(interval);
//     res.end();
//   });
// });

