import "@/src/styles/globals.css";

import { Metadata, Viewport } from "next";
import clsx from "clsx";
import { ReactNode } from "react";

import { Providers } from "./providers";

import { currentSession } from "@/src/core/session";
import { app } from "@/src/core/config";
import { createPageTitle } from "@/src/core/utils";
import Footer from "@/src/components/footer";
import SideMenu from "@/src/components/side-menu";
import SideMenuDrawer from "@/src/components/side-menu-drawer";
import { startBackgroundTasks } from "@/src/core/scheduler";
import { ensureAdminExists } from "@/src/core/actions/admin";

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "white" },
        { media: "(prefers-color-scheme: dark)", color: "black" }
    ]
};

export const metadata: Metadata = {
    title: createPageTitle(),
    description: app.description
};

interface Props {
    children: ReactNode;
}

// Flag to prevent multiple initializations in dev (HMR)
let hasInitialized = false;

export default async function RootLayout({ children }: Props) {
    const session = await currentSession();

    // Initialize background tasks and ensure admin exists (server-side only, once)
    // Skip during image build (NEXT_BUILD is set) to avoid side effects
    if (typeof window === "undefined" && !hasInitialized && !process.env.NEXT_BUILD) {
        hasInitialized = true;
        try {
            await ensureAdminExists();
            startBackgroundTasks();
        } catch (error) {
            console.error("Failed to initialize background tasks:", error);
        }
    }

    // noinspection HtmlRequiredTitleElement
    return (
        <html suppressHydrationWarning lang="en">
            <head>
                <link href="/favicon.svg?v=2" rel="icon" sizes="any" type="image/svg+xml" />
            </head>

            <body className={clsx("min-h-screen bg-background text-foreground antialiased")}>
                <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
                    {session.isAuthorized ? (
                        <div className="flex">
                            <div className="hidden lg:block w-[316px] shrink-0">
                                <SideMenu />
                            </div>

                            <div className="relative flex flex-col flex-1 min-h-screen">
                                <SideMenuDrawer />

                                <main className="flex-1 mt-8 lg:mt-0 pt-8 px-2 overflow-x-hidden">{children}</main>

                                <Footer />
                            </div>
                        </div>
                    ) : (
                        <div className="relative flex flex-col w-full h-screen">
                            <main className="w-full grow">{children}</main>

                            <Footer />
                        </div>
                    )}
                </Providers>
            </body>
        </html>
    );
}
