import 'dotenv/config';
import app from './app.js';
import prisma from './config/db.js';

const PORT = 3000;

async function startServer() {
  try {
    // Attempt database connection
    try {
      await prisma.$connect();
      if (typeof prisma.$isMock === 'function' && prisma.$isMock()) {
        console.log('ℹ️ Running with in-memory database store (data will reset on restart)');
      } else {
        console.log('✅ Connected to database');
      }
    } catch (dbErr) {
      console.warn('⚠️ Could not connect to external DB, using fallback mock store:', dbErr.message);
      if (typeof prisma.$fallback === 'function') {
        prisma.$fallback();
      }
      console.log('ℹ️ Running with in-memory database store (data will reset on restart)');
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        try {
          if (typeof prisma.$isLive === 'function' && prisma.$isLive()) {
            await prisma.$disconnect();
            console.log('🔌 Database disconnected. Bye!');
          } else {
            console.log('🔌 Server stopped. Bye!');
          }
        } catch (_) {
          console.log('🔌 Server stopped. Bye!');
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();