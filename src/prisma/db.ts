import { PrismaClient } from "@prisma/client";

declare global {
    var prisma: InstanceType<typeof PrismaClient> | undefined;
}

export const prisma = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
