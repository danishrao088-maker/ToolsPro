import { LoaderCircle } from "lucide-react";

export function LoadingIndicator({ label = "Loading..." }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10">
      <LoaderCircle aria-hidden="true" size={20} className="animate-spin" />
      <span>{label}</span>
    </div>
  );
}