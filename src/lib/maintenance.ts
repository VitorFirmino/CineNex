import { prisma } from '@infrastructure/database/prisma';

const MAINTENANCE_ROW_ID = 'global';
const CREATE_MAINTENANCE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS "MaintenanceState" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceState_pkey" PRIMARY KEY ("id")
  )
`;

let ensureTablePromise: Promise<void> | null = null;

async function ensureMaintenanceTable() {
  if (!ensureTablePromise) {
    ensureTablePromise = prisma.$executeRawUnsafe(CREATE_MAINTENANCE_TABLE_SQL)
      .then(() => undefined)
      .catch((error) => {
        ensureTablePromise = null;
        throw error;
      });
  }

  return ensureTablePromise;
}

export async function getMaintenanceState(): Promise<boolean> {
  await ensureMaintenanceTable();

  const rows = await prisma.$queryRaw<Array<{ enabled: boolean }>>`
    SELECT "enabled"
    FROM "MaintenanceState"
    WHERE "id" = ${MAINTENANCE_ROW_ID}
    LIMIT 1
  `;

  return rows[0]?.enabled ?? false;
}

export async function setMaintenanceState(enabled: boolean): Promise<boolean> {
  await ensureMaintenanceTable();

  const updatedAt = new Date();
  const rows = await prisma.$queryRaw<Array<{ enabled: boolean }>>`
    INSERT INTO "MaintenanceState" ("id", "enabled", "updatedAt")
    VALUES (${MAINTENANCE_ROW_ID}, ${enabled}, ${updatedAt})
    ON CONFLICT ("id")
    DO UPDATE SET
      "enabled" = EXCLUDED."enabled",
      "updatedAt" = EXCLUDED."updatedAt"
    RETURNING "enabled"
  `;

  return rows[0]?.enabled ?? false;
}
