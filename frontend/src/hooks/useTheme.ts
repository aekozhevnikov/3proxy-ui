import { useState, useEffect, useCallback } from "react"

export function useTheme() {
    const [theme, setThemeState] = useState(() => {
        if (typeof window === "undefined") return "light"
        return (localStorage.getItem("theme") as "light" | "dark") || "light"
    })

    useEffect(() => {
        const root = document.documentElement
        if (theme === "dark") root.classList.add("dark")
        else root.classList.remove("dark")
        localStorage.setItem("theme", theme)
    }, [theme])

    const setTheme = useCallback((t: "light" | "dark") => {
        setThemeState(t)
    }, [])

    return { theme, setTheme }
}
