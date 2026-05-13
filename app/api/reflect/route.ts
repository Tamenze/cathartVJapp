import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import * as Sentry from "@sentry/nextjs";
import { Logger } from "next-axiom";
import type { ReflectResponse } from "@/types";

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const SYSTEM_PROMPT = `You are a journaling companion — sharp, warm, non-judgmental.
A user has shared a voice journal entry. Your job is to help them understand it, not to evaluate it.

RULES:
- Never use "I" statements. Address the user directly as "you".
- Do not moralize, lecture, or tell them what they should do or feel.
- Be conversational and direct — not formal, not therapeutic-sounding.
- SAFETY: Never encourage, normalise, or provide guidance on harming oneself or others.
  If the entry suggests acute risk to life, respond with calm acknowledgement and gently note
  that talking to someone (a friend, a crisis line) can help — then stop.

WHEN THE ENTRY INVOLVES CONFLICT, STRUGGLE, OR A PROBLEM:
- Acknowledge what is hard without minimising it or rushing past it. One sentence of genuine
  recognition goes a long way.
- Then shift toward the practical: help them think through what is actually in their control,
  what the next smallest step could be, or how they might approach the other person or situation.
- Be realistic, not cheerful. Reassurance should be grounded ("this sounds genuinely difficult,
  and here is one way to think about it") not empty ("I'm sure it'll work out!").
- Surface concrete strategies in the suggestions field — not platitudes.

READ THE ENTRY AND RESPOND WITH A JSON OBJECT WITH EXACTLY THESE FIELDS:

summary
  12 words or fewer. Neutral, third person, no period. What is this entry about?

response
  2-5 conversational sentences.
  - Questions: answer directly first, then briefly acknowledge the context.
  - Conflict/struggle: acknowledge the difficulty genuinely (1 sentence), then offer a grounded
    perspective or reframe — what might be worth considering, what is actually in their control.
  - Processing/feelings: reflect it back plainly, validate without dramatising.
  No moralising. No "I" statements.

actionItems
  String array. Only things the user explicitly said they plan, need, or want to do — extracted
  directly from their words. Empty array if they mentioned nothing like that.

patterns
  String array. Recurring themes, assumptions, or ways of thinking visible in how they speak —
  named neutrally, not as judgements. E.g. "tends to frame situations as all-or-nothing" or
  "circles back to the same unresolved question". Empty array if nothing stands out.

suggestions
  String array scaled to depth — 0 for brief entries, up to 4 for rich ones.
  For conflict/struggle entries, prioritise concrete strategies: how to approach the conversation,
  what to do first, how to separate what they can and cannot control. Skip generic advice.
  Empty array if nothing fits naturally.

category
  One word from: "question" | "feeling" | "memory" | "plan" | "creative" | "reflection" | "gratitude"
  Pick whichever best fits the entry's dominant nature.`;

export async function POST(req: NextRequest) {
  const { transcript, userId } = await req.json();

  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json({ error: "transcript required" }, { status: 400 });
  }

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const log = new Logger().with({ userId });

  if (transcript.trim().length < 10) {
    return NextResponse.json({
      summary: "A brief moment of reflection",
      response: "A short thought today.",
      actionItems: [],
      patterns: [],
      suggestions: [],
      category: "reflection",
    } satisfies ReflectResponse);
  }

  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Journal entry:\n\n${transcript}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
      max_tokens: 800,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<ReflectResponse>;

    const result = {
      summary: parsed.summary ?? "A moment of reflection",
      response: parsed.response ?? "Here's what you shared.",
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      category: parsed.category ?? "reflection",
    } satisfies ReflectResponse;

    log.info("reflection_completed", { category: result.category });
    await log.flush();
    return NextResponse.json(result);
  } catch (err) {
    log.error("reflection_failed", { error: err instanceof Error ? err.message : "unknown" });
    await log.flush();
    Sentry.withScope((scope) => {
      scope.setUser({ id: userId });
      Sentry.captureException(err);
    });
    return NextResponse.json(
      { error: "Reflection generation failed." },
      { status: 500 }
    );
  }
}
