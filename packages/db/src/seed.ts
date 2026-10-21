import { OPERATIONAL_DEFAULTS } from '@vjit/config';
import { PrismaClient } from '@prisma/client';
import { logger } from '@vjit/logger';

const prisma = new PrismaClient();

/**
 * Seed configuration defaults and system bootstrap
 * Strictly enforces Rule B.2: No mock, sample, or dummy records.
 */
async function main() {
  logger.info('[SEED] Seeding 72 authoritative operational defaults into settings table...');

  for (const [key, value] of Object.entries(OPERATIONAL_DEFAULTS)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: value as any },
      create: {
        key,
        value: value as any,
        description: `Authoritative default for ${key}`,
        is_synthetic: false,
      },
    });
  }

  logger.info(`[SEED] Successfully seeded operational defaults`, {
    count: Object.keys(OPERATIONAL_DEFAULTS).length,
  });

  // Super Admin Bootstrap from environment variable (never hardcoded, Rule B.2 & P0-T7)
  const superadminEmail = process.env.SUPERADMIN_EMAIL;
  if (superadminEmail) {
    logger.info(`[SEED] Initializing super admin bootstrap user`);
    await prisma.user.upsert({
      where: { email: superadminEmail.toLowerCase() },
      update: { role: 'SAD', is_active: true },
      create: {
        email: superadminEmail.toLowerCase(),
        name: 'System Super Administrator',
        role: 'SAD',
        is_active: true,
        is_synthetic: false,
      },
    });
    logger.info('[SEED] Super admin user ready.');
  }
}

main()
  .catch(e => {
    logger.error('[SEED ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
