import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import indexRouter from './routers/index.router.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// All routes
app.use('/', indexRouter);

// Global error handler (must be last)
app.use(errorHandler);

export default app;