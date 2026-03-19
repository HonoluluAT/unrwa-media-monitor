import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Article {
  title: string;
  source: string;
  country: string;
  date: string;
  url: string;
  keywords: string[];
  relevance: number;
  sentiment: "positive" | "neutral" | "negative";
  summary_en: string;
}

export async function scanMedia(
  keywords: string[],
  countries: { code: string; name: string }[]
): Promise<Article[]> {
  const countryNames = countries.map((c) => c.name).join(", ");
  const today = new Date().toISOString().slice(0, 10);
  const kwList = keywords.map((k, i) => `${i + 1}. "${k}"`).join("\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    // @ts-ignore
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `Media monitor for UNRWA. Date: ${today}. Search each keyword separately in ${countryNames} media (past 7-14 days):
${kwList}

Rules: only ${countryNames} outlets, deduplicate by URL, 2-paragraph English summary each, relevance 0-100, sentiment positive/neutral/negative.

Return ONLY JSON, no markdown:
{"articles":[{"title":"...","source":"...","country":"...","date":"YYYY-MM-DD","url":"...","keywords":["..."],"relevance":85,"sentiment":"neutral","summary_en":"..."}]}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);
  return parsed.articles || [];
}
