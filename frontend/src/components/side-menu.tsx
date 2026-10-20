"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightStartOnRectangleIcon, HomeIcon, UserGroupIcon, UserIcon } from "@heroicons/react/24/outline";
import { useTheme } from "next-themes";
import Image from "next/image";

import { HeartFilledIcon, MoonFilledIcon, SunFilledIcon } from "./icons";

import DonationModal from "@/src/components/modals/donation-modal";

const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: HomeIcon },
    { name: "Users", href: "/admin/users", icon: UserGroupIcon },
    { name: "Profile", href: "/admin/profile", icon: UserIcon }
];

export default function SideMenu() {
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return (
        <>
            <DonationModal disclosure={{ isOpen: isDonationModalOpen, onOpenChange: setIsDonationModalOpen }} />

            <div className="sticky top-0 z-40 h-screen w-[316px] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
                <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 px-6">
                    <Link className="flex items-center gap-4" href="/admin/dashboard">
                        <Image
                            alt="3proxy"
                            className="h-10 w-10"
                            height={40}
                            loading="eager"
                            src="/favicon.svg"
                            width={40}
                        />
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">3proxy UI</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <button
                            aria-label="Donation"
                            className="p-2 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
                            onClick={() => setIsDonationModalOpen(true)}
                        >
                            <HeartFilledIcon className="h-5 w-5" />
                        </button>

                        <button
                            aria-label="Toggle theme"
                            className="p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            onClick={toggleTheme}
                        >
                            <div className="relative h-5 w-5">
                                <MoonFilledIcon className="h-5 w-5 text-blue-600 dark:hidden" />
                                <SunFilledIcon className="h-5 w-5 text-amber-500 hidden dark:block" />
                            </div>
                        </button>
                    </div>
                </div>

                <nav className="mt-6 px-4 flex-1 space-y-2">
                    {navigation.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.name}
                                className={`flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition ${
                                    isActive
                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                }`}
                                href={item.href}
                            >
                                <Icon className="h-5 w-5 shrink-0" />
                                <span className="truncate">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2">
                    <button
                        className="flex items-center gap-3 w-full rounded-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-pink-50 dark:text-gray-300 dark:hover:bg-pink-900/20 transition"
                        onClick={() => setIsDonationModalOpen(true)}
                    >
                        <HeartFilledIcon className="h-5 w-5 shrink-0" />
                        <span className="truncate">Donation</span>
                    </button>

                    <button
                        className="flex items-center gap-3 w-full rounded-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                        onClick={handleLogout}
                    >
                        <ArrowRightStartOnRectangleIcon className="h-5 w-5 shrink-0 text-gray-700 dark:text-gray-300" />
                        <span className="truncate">Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}
