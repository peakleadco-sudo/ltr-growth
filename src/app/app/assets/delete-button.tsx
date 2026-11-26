"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteAssetButton({ id }: { id: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  return (
    <button
      className={`rounded p-1 ${armed ? "text-accent" : "text-subtle hover:text-fg"}`}
      aria-label={armed ? "Click again to delete" : "Delete asset"}
      title={armed ? "Click again to delete" : "Delete"}
      onBlur={() => setArmed(false)}
      onClick={async () => {
        if (!armed) return setArmed(true);
        const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
        if (!res.ok) toast.error("Couldn't delete this file.");
        else { toast.success("Deleted"); router.refresh(); }
      }}
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
