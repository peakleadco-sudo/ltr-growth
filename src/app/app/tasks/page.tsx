import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/feedback";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/primitives";
import { TaskList } from "@/components/app/task-list";
import { requireWorkspace } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";
import type { MarketingTask } from "@/lib/types";
import { NewTaskForm } from "./new-task-form";

export const metadata: Metadata = { title: "Marketing Tasks" };

export default async function TasksPage() {
  const ws = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketing_tasks")
    .select("*")
    .eq("business_profile_id", ws.activeBusiness!.id)
    .order("status")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(300);
  const tasks = (data ?? []) as MarketingTask[];
  const open = tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const done = tasks.filter((t) => t.status === "done" || t.status === "skipped");

  return (
    <div>
      <PageHeader title="Marketing Tasks" description={`Everything to do for ${ws.activeBusiness!.name}. Tasks from strategies, audits and setup appear here automatically.`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Open · {open.length}</CardTitle></CardHeader>
            <CardBody className="p-0">
              {open.length ? <TaskList tasks={open} allowDelete /> : <EmptyState icon={ListChecks} title="You're all caught up" description="Add a task, or generate a strategy to get a weekly plan." className="m-4" />}
            </CardBody>
          </Card>
          {done.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Completed · {done.length}</CardTitle></CardHeader>
              <CardBody className="p-0"><TaskList tasks={done} allowDelete /></CardBody>
            </Card>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader><CardTitle>New task</CardTitle></CardHeader>
          <CardBody><NewTaskForm /></CardBody>
        </Card>
      </div>
    </div>
  );
}
