import "server-only";
import { imageSize } from "image-size";
import { createAdminClient } from "@/lib/supabase/admin";

export const BRAND_BUCKET = "brand-assets";

const SIGNATURES: { mime: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  { mime: "image/png", ext: "png", test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", test: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
  { mime: "application/pdf", ext: "pdf", test: (b) => String.fromCharCode(...b.slice(0, 5)) === "%PDF-" },
];

export type ValidatedFile = { mime: string; ext: string; bytes: Uint8Array; width: number | null; height: number | null };

/**
 * Validates an upload by content (magic bytes), not by the client-supplied type.
 * SVGs are accepted only if they contain no scripts, event handlers or external references.
 */
export function validateUpload(bytes: Uint8Array, opts: { allow: ("image" | "svg" | "pdf")[]; maxBytes: number }): ValidatedFile | { error: string } {
  if (bytes.byteLength === 0) return { error: "The file is empty." };
  if (bytes.byteLength > opts.maxBytes) return { error: `Files must be ${Math.round(opts.maxBytes / 1024 / 1024)} MB or smaller.` };
  const sig = SIGNATURES.find((s) => s.test(bytes));
  if (sig) {
    const isImage = sig.mime.startsWith("image/");
    if (isImage && !opts.allow.includes("image")) return { error: "Images aren't accepted here." };
    if (sig.mime === "application/pdf" && !opts.allow.includes("pdf")) return { error: "PDFs aren't accepted here." };
    let width: number | null = null;
    let height: number | null = null;
    if (isImage) {
      try {
        const d = imageSize(bytes);
        width = d.width ?? null;
        height = d.height ?? null;
        if ((width ?? 0) > 12000 || (height ?? 0) > 12000) return { error: "Image dimensions are too large." };
      } catch {
        return { error: "That image appears to be corrupted." };
      }
    }
    return { mime: sig.mime, ext: sig.ext, bytes, width, height };
  }
  if (opts.allow.includes("svg")) {
    const text = new TextDecoder().decode(bytes.slice(0, 1_000_000));
    if (/<svg[\s>]/i.test(text)) {
      if (/<script|on[a-z]+\s*=|javascript:|<foreignObject|<iframe|<embed|<object|xlink:href\s*=\s*["']?(?!#)|href\s*=\s*["']?(?!#)[a-z]+:/i.test(text)) {
        return { error: "This SVG contains scripts or external references and can't be uploaded. Export a plain SVG or a PNG." };
      }
      return { mime: "image/svg+xml", ext: "svg", bytes, width: null, height: null };
    }
  }
  return { error: "Unsupported file type. Upload a PNG, JPG or WebP image." };
}

export async function signedUrl(path: string, expiresIn = 3600) {
  const { data } = await createAdminClient().storage.from(BRAND_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function signedUrls(paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await createAdminClient().storage.from(BRAND_BUCKET).createSignedUrls(paths, expiresIn);
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
