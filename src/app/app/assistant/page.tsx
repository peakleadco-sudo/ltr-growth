import type { Metadata } from "next";
import { ToolShell } from "@/components/ai/tool-shell";
import { loadToolPage } from "@/lib/ai/tool-page";
import { starterPrompts } from "@/lib/ai/assistant";
import { createClient } from "@/lib/supabase/server";
import { Assistant, type ChatMessage, type ConversationSummary } from "./chat";

export const metadata: Metadata = { title: "LTR AI" };

export default async function AssistantPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { ws, included, aiConfigured, remaining } = await loadToolPage("assistant", "assistant");
  const view = sp.view === "saved" ? "saved" : "chat";

  let conversations: ConversationSummary[] = [];
  let messages: ChatMessage[] = [];
  let saved: (ChatMessage & { conversation_id: string })[] = [];
  let activeId: string | null = null;

  if (included) {
    const supabase = await createClient();
    const { data: convs } = await supabase
      .from("ai_conversations")
      .select("id, title, updated_at")
      .eq("user_id", ws.user.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false })
      .limit(50);
    conversations = (convs ?? []) as ConversationSummary[];
    const requested = typeof sp.c === "string" ? sp.c : null;
    activeId = requested && conversations.some((c) => c.id === requested) ? requested : null;
    if (activeId) {
      const { data } = await supabase
        .from("ai_messages")
        .select("id, role, content, attachments, metadata, is_saved, created_at")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true })
        .limit(200);
      messages = ((data ?? []) as ChatMessage[]).map((m) => ({ ...m, attachments: (m.attachments ?? []).map((a) => ({ name: a.name, chars: a.chars })) }));
    }
    if (view === "saved") {
      const { data } = await supabase
        .from("ai_messages")
        .select("id, role, content, attachments, metadata, is_saved, created_at, conversation_id")
        .eq("is_saved", true)
        .eq("role", "assistant")
        .order("created_at", { ascending: false })
        .limit(100);
      saved = (data ?? []) as typeof saved;
    }
  }

  return (
    <ToolShell
      title="LTR AI"
      description="Your marketing assistant. It knows your business profile, brand kit, goals and recent work."
      included={included}
      aiConfigured={aiConfigured}
    >
      <Assistant
        key={activeId ?? "new"}
        view={view}
        conversations={conversations}
        activeId={activeId}
        initialMessages={messages}
        saved={saved}
        remaining={remaining}
        starters={starterPrompts({ name: ws.activeBusiness!.name, industry: ws.activeBusiness!.industry, location: ws.activeBusiness!.location, goals: ws.activeBusiness!.goals ?? [] })}
        businessName={ws.activeBusiness!.name}
      />
    </ToolShell>
  );
}
