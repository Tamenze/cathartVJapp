// ═══════════════════════════════════════════════════════════════
// [EXPERIMENTAL] Thought Constellation — Concept Extraction API
// POST /api/concepts
// Synthesizes recurring psychological/emotional patterns across
// multiple journal entries into labelled concept nodes.
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// [EXPERIMENTAL] Shape of each entry sent to this endpoint
interface EntryInput {
  id: number;
  summary: string;
  patterns: string[];
}

// [EXPERIMENTAL] Shape of each concept node returned
export interface ConceptNode {
  id: string;
  label: string;
  description: string;
  frequency: number;
  entryIds: number[];
  relatedIds: string[];
}

const SYSTEM_PROMPT = `You are a reflective analyst for a private journaling app.
Given a collection of journal entry summaries and their observed thought patterns,
identify the deeper recurring psychological and emotional themes that run across them.

RULES:
- Find 4–8 concepts total. Only include concepts present in at least 2 entries.
- Labels must be 1–3 words. Make them emotionally resonant and human — not clinical.
  Good: "Self-Pressure", "Quiet Pride", "Belonging", "Avoidance", "Momentum"
  Bad: "Cognitive Distortion", "Anxiety Manifestation", "Behavioral Pattern"
- Descriptions are 1–2 sentences, second person ("you"), conversational, insightful.
  They should name the pattern in a way that feels like recognition, not diagnosis.
- relatedIds must only reference IDs of other concepts in YOUR response.
- entryIds must only reference IDs from the input entries.
- Respond ONLY with valid JSON — no prose before or after.

JSON schema:
{
  "concepts": [
    {
      "id": "kebab-case-label",
      "label": "1–3 word label",
      "description": "1–2 sentence insight in second person.",
      "frequency": <number of entries this theme appears in>,
      "entryIds": [<entry ids>],
      "relatedIds": ["other-concept-id"]
    }
  ]
}`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.entries || !Array.isArray(body.entries) || body.entries.length < 2) {
    return NextResponse.json({ concepts: [] });
  }

  const entries: EntryInput[] = body.entries.slice(0, 40); // cap to keep prompt manageable
  const validIds = new Set(entries.map((e) => e.id));

  const entryList = entries
    .map((e) => {
      const pats = e.patterns.length > 0 ? `\n  Patterns: ${e.patterns.join("; ")}` : "";
      return `Entry ${e.id}: ${e.summary}${pats}`;
    })
    .join("\n");

  try {
    const completion = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Journal entries:\n\n${entryList}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 900,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { concepts?: ConceptNode[] };
    const rawConcepts = Array.isArray(parsed.concepts) ? parsed.concepts : [];

    // Validate: filter bogus entry/concept IDs the LLM may hallucinate
    const conceptIds = new Set(rawConcepts.map((c) => c.id));
    const concepts: ConceptNode[] = rawConcepts
      .filter((c) => c.id && c.label && c.description)
      .map((c) => ({
        id: String(c.id),
        label: String(c.label).slice(0, 30),
        description: String(c.description),
        frequency: Math.max(1, Number(c.frequency) || 1),
        entryIds: (Array.isArray(c.entryIds) ? c.entryIds : [])
          .filter((id) => validIds.has(Number(id)))
          .map(Number),
        relatedIds: (Array.isArray(c.relatedIds) ? c.relatedIds : [])
          .filter((id) => conceptIds.has(String(id)))
          .map(String),
      }));

    return NextResponse.json({ concepts });
  } catch (err) {
    console.error("[EXPERIMENTAL] Concept extraction error:", err);
    return NextResponse.json({ concepts: [] });
  }
}
