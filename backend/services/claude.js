import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

const SYSTEM = `You select the best short-form moments from a movie clip transcript.
You are given a numbered word list. Respond with ONLY a JSON array, no prose, no markdown fences.
Each element: { "startIdx": int, "endIdx": int, "hook": string, "score": number 0-1, "reason": string }.
Rules:
- startIdx/endIdx are WORD INDICES into the provided list, inclusive. Never output timestamps.
- Each span should read as 15-45 seconds of speech (~40-140 words).
- Spans must not overlap. Return 3 to 5 candidates, best first.
- "hook" is the punchy opening line a viewer would see. "reason" explains the pick in one sentence.`;

export async function selectMoments(transcript) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const numbered = transcript.words.map((w) => `[${w.i}] ${w.text}`).join(" ");
  const maxIdx = transcript.words.length - 1;

  const ask = async (extra = "") => {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Transcript (${maxIdx + 1} words):\n\n${numbered}${extra}`
      }]
    });
    return msg.content.find((b) => b.type === "text")?.text ?? "";
  };

  let text = await ask();
  let result = validate(text, maxIdx);
  if (result.errors) {
    // one automatic retry, feeding the errors back
    text = await ask(`\n\nYour previous response was invalid: ${result.errors}. Respond again with ONLY the corrected JSON array.`);
    result = validate(text, maxIdx);
    if (result.errors) throw new Error(`selectMoments: invalid after retry: ${result.errors}`);
  }
  return result.candidates;
}

export function validate(text, maxIdx) {
  let parsed;
  try {
    parsed = JSON.parse(text.replace(/^```(json)?|```$/gm, "").trim());
  } catch {
    return { errors: "response was not parseable JSON" };
  }
  if (!Array.isArray(parsed)) return { errors: "response was not an array" };
  if (parsed.length < 1 || parsed.length > 5) return { errors: `expected 3-5 candidates, got ${parsed.length}` };

  const errs = [];
  parsed.forEach((c, n) => {
    if (!Number.isInteger(c.startIdx) || !Number.isInteger(c.endIdx))
      errs.push(`candidate ${n}: indices must be integers`);
    else if (c.startIdx < 0 || c.endIdx > maxIdx)
      errs.push(`candidate ${n}: indices out of range 0-${maxIdx}`);
    else if (c.endIdx <= c.startIdx)
      errs.push(`candidate ${n}: endIdx must exceed startIdx`);
    if (typeof c.hook !== "string" || !c.hook) errs.push(`candidate ${n}: missing hook`);
    if (typeof c.score !== "number" || c.score < 0 || c.score > 1)
      errs.push(`candidate ${n}: score must be 0-1`);
    if (typeof c.reason !== "string" || !c.reason) errs.push(`candidate ${n}: missing reason`);
  });
  if (errs.length) return { errors: errs.join("; ") };

  // overlap check after individual validation
  const sorted = [...parsed].sort((a, b) => a.startIdx - b.startIdx);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startIdx <= sorted[i - 1].endIdx)
      return { errors: `candidates ${i - 1} and ${i} overlap` };
  }

  return { candidates: parsed };
}