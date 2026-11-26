import { Notice } from "@/components/ui/feedback";
import { isSupabaseConfigured } from "@/lib/env";

export function AuthCard({ title, description, children, footer }: { title: string; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-2xl shadow-black/40 sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
        <div className="mt-6">
          {isSupabaseConfigured ? children : <AuthNotConfigured />}
        </div>
      </div>
      {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
    </div>
  );
}

export function AuthNotConfigured() {
  return (
    <Notice tone="integration" title="Authentication isn't configured yet">
      <p>Accounts are powered by Supabase Auth. To enable sign-up and login, set these environment variables on the server and restart:</p>
      <ul className="mt-2 space-y-1 font-mono text-[12px] text-fg">
        <li>NEXT_PUBLIC_SUPABASE_URL</li>
        <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
        <li>SUPABASE_SERVICE_ROLE_KEY</li>
      </ul>
      <p className="mt-2">Then apply the database migrations in <code className="text-fg">supabase/migrations</code>. See the README for step-by-step setup.</p>
    </Notice>
  );
}
