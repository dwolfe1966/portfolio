import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const localDatasourceUrl =
  process.env.NODE_ENV === "production"
    ? process.env.DATABASE_URL
    : process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient(
    localDatasourceUrl
      ? {
          datasources: {
            db: { url: localDatasourceUrl }
          }
        }
      : undefined
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
