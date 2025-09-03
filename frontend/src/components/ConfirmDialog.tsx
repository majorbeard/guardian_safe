import { AlertTriangle, Info, XCircle } from "lucide-preact";
import { Modal } from "./Modal";
import Button from "./Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={false}
    >
      <div class="p-6">
        <div class="flex items-start space-x-4">
          <div
            class={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
              type === "danger"
                ? "bg-red-100"
                : type === "warning"
                ? "bg-yellow-100"
                : "bg-blue-100"
            }`}
          >
            {type === "danger" ? (
              <XCircle class="h-6 w-6 text-red-600" />
            ) : type === "warning" ? (
              <AlertTriangle class="h-6 w-6 text-yellow-600" />
            ) : (
              <Info class="h-6 w-6 text-blue-600" />
            )}
          </div>
          <div class="flex-1">
            <p class="text-sm text-gray-700">{message}</p>
          </div>
        </div>

        <div class="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={type === "danger" ? "danger" : "primary"}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
