import { prisma } from "@infrastructure/database/prisma";
import type { User } from "@supabase/supabase-js";

function resolveProfileEmail(user: Pick<User, "id" | "email">): string {
  return (user.email || `${user.id}@no-email.local`).trim().toLowerCase();
}

function resolveProfileRole(user: Pick<User, "app_metadata">): "ADMIN" | "USER" {
  return user.app_metadata?.role === "ADMIN" ? "ADMIN" : "USER";
}

function buildArchivedProfileEmail(profileId: string): string {
  return `archived-${profileId}-${Date.now()}@local.invalid`;
}

export async function ensureProfileForUser(user: User) {
  const nextEmail = resolveProfileEmail(user);
  const nextRole = resolveProfileRole(user);

  return prisma.$transaction(async (tx) => {
    const currentProfile = await tx.profile.findUnique({
      where: { id: user.id },
    });

    const existingByEmail = user.email
      ? await tx.profile.findFirst({
          where: {
            email: {
              equals: nextEmail,
              mode: "insensitive",
            },
          },
        })
      : null;

    if (existingByEmail && existingByEmail.id !== user.id) {
      const mergedRole =
        existingByEmail.role === "ADMIN" || currentProfile?.role === "ADMIN" || nextRole === "ADMIN"
          ? "ADMIN"
          : "USER";

      if (currentProfile) {
        await tx.$executeRaw`
          UPDATE "Favorite" AS old
          SET "profileId" = ${user.id}
          WHERE old."profileId" = ${existingByEmail.id}
            AND NOT EXISTS (
              SELECT 1
              FROM "Favorite" AS current
              WHERE current."profileId" = ${user.id}
                AND current."type" = old."type"
                AND current."contentId" = old."contentId"
            )
        `;

        const watchProgressTable = await tx.$queryRaw<Array<{ tableName: string | null }>>`
          SELECT to_regclass('public."WatchProgress"')::text AS "tableName"
        `;

        if (watchProgressTable[0]?.tableName) {
          await tx.$executeRaw`
            UPDATE "WatchProgress" AS old
            SET "profileId" = ${user.id}
            WHERE old."profileId" = ${existingByEmail.id}
              AND NOT EXISTS (
                SELECT 1
                FROM "WatchProgress" AS current
                WHERE current."profileId" = ${user.id}
                  AND current."contentType" = old."contentType"
                  AND current."contentId" = old."contentId"
              )
          `;

          await tx.$executeRaw`
            DELETE FROM "WatchProgress"
            WHERE "profileId" = ${existingByEmail.id}
          `;
        }

        await tx.favorite.deleteMany({
          where: { profileId: existingByEmail.id },
        });

        await tx.profile.update({
          where: { id: existingByEmail.id },
          data: {
            email: buildArchivedProfileEmail(existingByEmail.id),
          },
        });

        await tx.profile.delete({
          where: { id: existingByEmail.id },
        });

        await tx.profile.update({
          where: { id: user.id },
          data: {
            email: nextEmail,
            role: mergedRole,
            lastActive:
              currentProfile.lastActive > existingByEmail.lastActive
                ? currentProfile.lastActive
                : existingByEmail.lastActive,
            currentContent: currentProfile.currentContent || existingByEmail.currentContent,
          },
        });
      } else {
        await tx.profile.update({
          where: { id: existingByEmail.id },
          data: {
            email: buildArchivedProfileEmail(existingByEmail.id),
          },
        });

        await tx.profile.create({
          data: {
            id: user.id,
            email: nextEmail,
            role: mergedRole,
            lastActive: existingByEmail.lastActive,
            currentContent: existingByEmail.currentContent,
          },
        });

        await tx.$executeRaw`
          UPDATE "Favorite" AS old
          SET "profileId" = ${user.id}
          WHERE old."profileId" = ${existingByEmail.id}
            AND NOT EXISTS (
              SELECT 1
              FROM "Favorite" AS current
              WHERE current."profileId" = ${user.id}
                AND current."type" = old."type"
                AND current."contentId" = old."contentId"
            )
        `;

        const watchProgressTable = await tx.$queryRaw<Array<{ tableName: string | null }>>`
          SELECT to_regclass('public."WatchProgress"')::text AS "tableName"
        `;

        if (watchProgressTable[0]?.tableName) {
          await tx.$executeRaw`
            UPDATE "WatchProgress" AS old
            SET "profileId" = ${user.id}
            WHERE old."profileId" = ${existingByEmail.id}
              AND NOT EXISTS (
                SELECT 1
                FROM "WatchProgress" AS current
                WHERE current."profileId" = ${user.id}
                  AND current."contentType" = old."contentType"
                  AND current."contentId" = old."contentId"
              )
          `;

          await tx.$executeRaw`
            DELETE FROM "WatchProgress"
            WHERE "profileId" = ${existingByEmail.id}
          `;
        }

        await tx.favorite.deleteMany({
          where: { profileId: existingByEmail.id },
        });

        await tx.profile.delete({
          where: { id: existingByEmail.id },
        });
      }

      return tx.profile.findUnique({
        where: { id: user.id },
      });
    }

    if (currentProfile || existingByEmail?.id === user.id) {
      const baseProfile = currentProfile || existingByEmail!;
      const mergedRole =
        baseProfile.role === "ADMIN" || nextRole === "ADMIN"
          ? "ADMIN"
          : "USER";

      if (baseProfile.email !== nextEmail || baseProfile.role !== mergedRole) {
        return tx.profile.update({
          where: { id: user.id },
          data: {
            email: nextEmail,
            role: mergedRole,
          },
        });
      }

      return tx.profile.findUnique({
        where: { id: user.id },
      });
    }

    return tx.profile.create({
      data: {
        id: user.id,
        email: nextEmail,
        role: nextRole,
      },
    });
  });
}
