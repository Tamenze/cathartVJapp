import { createHash } from "crypto";
import type { NextRequest } from "next/server";

export function getIpHash(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}
