import { NextRequest, NextResponse } from "next/server";
import { getQuota } from "@/lib/quota";
import { getIpHash } from "@/lib/ipHash";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const ipHash = getIpHash(req);
  const compositeId = `${userId}:${ipHash}`;

  try {
    const quota = await getQuota(compositeId);
    return NextResponse.json(quota);
  } catch (err) {
    console.error("Quota check failed:", err);
    // Fail open with full quota so a Redis outage doesn't block users
    return NextResponse.json({
      userUsed: 0,
      userRemaining: 20,
      globalUsed: 0,
      globalRemaining: 200,
      allowedMinutes: 20,
      isBlocked: false,
    });
  }
}
