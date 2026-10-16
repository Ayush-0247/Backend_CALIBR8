import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';

import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import topicRoutes from './modules/topics/topics.routes.js';
import onboardingRoutes from './modules/onboarding/onboarding.routes.js';

const app = express();

// Request ID - required for error format
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
});

app.use(pinoHttp());
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// PHASE 1 Routes
app.use('/ping', (req, res) => res.json({ ok: true, requestId: req.id })); // No DB check
app.use('/', healthRoutes);
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/', topicRoutes);
app.use('/', onboardingRoutes);

// Unified Error Format
app.use((err, req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: { message: err.message || 'Internal server error' },
    requestId: req.id
  });
});

export default app;