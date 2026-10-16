import dotenv from 'dotenv';
import app from './app.js';
import prisma from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify PostgreSQL connection
    await prisma.$connect();
    console.log('✅ Connected to Neon PostgreSQL database');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Graceful shutdown handling
    const shutdown = async () => {
      console.log('Closing HTTP server and database connections...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Failed to connect to Neon database:', error.message);
    process.exit(1);
  }
}

startServer();