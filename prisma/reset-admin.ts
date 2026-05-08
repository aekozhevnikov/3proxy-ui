import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function resetAdminPassword() {
    // Find admin user
    const admin = await prisma.user.findFirst({
        where: { isAdmin: true }
    });

    if (!admin) {
        process.exit(1);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash("admin", 10);

    // Update admin password
    await prisma.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword }
    });
}

resetAdminPassword()
    .catch((e) => {
        console.error("Error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
