import { toast as sonnerToast } from "sonner"

type ToastProps = {
    title?: string
    description?: string
    variant?: "default" | "destructive"
    duration?: number
}

export const toast = ({ title, description, variant = "default", duration = 4000 }: ToastProps) => {
    if (variant === "destructive") {
        sonnerToast.error(title || "Error", {
            description,
            duration,
        })
    } else {
        sonnerToast.success(title || "Success", {
            description,
            duration,
        })
    }
}

export { toast as useToast }