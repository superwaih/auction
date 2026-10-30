import "server-only";
import { randomUUID } from "node:crypto";

export type CloudinaryImage = {
  provider: "cloudinary";
  publicId: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

export class CloudinaryError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

function credentials() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new CloudinaryError("Image uploads are not configured. Add the Cloudinary credentials on the server.", 503);
  }
  return { cloudName, authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}` };
}

async function request(action: "upload" | "destroy", form: FormData) {
  const { cloudName, authorization } = credentials();
  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/${action}`, {
      method: "POST", headers: { Authorization: authorization }, body: form,
      cache: "no-store", signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new CloudinaryError("Image storage could not be reached. Please try again.");
  }
  if (!response.ok) {
    if (action === "upload" && response.status === 400) throw new CloudinaryError("This image could not be uploaded. Choose a JPEG, PNG, WebP, GIF or AVIF image.", 400);
    throw new CloudinaryError("Image storage could not complete the request. Please try again.");
  }
  return response.json();
}

export async function uploadImage(image: { data: Buffer; type: string }): Promise<CloudinaryImage> {
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(image.data)], { type: image.type }), "image");
  form.set("public_id", `kivos/listings/${randomUUID()}`);
  form.set("overwrite", "false");
  form.set("allowed_formats", "jpg,png,webp,gif,avif");
  const result = await request("upload", form);
  return { provider: "cloudinary", publicId: result.public_id, url: result.secure_url, width: result.width, height: result.height, bytes: result.bytes, format: result.format };
}

export function deliveryUrl(image: CloudinaryImage) {
  return image.url.replace("/image/upload/", "/image/upload/f_auto,q_auto,c_limit,w_1400/");
}

export async function destroyImage(publicId: string) {
  const form = new FormData();
  form.set("public_id", publicId);
  form.set("invalidate", "true");
  const result = await request("destroy", form);
  if (result.result !== "ok" && result.result !== "not found") throw new CloudinaryError("The old image could not be removed from storage.");
}
