// Client-side text extraction for chat attachments.
// Supported: .txt, .csv, .pdf, .docx

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_EXTRACTED_CHARS = 60_000;

export type AttachmentKind = "txt" | "csv" | "pdf" | "docx";

export function detectKind(file: File): AttachmentKind | null {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt")) return "txt";
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  return null;
}

async function readAsText(file: File): Promise<string> {
  return await file.text();
}

async function readPdf(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  // Use bundled worker via Vite ?url import
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let out = "";
  const maxPages = Math.min(doc.numPages, 50);
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out += tc.items.map((it: any) => ("str" in it ? it.str : "")).join(" ") + "\n\n";
    if (out.length > MAX_EXTRACTED_CHARS) break;
  }
  return out;
}

async function readDocx(file: File): Promise<string> {
  // @ts-expect-error - mammoth browser build ships no types
  const mammoth: any = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value || "";
}

export async function extractFileText(file: File): Promise<{ kind: AttachmentKind; text: string }> {
  const kind = detectKind(file);
  if (!kind) throw new Error("UNSUPPORTED_FILE_TYPE");
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("FILE_TOO_LARGE");

  let text = "";
  if (kind === "txt" || kind === "csv") text = await readAsText(file);
  else if (kind === "pdf") text = await readPdf(file);
  else if (kind === "docx") text = await readDocx(file);

  text = text.replace(/\u0000/g, "").trim();
  if (text.length > MAX_EXTRACTED_CHARS) {
    text = text.slice(0, MAX_EXTRACTED_CHARS) + "\n\n[…truncated]";
  }
  return { kind, text };
}
