import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/feedback";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui/primitives";
import { Faq } from "@/components/marketing/faq";
import { getFaqs } from "@/lib/public-data";
import { hasFeature, requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { SupportForm } from "./support-form";

export const metadata: Metadata = { title: "Help & Support" };

export default async function HelpPage() {
  const ws = await requireWorkspace();
  const supabase = await createClient();
  const [{ data: requests }, faqs] = await Promise.all([
    supabase.from("support_requests").select("id, subject, status, created_at").eq("user_id", ws.user.id).order("created_at", { ascending: false }).limit(10),
    getFaqs(),
  ]);
  const priority = hasFeature(ws, "priority_support");
  return (
    <div>
      <PageHeader title="Help & Support" description="Answers to common questions, or send a message to our team." />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Faq items={faqs} />
          <p className="text-sm text-muted">Need hands-on help with your marketing? <Link href="/app/agency" className="text-fg underline-offset-4 hover:underline">Work with LTRMarketing</Link>.</p>
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Contact support</CardTitle>{priority && <Badge tone="accent">Priority</Badge>}</CardHeader>
            <CardBody><SupportForm email={ws.profile.email ?? ""} /></CardBody>
          </Card>
          {requests && requests.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Your requests</CardTitle></CardHeader>
              <CardBody className="p-0">
                <ul className="divide-y divide-border">
                  {requests.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                      <span className="truncate">{r.subject}</span>
                      <span className="flex shrink-0 items-center gap-2"><Badge>{r.status}</Badge><span className="text-subtle">{formatDate(r.created_at, { month: "short", day: "numeric" })}</span></span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
