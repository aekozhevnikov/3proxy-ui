"use client"

import { NavLink } from "react-router-dom"
import { usePathname } from "@/hooks/usePathname"
import { HomeIcon, UserGroupIcon, UserIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { useTheme } from "@/hooks/useTheme"


const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
    { name: "Users", href: "/users", icon: UserGroupIcon },
    { name: "Profile", href: "/profile", icon: UserIcon }
]

export default function SideMenuDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const pathname = usePathname()
    const { theme, setTheme } = useTheme()

    if (!isOpen) return null

    return (
        <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            role="button"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    onClose()
                }
            }}
        >
            <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 shadow-lg z-50">
                <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
                    <NavLink
                        className="flex items-center gap-3 flex-1"
                        to="/dashboard"
                        onClick={onClose}
                    >
                        <img
                            alt="3proxy"
                            className="h-8 w-8 shrink-0"
                            height={32}
                            loading="eager"
                            src="/favicon.svg"
                            width={32}
                        />
                        <span className="text-lg font-bold text-gray-900 dark:text-white truncate">
                            3proxy UI
                        </span>
                    </NavLink>

                    <div className="flex items-center gap-2">
                        <button
                            aria-label="Toggle theme"
                            className="px-3 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                            onClick={() => {
                                setTheme(theme === "light" ? "dark" : "light")
                            }}
                        >
                            <div className="relative h-5 w-5">
                                <svg className="h-5 w-5 text-blue-600 dark:hidden" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 00-9 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.5 10.5 0 009.22 2.53c1.094 0 2.118-.206 3.08-.566a.75.75 0 01.75.36v.03a.75.75 0 01-.396.927 12.08 12.08 0 01-6.84 3.445.75.75 0 01-1.312-.94.75.75 0 01-.25-.656 10.5 10.5 0 00-1.602-6.116.75.75 0 011.477-1.077A10.5 10.5 0 0012 3.75a10.5 10.5 0 00-10.5 10.5c0 3.247 1.708 6.074 4.235 7.777.75.75 0 01-.876 1.468l-.04-.03A10.54 10.54 0 013 12c0-4.2 3.3-7.5 7.5-7.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75h.008z" clipRule="evenodd" /></svg>
                                <svg className="h-5 w-5 text-amber-500 hidden dark:block" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zM7.5 3a.75.75 0 01-.75.75v2.25a.75.75 0 01-1.5 0v-2.25a.75.75 0 01.75-.75zM19.5 3a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3.75a.75.75 0 01.75-.75zM12 8.25a.75.75 0 01.75.75h7.5a.75.75 0 010 1.5H12a.75.75 0 01-.75-.75z" /></svg>
                            </div>
                        </button>
                        <button
                            className="px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                            onClick={onClose}
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <nav className="mt-6 px-4 flex-1 space-y-2">
                    {navigation.map((item) => {
                        const Icon = item.icon

                        return (
                            <NavLink
                                key={item.name}
                                className={() =>
                                    `flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition ${
                                        pathname.startsWith(item.href)
                                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                            : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                                    }`
                            }
                            to={item.href}
                            onClick={onClose}
                        >
                            <Icon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                            <span className="truncate">{item.name}</span>
                        </NavLink>
                    )
                })}
            </nav>

            <div className="mt-4 p-4 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2">
                <button
                    className="flex items-center gap-3 w-full rounded-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-pink-50 dark:text-gray-300 dark:hover:bg-pink-900/20 transition"
                >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 21.35l-1.45-1.32c-5.15-4.67-8.55-7.75-8.55-11.53a6.01 6.01 0 0112 0c0 3.78-3.4 6.8-8.55 11.53l-1.45 1.32z" clipRule="evenodd" /></svg>
                    <span className="truncate">Donation</span>
                </button>

                <button
                    className="flex items-center gap-3 w-full rounded-full px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 transition"
                    onClick={() => {
                        fetch("/api/auth/logout", { method: "POST" }).then(() => window.location.href = "/login")
                    }}
                >
                    <svg className="h-5 w-5 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span className="truncate">Logout</span>
                </button>
            </div>
        </div>
        </div>
      )
    }
