import express from'express';
import mainRouter from './routes/index.js';

const app = express();

app.use(express.json());

import dotenv from "dotenv";
import db from'../data/db.json' assert { type: 'json' };
// import { sequelize } from './config/sequelizeClient.js'
dotenv.config()
// async function testConnection() {
//     try {
//         await sequelize.authenticate();
//         console.log('Connection to Supabase PostgreSQL has been established successfully.');
//     } catch (error) {
//         console.error('Unable to connect to the database:', error);
//     }
// }
// testConnection();

// ========================================
app.use('/api', mainRouter);


// ========================================

// Define a GET route for users
// app.get('/api/users', (req, res) => {
//   res.status(200).json(db.users);
// });

// Define a GET route for a specific user by ID
// app.get('/api/users{:id}', (req, res) => { // optional param
app.get('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const user = db.users.find(u => u.userId === userId);

  if (user) {
    res.status(200).json(user);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

app.get('/api/user/sessions/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const session = db.sessions.filter(u => u.userId === userId);

  if (session) {
    res.status(200).json(session);
  } else {
    res.status(404).json({ message: 'Sessions not found' });
  }
});

app.get('/api/session/:id', (req, res) => {
  const sessionId = parseInt(req.params.id);
  const session = db.attempts.filter(u => u.sessionId === sessionId);

  if (session) {
    res.status(200).json(session);
  } else {
    res.status(404).json({ message: 'session not found' });
  }
});

app.get('/api/sends/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const sends = db.attempts.filter(u => u.userId === userId).filter((send) => send.result == 'send');

  if (sends) {
    res.status(200).json(sends);
  } else {
    res.status(404).json({ message: 'sends not found' });
  }
});



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


// Define a POST route to add a new user
// app.post('/api/users', (req, res) => {
//   const newUser = req.body;
//   // In a real app, you'd add validation and persistent storage
//   newUser.id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
//   users.push(newUser);
//   res.status(201).json(newUser);
// });

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Mock server listening at http://localhost:${process.env.PORT}`);
});