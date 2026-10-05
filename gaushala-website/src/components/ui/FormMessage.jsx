import { CheckCircle2, AlertCircle } from "lucide-react";

// `status` is { type: "success" | "error", text: string } | null
export default function FormMessage({ status }) {
  if (!status) return null;

  const isSuccess = status.type === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      role="status"
      className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
        isSuccess
          ? "bg-pasture-50 text-pasture-700"
          : "bg-red-50 text-red-600"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{status.text}</span>
    </div>
  );
}
