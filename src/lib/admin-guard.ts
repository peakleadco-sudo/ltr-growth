import "server-only";
import { notFound } from "next/navigation";
import { getWorkspace } from "@/lib/workspace";

/** Server-side admin authorization. Non-admins get a 404 so the portal isn't discoverable. */
export async function requireAdmin() {
  const ws = await getWorkspace();
  if (!ws || ws.profile.platform_role !== "admin") notFound();
  return ws;
}
