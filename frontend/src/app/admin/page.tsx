import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminRedirectPage() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate("/admin/dashboard", { replace: true });
    }, [navigate]);

    return null;
}
