import { NextResponse, type NextRequest } from "next/server";
import { put } from "@vercel/blob";

const MAX_SIZE_BYTES = 4.5 * 1024 * 1024; // Vercel's own request-body cap on Hobby serverless functions

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file'" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Image too large (max 4.5MB)" }, { status: 400 });
  }

  // No explicit token/credential check here: a project connected to a Blob
  // store (recommended over a standalone BLOB_READ_WRITE_TOKEN) authenticates
  // via OIDC — Vercel injects VERCEL_OIDC_TOKEN + BLOB_STORE_ID automatically,
  // and put() reads both on its own. It throws (caught below) if neither
  // that pair nor a BLOB_READ_WRITE_TOKEN is available.
  try {
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Blob upload failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 });
  }
}
