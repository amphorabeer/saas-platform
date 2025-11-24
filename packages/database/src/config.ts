// Import prisma from index to reuse the same instance
// This avoids circular dependency by importing the exported prisma
import { prisma } from "./index";
import { Prisma } from "@prisma/client";

export async function getConfig(key: string) {
  try {
    // Check if prisma is initialized
    if (!prisma) {
      throw new Error("Prisma client not initialized");
    }
    
    // Check if Configuration model exists
    if (!prisma.configuration) {
      throw new Error("Configuration model not found in Prisma client. Run: npx prisma generate");
    }
    
    // Try using Prisma ORM first
    try {
      const config = await prisma.configuration.findUnique({
        where: { key },
      });
      if (config) {
        console.log(`[getConfig] Found config for key "${key}" using Prisma ORM`);
        return config.value;
      } else {
        console.log(`[getConfig] No config found for key "${key}" using Prisma ORM`);
        return null;
      }
    } catch (prismaError: any) {
      // If Prisma fails with permission error, try raw SQL as fallback
      if (prismaError.code === "P1010" || prismaError.message?.includes("denied access")) {
        console.warn("[getConfig] Prisma permission error (code:", prismaError.code, "), trying raw SQL fallback");
        try {
          const result = await prisma.$queryRaw<Array<{ value: any }>>(
            Prisma.sql`SELECT value FROM "Configuration" WHERE key = ${key} LIMIT 1`
          );
          if (result && result.length > 0) {
            console.log(`[getConfig] Found config for key "${key}" using raw SQL fallback`);
            return result[0].value;
          }
          console.log(`[getConfig] No config found for key "${key}" using raw SQL fallback`);
          return null;
        } catch (sqlError: any) {
          console.error("[getConfig] Raw SQL also failed:", sqlError.message, sqlError.code);
          // If raw SQL also fails, return null (config doesn't exist yet)
          if (sqlError.code === "P1010") {
            console.warn("[getConfig] Raw SQL also has permission issues, returning null");
            return null;
          }
          throw sqlError;
        }
      }
      throw prismaError;
    }
  } catch (error: any) {
    console.error(`[getConfig] Error getting config for key "${key}":`, error);
    console.error("[getConfig] Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      clientVersion: error?.clientVersion,
      hasConfiguration: !!prisma?.configuration,
    });
    throw error;
  }
}

export async function setConfig(key: string, value: any) {
  try {
    // Check if prisma is initialized
    if (!prisma) {
      throw new Error("Prisma client not initialized");
    }
    
    // Try using Prisma ORM first
    try {
      const result = await prisma.configuration.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });
      console.log(`[setConfig] Successfully saved config for key "${key}" using Prisma ORM`);
      return result;
    } catch (prismaError: any) {
      // If Prisma fails with permission error, try raw SQL as fallback
      if (prismaError.code === "P1010" || prismaError.message?.includes("denied access")) {
        console.warn("[setConfig] Prisma permission error (code:", prismaError.code, "), trying raw SQL fallback");
        try {
          const valueJson = JSON.stringify(value);
          await prisma.$executeRaw(
            Prisma.sql`
              INSERT INTO "Configuration" (id, key, value, "createdAt", "updatedAt")
              VALUES (gen_random_uuid()::text, ${key}, ${valueJson}::jsonb, NOW(), NOW())
              ON CONFLICT (key) DO UPDATE SET value = ${valueJson}::jsonb, "updatedAt" = NOW()
            `
          );
          console.log(`[setConfig] Successfully saved config for key "${key}" using raw SQL fallback`);
          return { key, value };
        } catch (sqlError: any) {
          console.error("[setConfig] Raw SQL also failed:", sqlError.message, sqlError.code);
          // If raw SQL also fails with permission error, we can't save to database
          // The frontend will fall back to localStorage
          if (sqlError.code === "P1010") {
            throw new Error("Database permission denied. Please check PostgreSQL permissions or use localStorage fallback.");
          }
          throw sqlError;
        }
      }
      throw prismaError;
    }
  } catch (error: any) {
    console.error(`[setConfig] Error setting config for key "${key}":`, error);
    console.error("[setConfig] Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      clientVersion: error?.clientVersion,
    });
    throw error;
  }
}

export async function deleteConfig(key: string) {
  return prisma.configuration.delete({
    where: { key },
  });
}

export async function getAllConfigs() {
  return prisma.configuration.findMany({
    orderBy: { updatedAt: "desc" },
  });
}

