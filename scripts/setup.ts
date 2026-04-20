import * as bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createAdmin() {
    const username = "admin";
    const password = "admin"; // Change this!

    const existing = await prisma.user.findFirst({
        where: { username }
    });

    if (existing) {
        console.log("Admin user already exists");
        process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
        data: {
            username,
            password: hashedPassword,
            name: "Admin",
            isAdmin: true
        }
    });

    console.log("✅ Admin user created:");
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log("\n⚠️  Please change the password after first login!");
    process.exit(0);
}

createAdmin().catch((error) => {
    console.error("Failed to create admin:", error);
    process.exit(1);
});
