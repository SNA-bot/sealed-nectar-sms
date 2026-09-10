// Supabase Edge Function: grade-theory
// Grades a student's theory/essay answer against a model answer using Claude,
// returning a numeric score and short feedback.
//
// Deploy:
//   supabase functions deploy grade-theory
// Secret required (set once):
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Call from the frontend:
//   const { data, error } = await supabase.functions.invoke('grade-theory', {
//     body: { question, modelAnswer, studentAnswer, maxScore }
//   });
//   // data => { score: number, feedback: string }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GradeRequest {
  question: string;
  modelAnswer: string;
  studentAnswer: string;
  maxScore: number;
}

interface GradeResult {
  score: number;
  feedback: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildPrompt(req: GradeRequest): string {
  return `You are grading a student's theory/essay exam answer for a school.

Question:
${req.question}

Model answer (what full marks looks like):
${req.modelAnswer}

Student's answer:
${req.studentAnswer}

Maximum score for this question: ${req.maxScore}

Grade the student's answer against the model answer. Award partial credit for
partially correct or partially complete answers — do not require an exact
match to the model answer's wording, only its substance. If the student's
answer is blank, off-topic, or shows no understanding, award 0.

Respond with ONLY a JSON object, no other text, no markdown fences, in this
exact shape:
{"score": <number, 0 to ${req.maxScore}, may be a decimal>, "feedback": "<one or two sentences explaining the score, addressed to the student>"}`;
}

function parseModelJson(text: string, maxScore: number): GradeResult {
  // Strip any accidental markdown fences before parsing.
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  let score = Number(parsed.score);
  if (!Number.isFinite(score)) score = 0;
  score = Math.max(0, Math.min(maxScore, score));

  const feedback =
    typeof parsed.feedback === "string" && parsed.feedback.trim().length > 0
      ? parsed.feedback.trim()
      : "No feedback provided.";

  return { score, feedback };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    return jsonResponse(
      { error: "ANTHROPIC_API_KEY secret is not configured on this project." },
      500,
    );
  }

  let body: GradeRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const { question, modelAnswer, studentAnswer, maxScore } = body ?? {};
  if (
    typeof question !== "string" ||
    typeof modelAnswer !== "string" ||
    typeof studentAnswer !== "string" ||
    typeof maxScore !== "number" ||
    !(maxScore > 0)
  ) {
    return jsonResponse(
      {
        error:
          "Body must include: question (string), modelAnswer (string), studentAnswer (string), maxScore (number > 0).",
      },
      400,
    );
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 400,
        messages: [
          { role: "user", content: buildPrompt({ question, modelAnswer, studentAnswer, maxScore }) },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return jsonResponse(
        { error: "AI grading service returned an error.", detail: errText },
        502,
      );
    }

    const data = await anthropicRes.json();
    const textBlock = (data.content ?? []).find(
      (block: { type: string }) => block.type === "text",
    );

    if (!textBlock?.text) {
      return jsonResponse({ error: "AI response contained no text." }, 502);
    }

    let result: GradeResult;
    try {
      result = parseModelJson(textBlock.text, maxScore);
    } catch (parseErr) {
      console.error("Failed to parse AI JSON:", textBlock.text, parseErr);
      return jsonResponse(
        { error: "Could not parse AI grading response.", raw: textBlock.text },
        502,
      );
    }

    return jsonResponse(result);
  } catch (err) {
    console.error("grade-theory function error:", err);
    return jsonResponse({ error: "Unexpected server error." }, 500);
  }
});
