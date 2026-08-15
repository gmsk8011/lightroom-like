import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

/* ----------------------------------------------------------------- schema */

const CHANGE_TYPES = [
  "grammar",
  "spelling",
  "punctuation",
  "style",
  "clarity",
] as const;

const assistResultSchema = z.object({
  corrected: z.string(),
  changes: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      type: z.enum(CHANGE_TYPES),
      reason: z.string(),
    }),
  ),
});

export type AssistResult = z.infer<typeof assistResultSchema>;
export type AssistChange = AssistResult["changes"][number];
export type AssistMode = "grammar" | "improve";

const requestSchema = z.object({
  text: z.string().min(1).max(500),
  mode: z.enum(["grammar", "improve"]),
});

/** Mirrors `assistResultSchema` for the model. Structured outputs require
 *  `additionalProperties: false` and an explicit `required` on every object. */
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    corrected: {
      type: "string",
      description: "The full corrected caption text.",
    },
    changes: {
      type: "array",
      description:
        "One entry per individual edit, so the UI can accept or reject each.",
      items: {
        type: "object",
        properties: {
          from: { type: "string", description: "The original wording." },
          to: { type: "string", description: "The replacement wording." },
          type: { type: "string", enum: [...CHANGE_TYPES] },
          reason: {
            type: "string",
            description: "Short plain-language explanation, under 12 words.",
          },
        },
        required: ["from", "to", "type", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["corrected", "changes"],
  additionalProperties: false,
} as const;

/* ---------------------------------------------------------------- prompts */

const SYSTEM_PROMPTS: Record<AssistMode, string> = {
  grammar: `You correct photo captions. Fix only clear errors in grammar, spelling, and punctuation.

Preserve the writer's voice, word choices, capitalisation style, and any deliberate fragments — captions are not prose and often omit verbs on purpose. Do not rewrite for style, do not add or remove information, and do not lengthen the caption.

If the caption has no errors, return it unchanged with an empty changes array.`,

  improve: `You improve photo captions. Fix errors, and additionally tighten wording where the caption is genuinely unclear or clumsy.

Keep the writer's voice and intent. Captions should stay short — never make one longer than it was. Do not invent details about the photo that the caption does not already state.

Report every edit separately so each can be accepted or rejected on its own.`,
};

/* ----------------------------------------------------------- rate limiting */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  // Bound the map so a long-running server doesn't accumulate dead keys.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  return recent.length > MAX_PER_WINDOW;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

/* ------------------------------------------------------------------ route */

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Caption assistance isn't configured on this server." },
      { status: 503 },
    );
  }

  if (rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many requests — give it a moment." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Expected a caption of 1–500 characters and a mode." },
      { status: 400 },
    );
  }

  const { text, mode } = parsed.data;
  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      // Haiku keeps the inline grammar pass fast enough to run as you type;
      // the explicit rewrite is worth a stronger model.
      model: mode === "grammar" ? "claude-haiku-4-5" : "claude-sonnet-5",
      max_tokens: 2000,
      system: SYSTEM_PROMPTS[mode],
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      messages: [{ role: "user", content: text }],
      ...(mode === "improve" ? { thinking: { type: "disabled" as const } } : {}),
    });

    if (message.stop_reason === "refusal") {
      return NextResponse.json(
        { error: "That caption couldn't be processed." },
        { status: 422 },
      );
    }

    const block = message.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") {
      return NextResponse.json(
        { error: "No suggestion was returned." },
        { status: 502 },
      );
    }

    const result = assistResultSchema.safeParse(JSON.parse(block.text));
    if (!result.success) {
      return NextResponse.json(
        { error: "The suggestion came back in an unexpected shape." },
        { status: 502 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited upstream — try again shortly." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Caption assistance is misconfigured on this server." },
        { status: 503 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: "Caption assistance is unavailable right now." },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Something went wrong checking that caption." },
      { status: 500 },
    );
  }
}
