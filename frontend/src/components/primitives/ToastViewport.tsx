import { useToasts } from "../../state/AppState";
import { ToastView } from "./Toast";

export function ToastViewport() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.slice(-4).map((toast) => (
        <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}
