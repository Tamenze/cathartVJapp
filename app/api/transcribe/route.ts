import { NextRequest, NextResponse } from "next/server";
import Groq, { toFile } from "groq-sdk";
import { getQuota, incrementQuota, secondsToMinutes } from "@/lib/quota";
import { getIpHash } from "@/lib/ipHash";

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio") as File | null;
  const userId = formData.get("userId") as string | null;
  const durationSecondsRaw = formData.get("durationSeconds") as string | null;

  if (!audio || !userId || !durationSecondsRaw) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const durationSeconds = parseFloat(durationSecondsRaw);
  if (isNaN(durationSeconds) || durationSeconds <= 0) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const ipHash = getIpHash(req);
  const compositeId = `${userId}:${ipHash}`;
  const minutesUsed = secondsToMinutes(durationSeconds);

  // Re-validate quota server-side before processing
  let quota;
  try {
    quota = await getQuota(compositeId);
  } catch {
    // Fail open on Redis errors
    quota = { allowedMinutes: 20, isBlocked: false };
  }

  if (quota.isBlocked || quota.allowedMinutes < minutesUsed * 0.9) {
    console.log(JSON.stringify({ event: "quota_hit", durationSeconds, minutesUsed }));
    return NextResponse.json(
      { error: "Daily reflection limit reached. Try again tomorrow." },
      { status: 429 }
    );
  }

  try {
    // Re-wrap the file so the Groq SDK always sees an explicit name + MIME type.
    // Next.js FormData can strip this metadata from the File object in transit.
    const audioFile = await toFile(audio, "recording.webm", { type: "audio/webm" });
    const transcription = await getGroq().audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      response_format: "json",
    });

    // Reject silent / near-empty recordings without charging quota.
    // Whisper hallucinates short phrases (e.g. "Thank you.") for silent audio,
    // so require at least 2 distinct words, not just a non-empty string.
    const wordCount = transcription.text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 5) {
      console.log(JSON.stringify({ event: "recording_rejected_no_speech", durationSeconds, wordCount }));
      return NextResponse.json(
        { error: "No speech detected in this recording." },
        { status: 422 }
      );
    }

    // Increment quota only after confirmed speech
    await incrementQuota(compositeId, minutesUsed).catch((err) =>
      console.error("Quota increment failed:", err)
    );

    console.log(JSON.stringify({ event: "recording_submitted", durationSeconds, wordCount, minutesUsed }));
    return NextResponse.json({
      transcript: transcription.text,
      minutesUsed,
    });
  } catch (err) {
    console.error("Transcription error:", err);
    return NextResponse.json(
      { error: "Transcription failed. Please try again." },
      { status: 500 }
    );
  }
}

// Increase the body size limit for audio uploads (25MB = Groq Whisper max)
export const maxDuration = 60;
