import { db, schema } from "@/db";
import { adminRoute, ApiError } from "@/server/admin-api";
import { audit } from "@/server/audit";
import { ok } from "@/server/http";

const MAX = 2 * 1024 * 1024;

/** Detect type from magic bytes — never trust the browser-provided MIME type. */
function sniff(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null; // SVG intentionally not allowed (can carry scripts)
}

export const POST = adminRoute("MANAGER", async (req, admin) => {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX + 10_000) throw new ApiError(413, "Image must be 2 MB or smaller.");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(422, "Choose an image file.");
  if (file.size > MAX) throw new ApiError(413, "Image must be 2 MB or smaller.");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime) throw new ApiError(415, "Only JPEG, PNG or WebP images are allowed.");
  // Inside a transaction so binary data always goes over a real Postgres connection (also on serverless hosts).
  const [img] = await db.transaction((tx) => tx.insert(schema.uploadedImages).values({ mimeType: mime, bytes: buf, size: buf.length }).returning({ id: schema.uploadedImages.id }));
  await audit(admin, "image.upload", "image", img.id, { size: buf.length, mime });
  return ok({ url: `/api/images/${img.id}` }, { status: 201 });
});
