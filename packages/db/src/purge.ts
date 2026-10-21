import { PrismaClient } from '@prisma/client';
import { logger } from '@vjit/logger';

const prisma = new PrismaClient();

/**
 * Purge synthetic test data
 * Enforces Rule B.2 (R-M3 & R-M8): Deletes all rows where is_synthetic = true
 */
async function main() {
  logger.info('[DB:PURGE-SYNTHETIC] Purging all synthetic test records from database...');

  const tables = [
    'rate_counters',
    'device_bus_links',
    'device_tokens',
    'devices',
    'buses',
    'recovery_codes',
    'mfa_factors',
    'sessions',
    'email_otps',
    'settings',
    'feature_flags',
    'users',
  ];

  let totalPurged = 0;

  for (const table of tables) {
    if (table === 'rate_counters') continue; // No is_synthetic column
    try {
      const result: { count: number } = await (prisma as any)[table].deleteMany({
        where: { is_synthetic: true },
      });
      if (result.count > 0) {
        logger.info(`Purged synthetic rows`, { table, count: result.count });
        totalPurged += result.count;
      }
    } catch {
      // Table might not exist yet during initial setup
    }
  }

  logger.info(`[DB:PURGE-SYNTHETIC COMPLETE] Total synthetic records purged`, { totalPurged });
}

main()
  .catch(e => {
    logger.error('[PURGE ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
