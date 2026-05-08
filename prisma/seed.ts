import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    // Check if any admin user exists
    const existingAdmin = await prisma.user.findFirst({
        where: { isAdmin: true }
    });

    if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash("admin", 10);

        await prisma.user.create({
            data: {
                username: "admin",
                password: hashedPassword,
                name: "Admin",
                isAdmin: true
            }
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
