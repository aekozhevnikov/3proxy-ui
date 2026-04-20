import { toast, ToastOptions, ToastPosition } from "react-toastify";

type ToastType = "success" | "error" | "warning" | "info";

const TOAST_OPTIONS: ToastOptions = {
    position: "top-center" as ToastPosition,
    autoClose: 2000,
    hideProgressBar: true,
    draggable: false,
    closeOnClick: true,
    closeButton: false,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    theme: "colored",
    style: {
        minHeight: "32px",
        maxHeight: "100px",
        width: "fit-content",
        borderRadius: "50px",
        padding: "0.5rem 0.75rem",
        fontSize: "0.875rem"
        // minWidth: "200px",
        // maxWidth: "300px"
    }
};

export function showToast(message: string, type: ToastType = "success"): void {
    switch (type) {
        case "success":
            toast.success(message, TOAST_OPTIONS);
            break;
        case "error":
            toast.error(message, TOAST_OPTIONS);
            break;
        case "warning":
            toast.warning(message, TOAST_OPTIONS);
            break;
        case "info":
            toast.info(message, TOAST_OPTIONS);
            break;
    }
}
