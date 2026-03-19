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

  // Step 1: Let Claude search the web freely
  const searchResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    // @ts-ignore
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `Search for recent news articles (past 14 days) about UNRWA from media outlets in ${countryNames}. Search these keywords: ${keywords.join(", ")}. List every article you find with its title, source, URL, and date.`,
      },
    ],
  });

  // Collect all text from the search response
  let searchText = "";
  for (const block of searchResponse.content) {
    if (block.type === "text") {
      searchText += block.text + "\n";
    }
  }

  if (!searchText.trim()) {
    return [];
  }

  // Step 2: Send the search results to Claude WITHOUT web search to get clean JSON
  const jsonResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `Here are search results about UNRWA from ${countryNames} media:

${searchText}

Convert these into a JSON array. For each article provide:
- title (original language)
- source (outlet name like NZZ, ORF, SRF, etc)
- country (Austria or Switzerland)
- date (YYYY-MM-DD)
- url
- keywords (which of these matched: ${keywords.join(", ")})
- relevance (0-100, how directly it covers UNRWA)
- sentiment (positive, neutral, or negative toward UNRWA)
- summary_en (2 paragraph English summary)

CRITICAL: Return ONLY a raw JSON object. No text before or after. No markdown. No explanation. Start with { and end with }

{"articles":[{"title":"...","source":"...","country":"...","date":"YYYY-MM-DD","url":"...","keywords":["..."],"relevance":85,"sentiment":"neutral","summary_en":"..."}]}`,
      },
    ],
  });

  const textBlock = jsonResponse.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return [];
  }

  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed.articles || [];
  } catch (e) {
    console.error("JSON parse failed. Raw response:", jsonStr.slice(0, 500));
    return [];
  }
}
