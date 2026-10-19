import { Metadata } from "next";
import { redirect } from "next/navigation";

import { resolveAdmin } from "@/src/core/auth";
import { createPageTitle } from "@/src/core/utils";
import UsersList from "@/src/app/admin/users/components/users-list";

export const metadata: Metadata = {
    title: createPageTitle("Users")
};

export const dynamic = "force-dynamic";

export default async function UsersPage() {
    if (!(await resolveAdmin())) {
        redirect("/login");
    }

    return (
        <div className="container mx-auto px-4 py-6 sm:py-8">
            <UsersList />
        </div>
    );
}
