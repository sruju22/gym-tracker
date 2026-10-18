import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './config/db';

import exerciseRoutes from './routes/exerciseRoutes';
import authRoutes from './routes/authRoutes';
import workoutRoutes from './routes/workoutRoutes';
import workoutPlanRoutes from './routes/workoutPlanRoutes';
import progressRoutes from './routes/progressRoutes';
import combinationRoutes from './routes/combinationRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

const allowedOrigins = [
  'https://gym-tracker-tawny-five.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://192.168.1.')
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Connect to MongoDB
connectDB();

// Healthcheck
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(isDbConnected ? 200 : 503).json({
    status: isDbConnected ? 'ok' : 'degraded',
    database: isDbConnected ? 'connected' : 'disconnected',
    message: isDbConnected
      ? 'GymTracker API server running'
      : 'GymTracker API server running (Database disconnected)',
  });
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/workout-plans', workoutPlanRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/combinations', combinationRoutes);

if (process.env.NODE_ENV !== 'test') {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;