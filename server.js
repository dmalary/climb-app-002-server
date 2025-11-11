import dotenv from "dotenv";
dotenv.config()

import express from'express';
import cors from "cors";
import { clerkMiddleware, requireAuth } from '@clerk/express';
import mainRouter from './routes/index.js';
import publicSyncRoutes from './routes/publicSyncRoutes.js';
import { syncUser } from './config/middleware/auth.js';

const app = express();

// app.use(cors());
app.use(cors({ origin: process.env.NEXT_URL, credentials: true }));
app.use(express.json());
app.use(clerkMiddleware());

// public data sync
app.use('/api', publicSyncRoutes);

// app.use('/api', requireAuth(), mainRouter);
// app.use('/api', mainRouter);
// app.use('/api', syncUser, mainRouter);
app.use('/api', requireAuth(), syncUser, mainRouter);

// Apply middleware to a specific route
// app.get('/protected', requireAuth(), (req, res) => {
//   res.send('This is a protected route');
// });

// ---- Health check route ---- //
app.get("/", (req, res) => {
  res.send("✅ Express server running...");
});

// ---- 404 Fallback ---- //
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ---- Global Error Handler ---- //
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(process.env.PORT, () => {
  console.log(`Server listening at http://localhost:${process.env.PORT}`);
});