const MAX_CONTENT_LENGTH = 2 * 1024 * 1024; // 2 MiB of extracted text

export async function extractPdfText(
  buffer: Uint8Array,
): Promise<{ text: string; pageCount: number }> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const doc = await getDocumentProxy(buffer);
  const pageCount = doc.numPages;
  const { text } = await extractText(doc, { mergePages: true });
  const joined = Array.isArray(text) ? text.join("\n\n") : text;
  return {
    pageCount,
    text: truncate(joined),
  };
}

function truncate(value: string): string {
  if (value.length <= MAX_CONTENT_LENGTH) return value;
  return `${value.slice(0, MAX_CONTENT_LENGTH)}\n...(truncated)`;
}

function stripHtml(html: string): string {
  // Drop <script> and <style> bodies, then strip tags.
  const withoutBlocks = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  const tagless = withoutBlocks.replace(/<[^>]+>/g, " ");
  return tagless
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export interface FetchedUrl {
  text: string;
  title: string | null;
  contentType: string;
}

export async function fetchUrlContent(url: string): Promise<FetchedUrl> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "lab-ai-context-fetcher/0.1" },
  });
  if (!res.ok) {
    throw new Error(`URL fetch failed: ${res.status} ${res.statusText}`);
  }
  const contentType = res.headers.get("content-type") ?? "text/plain";
  if (contentType.includes("application/pdf")) {
    const buf = new Uint8Array(await res.arrayBuffer());
    const { text } = await extractPdfText(buf);
    return { text, title: null, contentType };
  }
  const raw = await res.text();
  if (contentType.includes("text/html")) {
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1] ? stripHtml(titleMatch[1]) : null;
    return { text: truncate(stripHtml(raw)), title, contentType };
  }
  return { text: truncate(raw), title: null, contentType };
}
