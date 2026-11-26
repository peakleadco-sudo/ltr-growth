"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Bookmark, BookmarkCheck, Download, FileText, Lightbulb, MessageSquarePlus, Paperclip, Pencil, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { CopyButton, GenerationError } from "@/components/ai/result-kit";
import { Markdown } from "@/components/ai/markdown";
import type { GenError } from "@/components/ai/use-generator";
import { conversationToMarkdown, MAX_ATTACHMENT_CHARS } from "@/lib/ai/assistant";
import { downloadFile, slugify } from "@/lib/export";
import { cn, formatDate } from "@/lib/utils";
import { deleteConversation, renameConversation, toggleSavedMessage } from "./actions";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments: { name: string; chars?: number }[];
  metadata: { based_on_profile?: string[]; assumptions?: string[]; suggested_follow_ups?: string[] };
  is_saved: boolean;
  created_at: string;
};
export type ConversationSummary = { id: string; title: string; updated_at: string };

const ACCEPT = ".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json";
const MAX_FILE_BYTES = 200 * 1024;

export function Assistant({
  view,
  conversations,
  activeId,
  initialMessages,
  saved,
  remaining,
  starters,
  businessName,
}: {
  view: "chat" | "saved";
  conversations: ConversationSummary[];
  activeId: string | null;
  initialMessages: ChatMessage[];
  saved: (ChatMessage & { conversation_id: string })[];
  remaining: number;
  starters: string[];
  businessName: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [conversationId, setConversationId] = useState(activeId);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<{ name: string; text: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [error, setError] = useState<GenError | null>(null);
  const [, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const activeTitle = conversations.find((c) => c.id === conversationId)?.title ?? (messages[0]?.content.slice(0, 60) || "New conversation");

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [draft]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);
    setPendingText(message);
    setDraft("");
    const attachments = files;
    setFiles([]);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: crypto.randomUUID(), conversationId, message, attachments }),
      });
      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        setError(json?.error ?? { code: "NETWORK", message: "Something went wrong. Please try again." });
        setDraft(message);
        setFiles(attachments);
        return;
      }
      setMessages((m) => [...m, ...(json.messages as ChatMessage[])]);
      if (!conversationId) {
        setConversationId(json.conversationId);
        window.history.replaceState(null, "", `/app/assistant?c=${json.conversationId}`);
      }
      router.refresh();
    } catch {
      setError({ code: "NETWORK", message: "Couldn't reach the server. Your message is still in the box." });
      setDraft(message);
      setFiles(attachments);
    } finally {
      setSending(false);
      setPendingText(null);
    }
  }

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= 3) { toast.error("You can attach up to 3 documents per message."); break; }
      if (!/\.(txt|md|csv|json)$/i.test(f.name)) { toast.error(`${f.name}: only .txt, .md, .csv and .json files are supported for now.`); continue; }
      if (f.size > MAX_FILE_BYTES) { toast.error(`${f.name} is larger than 200 KB.`); continue; }
      const text = await f.text();
      if (next.reduce((n, x) => n + x.text.length, 0) + text.length > MAX_ATTACHMENT_CHARS) { toast.error("Attached documents are too long in total."); continue; }
      next.push({ name: f.name, text });
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = "";
  }

  function toggleSave(m: ChatMessage) {
    start(async () => {
      setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, is_saved: !m.is_saved } : x)));
      const r = await toggleSavedMessage(m.id, !m.is_saved);
      if (!r.ok) { toast.error(r.error); setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, is_saved: m.is_saved } : x))); }
      else toast.success(m.is_saved ? "Removed from saved" : "Saved");
    });
  }

  const lastFollowUps = [...messages].reverse().find((m) => m.role === "assistant")?.metadata?.suggested_follow_ups ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Conversation list */}
      <aside className="flex max-h-[calc(100vh-14rem)] flex-col rounded-lg border border-border bg-card lg:sticky lg:top-20 lg:self-start">
        <div className="flex gap-1.5 border-b border-border p-2">
          <Button asChild size="sm" className="flex-1"><Link href="/app/assistant"><MessageSquarePlus /> New chat</Link></Button>
          <Button asChild size="sm" variant={view === "saved" ? "secondary" : "ghost"}><Link href="/app/assistant?view=saved" aria-label="Saved responses"><Bookmark /></Link></Button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-1 scrollbar-thin" aria-label="Conversations">
          {conversations.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-subtle">Your conversations will be listed here.</p>
          ) : (
            conversations.map((c) => (
              <Link key={c.id} href={`/app/assistant?c=${c.id}`} aria-current={c.id === conversationId ? "page" : undefined}
                className={cn("block rounded-md px-2.5 py-2 text-[13px] transition-colors", c.id === conversationId ? "bg-white/[0.06] text-fg" : "text-muted hover:bg-white/[0.03] hover:text-fg")}>
                <span className="line-clamp-1">{c.title}</span>
                <span className="text-[11px] text-subtle">{formatDate(c.updated_at, { month: "short", day: "numeric" })}</span>
              </Link>
            ))
          )}
        </nav>
      </aside>

      {view === "saved" ? (
        <section className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold">Saved responses</h2>
          {saved.length === 0 ? (
            <EmptyState icon={Bookmark} title="No saved responses yet" description="Use the bookmark on any LTR AI answer to keep it here." />
          ) : (
            saved.map((m) => (
              <article key={m.id} className="rounded-lg border border-border bg-card p-4">
                <div className="mb-2 flex items-center justify-between gap-2 text-xs text-subtle">
                  <span>{formatDate(m.created_at)}</span>
                  <span className="flex gap-1"><CopyButton text={m.content} size="icon-sm" label="Copy answer" /><Button asChild variant="ghost" size="sm"><Link href={`/app/assistant?c=${m.conversation_id}`}>Open chat</Link></Button></span>
                </div>
                <Markdown>{m.content}</Markdown>
              </article>
            ))
          )}
        </section>
      ) : (
        <section className="flex min-h-[calc(100vh-14rem)] min-w-0 flex-col rounded-lg border border-border bg-card">
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <p className="min-w-0 truncate text-sm font-medium">{conversationId ? activeTitle : "New conversation"}</p>
            {conversationId && (
              <div className="flex shrink-0 gap-0.5">
                <Button variant="ghost" size="icon-sm" aria-label="Export conversation" onClick={() => downloadFile(`${slugify(activeTitle)}.md`, conversationToMarkdown(activeTitle, messages), "text/markdown")}><Download /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Rename conversation" onClick={() => { const t = prompt("Conversation title", activeTitle); if (t) start(async () => { const r = await renameConversation(conversationId, t); if (!r.ok) toast.error(r.error); else router.refresh(); }); }}><Pencil /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete conversation" onClick={() => { if (confirm("Delete this conversation?")) start(async () => { const r = await deleteConversation(conversationId); if (!r.ok) toast.error(r.error); else router.push("/app/assistant"); }); }}><Trash2 /></Button>
              </div>
            )}
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5" aria-live="polite">
            {messages.length === 0 && !pendingText && (
              <div className="mx-auto max-w-2xl py-6 text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-md border border-border bg-bg-2"><Sparkles className="size-5 text-accent" /></div>
                <p className="mt-3 text-base font-medium">How can I help {businessName} grow?</p>
                <p className="mt-1 text-[13px] text-muted">LTR AI uses your saved business profile, brand kit and recent work. Each answer uses 1 credit ({remaining} left).</p>
                <div className="mt-5 grid gap-2 text-left sm:grid-cols-2">
                  {starters.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)} disabled={sending} className="rounded-lg border border-border bg-bg-2 px-3 py-2.5 text-[13px] text-muted transition-colors hover:border-border-strong hover:text-fg">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (m.role === "user" ? <UserBubble key={m.id} m={m} /> : <AssistantBubble key={m.id} m={m} onSave={() => toggleSave(m)} />))}
            {pendingText && (
              <>
                <UserBubble m={{ id: "pending", role: "user", content: pendingText, attachments: [], metadata: {}, is_saved: false, created_at: "" }} />
                <div className="flex items-center gap-2 text-[13px] text-muted" role="status"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-accent" /></span> LTR AI is thinking…</div>
              </>
            )}
            {error && <GenerationError error={error} />}
            <div ref={bottom} />
          </div>

          <div className="border-t border-border p-3">
            {lastFollowUps.length > 0 && !sending && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {lastFollowUps.map((f) => <button key={f} type="button" onClick={() => send(f)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:border-border-strong hover:text-fg">{f}</button>)}
              </div>
            )}
            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-2 px-2 py-1 text-xs"><FileText className="size-3.5 text-subtle" />{f.name}<button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="size-3" /></button></span>
                ))}
              </div>
            )}
            <form className="flex items-end gap-2 rounded-lg border border-border bg-bg-2 p-1.5 focus-within:border-accent/60" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
              <input ref={fileInput} type="file" accept={ACCEPT} multiple hidden onChange={(e) => addFiles(e.target.files)} />
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Attach a document" title="Attach .txt, .md, .csv or .json (max 200 KB)" onClick={() => fileInput.current?.click()}><Paperclip /></Button>
              <textarea ref={textarea} rows={1} value={draft} maxLength={6000} onChange={(e) => setDraft(e.target.value)} aria-label="Message LTR AI"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(draft); } }}
                placeholder="Ask about your marketing…" className="max-h-56 min-h-8 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-fg placeholder:text-subtle focus:outline-none" />
              <Button type="submit" size="icon-sm" aria-label="Send" disabled={!draft.trim() || sending} loading={sending}>{!sending && <ArrowUp />}</Button>
            </form>
            <p className="mt-1.5 text-center text-[11px] text-subtle">LTR AI can make mistakes and never guarantees results. Verify important details.</p>
          </div>
        </section>
      )}
    </div>
  );
}

function UserBubble({ m }: { m: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-lg bg-white/[0.07] px-3.5 py-2.5 text-sm">
        <p className="whitespace-pre-wrap">{m.content}</p>
        {m.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">{m.attachments.map((a, i) => <span key={i} className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted"><FileText className="size-3" />{a.name}</span>)}</div>
        )}
      </div>
    </div>
  );
}

function AssistantBubble({ m, onSave }: { m: ChatMessage; onSave: () => void }) {
  const facts = m.metadata?.based_on_profile ?? [];
  const assumptions = m.metadata?.assumptions ?? [];
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-bg-2"><Sparkles className="size-3.5 text-accent" /></div>
      <div className="min-w-0 flex-1">
        <Markdown>{m.content}</Markdown>
        {(facts.length > 0 || assumptions.length > 0) && (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {facts.length > 0 && (
              <details className="rounded-md border border-border bg-bg-2 px-3 py-2 text-xs">
                <summary className="flex cursor-pointer items-center gap-1.5 text-muted"><ShieldCheck className="size-3.5 text-success" /> Based on your profile ({facts.length})</summary>
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-muted">{facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </details>
            )}
            {assumptions.length > 0 && (
              <details className="rounded-md border border-warning/25 bg-warning/[0.04] px-3 py-2 text-xs">
                <summary className="flex cursor-pointer items-center gap-1.5 text-muted"><Lightbulb className="size-3.5 text-warning" /> Assumptions ({assumptions.length})</summary>
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-muted">{assumptions.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </details>
            )}
          </div>
        )}
        <div className="mt-1.5 flex gap-0.5">
          <CopyButton text={m.content} size="icon-sm" label="Copy answer" />
          <Button type="button" variant="ghost" size="icon-sm" aria-label={m.is_saved ? "Unsave answer" : "Save answer"} onClick={onSave}>{m.is_saved ? <BookmarkCheck className="text-accent" /> : <Bookmark />}</Button>
        </div>
      </div>
    </div>
  );
}
