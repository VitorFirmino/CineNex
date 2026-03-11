import { Loader2 } from "lucide-react";

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Loader2 className="size-12 animate-spin text-emerald-500" />
    </div>
  );
}
