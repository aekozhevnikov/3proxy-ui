"use client";

import { ThemeProvider } from "@/core/theme/ThemeContext";
import { ReactNode, useEffect, useState } from "react";
import { Slide, ToastContainer } from "react-toastify";

import { SessionProvider } from "@/components/session-provider";

interface Props {
    children: ReactNode;
    themeProps?: {
        defaultTheme?: 'light' | 'dark';
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
