import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const rows = await db.select().from(schema.uploadedImages).where(eq(schema.uploadedImages.id, id)).limit(1);
  const img = rows[0];
  if (!img) return new Response("Not found", { status: 404 });
  const raw = img.bytes as unknown;
  const bytes =
    typeof raw === "string" ? Buffer.from(raw.startsWith("\\x") ? raw.slice(2) : raw, raw.startsWith("\\x") ? "hex" : "base64") : Buffer.from(raw as Uint8Array);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": img.mimeType,
      "Content-Length": String(img.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
