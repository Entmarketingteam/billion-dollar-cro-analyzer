// Shared Claude call that must return a JSON object. On a malformed first
// response, retries once with the parse error fed back before giving up.
//
// Transport: prefers the ENT agent server (Railway, backed by the Claude Max
// subscription — org rule: don't burn API credits) when AGENT_SERVER_* env
// vars are set; falls back to the Anthropic API with ANTHROPIC_API_KEY.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || "";
const AGENT_SERVER_API_KEY = process.env.AGENT_SERVER_API_KEY || "";

export const CLAUDE_MODEL = "claude-sonnet-5";

export class ClaudeApiError extends Error {}
export class ClaudeJsonError extends Error {}

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

async function callClaude(
  messages: ClaudeMessage[],
  maxTokens: number
): Promise<string> {
  if (AGENT_SERVER_URL && AGENT_SERVER_API_KEY) {
    // Agent server takes a single prompt string; flatten the conversation.
    const prompt = messages
      .map((m) =>
        m.role === "assistant" ? `Your previous response was:\n${m.content}` : m.content
      )
      .join("\n\n");

    const response = await fetch(`${AGENT_SERVER_URL}/complete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AGENT_SERVER_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new ClaudeApiError(
        `Agent server error: ${response.status} ${error.substring(0, 200)}`
      );
    }

    const data = await response.json();
    if (data.returncode !== 0) {
      throw new ClaudeApiError(
        `Agent server error: ${String(data.stderr).substring(0, 200)}`
      );
    }
    return data.text || "";
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new ClaudeApiError(
      `Claude API error: ${response.status} ${error.substring(0, 200)}`
    );
  }

  const data = await response.json();
  return data.content[0]?.text || "";
}

function extractJson(content: string): any {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new ClaudeJsonError("Claude response did not contain valid JSON");
  }
  return JSON.parse(jsonMatch[0]);
}

export async function claudeJson(
  prompt: string,
  maxTokens: number
): Promise<any> {
  const messages: ClaudeMessage[] = [{ role: "user", content: prompt }];
  const content = await callClaude(messages, maxTokens);

  try {
    return extractJson(content);
  } catch (parseError) {
    const reason =
      parseError instanceof Error ? parseError.message : String(parseError);
    const repaired = await callClaude(
      [
        ...messages,
        { role: "assistant", content },
        {
          role: "user",
          content: `Your previous response could not be parsed (${reason}). Respond again with ONLY the corrected, valid JSON object — no markdown, no explanation.`,
        },
      ],
      maxTokens
    );
    try {
      return extractJson(repaired);
    } catch {
      throw new ClaudeJsonError("Claude response did not contain valid JSON");
    }
  }
}
