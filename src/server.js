import 'dotenv/config';
import app from './app.js';
import prisma from './config/db.js';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Verify database connection
    try {
      await prisma.$connect();
      console.log('✅ Connected to database');
    } catch (dbErr) {
      console.warn('⚠️ Database connection warning:', dbErr.message);
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Calibr8 server running at http://0.0.0.0:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await prisma.$disconnect();
        } catch (_) {}
        console.log('🔌 Database disconnected. Bye!');
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