import express from'express';
import mainRouter from './routes/index.js';
import dotenv from "dotenv";

const app = express();

app.use(express.json());

dotenv.config()

app.use('/api', mainRouter);

app.listen(process.env.PORT, () => {
  console.log(`Mock server listening at http://localhost:${process.env.PORT}`);
});