"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Slide, ToastContainer } from "react-toastify";

import { SessionProvider } from "@/src/components/session-provider";
import { ThemeProvider } from "@/src/components/ThemeProvider";

interface Props {
    children: ReactNode;
    themeProps?: {
        attribute?: "class" | "data";
        defaultTheme?: "light" | "dark";
        disableTransitionOnChange?: boolean;
    };
}

export function Providers({ children, themeProps }: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <SessionProvider>
            <ThemeProvider {...themeProps}>{children}</ThemeProvider>
            {mounted && (
                <ToastContainer
                    closeOnClick
                    hideProgressBar
                    pauseOnFocusLoss
                    pauseOnHover
                    autoClose={2000}
                    className="rounded-full size-fit"
                    draggable={false}
                    newestOnTop={false}
                    position="top-center"
                    rtl={false}
                    theme="colored"
                    transition={Slide}
                />
            )}
        </SessionProvider>
    );
}