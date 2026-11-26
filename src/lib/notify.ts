import "server-only";
import { createAdminClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

/** Server-side notification creation (users cannot insert notifications directly). */
export async function notify(n: { userId: string; organizationId?: string | null; kind?: "info" | "success" | "warning" | "error" | "billing"; title: string; body?: string; link?: string }) {
  if (!isServiceRoleConfigured()) return;
  await createAdminClient()
    .from("notifications")
    .insert({ user_id: n.userId, organization_id: n.organizationId ?? null, kind: n.kind ?? "info", title: n.title, body: n.body ?? null, link: n.link ?? null })
    .then(() => undefined, () => undefined);
}
