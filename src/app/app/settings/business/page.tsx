import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/feedback";
import { requireWorkspace } from "@/lib/workspace";
import { BusinessProfileForm } from "./form";

export const metadata: Metadata = { title: "Business profile" };

export default async function BusinessSettingsPage() {
  const ws = await requireWorkspace();
  const bp = ws.activeBusiness!;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Business profile" description="This information personalizes every AI tool. Keep it accurate and up to date." />
      <BusinessProfileForm bp={bp} canDelete={["owner", "admin"].includes(ws.memberRole)} />
    </div>
  );
}
