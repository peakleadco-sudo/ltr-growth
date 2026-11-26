"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export type GenError = { code: string; message: string; envVars?: string[]; required?: number };

type Response<T> = { ok: true; generationId: string; output: T; creditsCharged: number; duplicate: boolean } | { ok: false; error: GenError };

async function post<T>(tool: string, payload: Record<string, unknown>): Promise<Response<T>> {
  try {
    const res = await fetch(`/api/ai/${tool}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => null);
    if (!json) return { ok: false, error: { code: "NETWORK", message: `The server returned an unexpected response (${res.status}).` } };
    return json as Response<T>;
  } catch {
    return { ok: false, error: { code: "NETWORK", message: "Couldn't reach the server. Check your connection and try again." } };
  }
}

/**
 * Client state for a generator tool. Each submission carries a fresh request id,
 * so a double click or retry of the same submission can never charge twice.
 */
export function useGenerator<T extends Record<string, unknown>>(tool: string, initial?: { output: T; generationId: string } | null) {
  const router = useRouter();
  const [output, setOutput] = useState<T | null>(initial?.output ?? null);
  const [generationId, setGenerationId] = useState<string | null>(initial?.generationId ?? null);
  const [loading, setLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState<string | null>(null);
  const [error, setError] = useState<GenError | null>(null);
  const inflight = useRef(false);

  const run = useCallback(
    async (input: Record<string, unknown>) => {
      if (inflight.current) return;
      inflight.current = true;
      setLoading(true);
      setError(null);
      const res = await post<T>(tool, { requestId: crypto.randomUUID(), input });
      inflight.current = false;
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOutput(res.output);
      setGenerationId(res.generationId);
      router.refresh();
      toast.success(`Generated · ${res.creditsCharged} credit${res.creditsCharged === 1 ? "" : "s"} used`);
    },
    [tool, router],
  );

  const regenerate = useCallback(
    async (section: string, input: Record<string, unknown>) => {
      if (inflight.current || !output) return;
      inflight.current = true;
      setSectionLoading(section);
      const res = await post<Partial<T>>(tool, { requestId: crypto.randomUUID(), input, section, current: output[section] });
      inflight.current = false;
      setSectionLoading(null);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      setOutput((prev) => (prev ? { ...prev, ...res.output } : prev));
      router.refresh();
      toast.success("Section regenerated · 1 credit used");
    },
    [tool, output, router],
  );

  return { output, setOutput, generationId, loading, sectionLoading, error, run, regenerate, reset: () => { setOutput(null); setGenerationId(null); setError(null); } };
}
