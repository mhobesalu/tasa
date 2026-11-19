// Web links in task texts: find them, tidy them, and split text so links can be tapped.

const FIND = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;

/** Trailing punctuation that belongs to the sentence, not the link. */
function trim(u: string): string {
  let x = u.replace(/[.,;:!?…]+$/, "");
  // a closing bracket only belongs to the link if it also opens one
  while (/[)\]]$/.test(x) && (x.match(/\(/g) ?? []).length < (x.match(/\)/g) ?? []).length) x = x.slice(0, -1);
  return x;
}

/** "www.x.ee" -> "https://www.x.ee". Returns null for anything that is not a web address. */
export function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t || /\s/.test(t)) return null;
  const u = /^https?:\/\//i.test(t) ? t : /^www\./i.test(t) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(t) ? `https://${t}` : null;
  if (!u) return null;
  try {
    const p = new URL(u);
    return /\.[a-z]{2,}$/i.test(p.hostname) ? u : null;
  } catch {
    return null;
  }
}

/** Text split into plain parts and links (in order). */
export function splitLinks(text: string): { text: string; url?: string }[] {
  const out: { text: string; url?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(FIND)) {
    const shown = trim(m[0]);
    const url = normalizeUrl(shown);
    if (!url) continue;
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at) });
    out.push({ text: shown, url });
    last = at + shown.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

export function findLinks(text: string): string[] {
  return splitLinks(text).filter((p) => p.url).map((p) => p.url!);
}

/** Short label for a link: host + start of the path. */
export function linkLabel(url: string): string {
  try {
    const p = new URL(url);
    const path = p.pathname === "/" ? "" : p.pathname;
    const s = p.hostname.replace(/^www\./, "") + path;
    return s.length > 38 ? s.slice(0, 37) + "…" : s;
  } catch {
    return url;
  }
}

/**
 * Lines read from a screenshot or a phone copy break wherever the screen ended.
 * Join them into running text; links stay on their own line.
 */
export function joinWrapped(lines: string[]): string {
  const out: string[] = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    const prev = out[out.length - 1];
    const isLink = /^(?:https?:\/\/|www\.)\S+$/i.test(l);
    if (prev === undefined || isLink || /^(?:https?:\/\/|www\.)\S+$/i.test(prev)) out.push(l);
    // "kodu-" + "töö": a word split over two lines
    else if (/\p{L}-$/u.test(prev) && /^\p{Ll}/u.test(l)) out[out.length - 1] = prev.slice(0, -1) + l;
    else out[out.length - 1] = `${prev} ${l}`;
  }
  return out.join("\n");
}

/** The text with its links taken out (for a short title). */
export function withoutLinks(text: string): string {
  const parts = splitLinks(text);
  if (!parts.some((p) => p.url)) return text.trim();
  return parts
    .filter((p) => !p.url)
    .map((p) => p.text)
    .join("")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([.;:!?]|,(?!,))/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
