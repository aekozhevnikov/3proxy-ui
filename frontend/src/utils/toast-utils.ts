import { toast, ToastOptions } from "react-toastify"

interface ShowToastOptions extends ToastOptions {
  type?: "success" | "error" | "info" | "warning"
}

export function showToast(message: string, type: "success" | "error" | "info" | "warning" = "info", options?: ToastOptions) {
  const defaultOptions: ToastOptions = {
    position: "top-center",
    autoClose: 2000,
    hideProgressBar: true,
    pauseOnHover: true,
    pauseOnFocusLoss: true,
    draggable: false,
    theme: "colored",
  }

  switch (type) {
    case "success":
      toast.success(message, { ...defaultOptions, ...options })
      break
    case "error":
      toast.error(message, { ...defaultOptions, ...options })
      break
    case "warning":
      toast.warn(message, { ...defaultOptions, ...options })
      break
    default:
      toast.info(message, { ...defaultOptions, ...options })
  }
}