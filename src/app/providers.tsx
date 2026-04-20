"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode, useEffect, useState } from "react";
import { Slide, ToastContainer } from "react-toastify";

import { SessionProvider } from "@/src/components/session-provider";

interface Props {
    children: ReactNode;
    themeProps?: {
        attribute?: "class" | "data";
        defaultTheme?: string;
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
            <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
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
