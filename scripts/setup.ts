import * as bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createAdmin() {
    // The entrypoint runs this on every boot, so the credentials have to come
    // from the environment. They used to be hardcoded to admin/admin here while
    // src/core/actions/admin.ts read ADMIN_USERNAME and ADMIN_PASSWORD, which
    // meant the first account was created with a password that only the
    // documentation warned about.
    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD;
    const usingDefault = !password;

    if (usingDefault && process.env.NODE_ENV === "production") {
        console.warn(
            "→ ADMIN_PASSWORD is not set, the admin account will use a well-known default. Set it in the environment before exposing the panel."
        );
    }

    const existing = await prisma.user.findFirst({
        where: { username }
    });

    if (existing) {
        process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password || "admin", 10);

    await prisma.user.create({
        data: {
            username,
            password: hashedPassword,
            name: process.env.ADMIN_NAME || "Administrator",
            isAdmin: true
        }
    });

    if (!usingDefault) {
        console.log(`→ Created admin "${username}" with the password from ADMIN_PASSWORD`);
    }

    process.exit(0);
}

createAdmin().catch((error) => {
    console.error("Failed to create admin:", error);
    process.exit(1);
});
