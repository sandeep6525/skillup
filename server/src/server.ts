import { createApp } from './app';
import { config } from './config';
import prisma from './config/prisma';

const app = createApp();

const startServer = async () => {
  try {
    // Attempt DB connection check
    await prisma.$connect();
    console.log('✅ Connected to database via Prisma');
  } catch (error) {
    console.warn('⚠️ Could not connect to database immediately (check credentials):', (error as Error).message);
  }

  const server = app.listen(config.port, () => {
    console.log(`🚀 Server running in ${config.nodeEnv} mode on port ${config.port}`);

    // Schedule automated payment reminder scanner (runs once daily in production, every 6 hours)
    if (config.nodeEnv !== 'test') {
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      setInterval(async () => {
        try {
          const { runPaymentReminderScan } = await import('./services/reminderScheduler');
          console.log('[Scheduler] Executing automated payment reminder scan...');
          const res = await runPaymentReminderScan(false);
          console.log(`[Scheduler] Reminders sent: ${res.remindersSent}, Checked: ${res.totalChecked}`);
        } catch (err) {
          console.error('[Scheduler Error]:', err);
        }
      }, SIX_HOURS);
    }
  });

  const shutdown = async () => {
    console.log('\n🛑 Gracefully shutting down...');
    server.close(async () => {
      await prisma.$disconnect();
      console.log('🔌 Prisma client disconnected. Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();
