
import 'dotenv/config';
import app from './app.js';
import prisma from './config/db.js';

const PORT = process.env.PORT || 3000;

let server;
let shuttingDown = false;

async function startServer() {
  try {
    try {
      await prisma.$connect();

      if (typeof prisma.$isMock === 'function' && prisma.$isMock()) {
        console.log('ℹ️ Running with in-memory database store (data will reset on restart)');
      } else {
        console.log('✅ Connected to database');
      }
    } catch (dbErr) {
      console.warn(
        '⚠️ Could not connect to external DB, using fallback mock store:',
        dbErr.message
      );

      if (typeof prisma.$fallback === 'function') {
        prisma.$fallback();
      }

      console.log('ℹ️ Running with in-memory database store (data will reset on restart)');
    }

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error.message);
      process.exitCode = 1;
    });

    server.on('close', () => {
      console.log('🛑 HTTP server closed');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);

    try {
      await prisma.$disconnect();
    } catch (_) {}

    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n⚠️ ${signal} received. Shutting down gracefully...`);

  if (server?.listening) {
    server.close();
  }

  try {
    await prisma.$disconnect();
    console.log('🔌 Database disconnected');
  } catch (error) {
    console.error('⚠️ Database disconnect error:', error.message);
  }

  console.log('✅ Shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer();
