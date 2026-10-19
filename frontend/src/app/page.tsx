"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
    const navigate = useNavigate();

    useEffect(() => {
        // Simple client-side redirect
        navigate("/login", { replace: true });
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
        </div>
    );
}
