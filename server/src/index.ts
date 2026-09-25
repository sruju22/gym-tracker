import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GymTracker API server running' });
});

// REST API Routes placeholder for Stage 5
app.get('/api/exercises', (req, res) => {
  res.json({ message: 'GET /api/exercises route placeholder' });
});

app.get('/api/workouts/today', (req, res) => {
  res.json({ message: 'GET /api/workouts/today route placeholder' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;
