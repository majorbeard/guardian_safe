import { clsx } from "clsx";

interface InputProps {
  label?: string;
  type?: string;
  value?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onInput?: (value: string) => void;
}

export default function Input({
  label,
  type = "text",
  value,
  placeholder,
  error,
  disabled = false,
  required = false,
  className,
  onInput,
}: InputProps) {
  return (
    <div class={clsx("space-y-1", className)}>
      {label && (
        <label class="block text-sm font-medium text-gray-700">
          {label}
          {required && <span class="text-red-500 ml-1">*</span>}
        </label>
      )}

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onInput={(e) => onInput?.((e.target as HTMLInputElement).value)}
        class={clsx(
          "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400",
          "focus:outline-none focus:ring-blue-500 focus:border-blue-500",
          "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
          error && "border-red-300 focus:border-red-500 focus:ring-red-500"
        )}
      />

      {error && <p class="text-sm text-red-600">{error}</p>}
    </div>
  );
}
