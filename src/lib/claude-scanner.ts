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

async function searchOneKeyword(
  keyword: string,
  countryNames: string
): Promise<string> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    // @ts-ignore
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `Search for recent news articles (past 14 days) mentioning "${keyword}" from media outlets in ${countryNames}. List every article you find with its title, source name, URL, date, and a brief description.`,
      },
    ],
  });

  let text = "";
  for (const block of response.content) {
    if (block.type === "text") text += block.text + "\n";
  }
  return text;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scanMedia(
  keywords: string[],
  countries: { code: string; name: string }[]
): Promise<Article[]> {
  const countryNames = countries.map((c) => c.name).join(", ");

  // Step 1: Search each keyword separately with delays to avoid rate limits
  let allSearchResults = "";

  for (let i = 0; i < keywords.length; i++) {
    try {
      const result = await searchOneKeyword(keywords[i], countryNames);
      allSearchResults += `\n--- Results for "${keywords[i]}" ---\n${result}\n`;
    } catch (e: any) {
      console.error(`Search failed for "${keywords[i]}":`, e.message);
    }

    // Wait 15 seconds between searches to avoid rate limits
    if (i < keywords.length - 1) {
      await delay(15000);
    }
  }

  if (!allSearchResults.trim()) {
    return [];
  }

  // Step 2: Wait before the analysis call
  await delay(15000);

  // Step 3: Convert all results to structured JSON
  const jsonResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `Here are search results for UNRWA-related articles from ${countryNames} media:

${allSearchResults}

Create a JSON object with all unique articles found. If the same article appeared in multiple keyword searches, list it once with all matching keywords.

For each article:
- title: headline in original language
- source: outlet name (e.g. NZZ, ORF, SRF, SWI swissinfo.ch, watson.ch, Der Standard)
- country: Austria or Switzerland
- date: YYYY-MM-DD
- url: full URL
- keywords: which of these matched: ${keywords.join(", ")}
- relevance: 0-100 based on how directly it covers UNRWA topics
- sentiment: positive, neutral, or negative toward UNRWA
- summary_en: two substantial paragraphs summarizing the article in English

CRITICAL: Return ONLY raw JSON. No text before or after. No markdown. Start with { end with }

{"articles":[]}`,
      },
    ],
  });

  const textBlock = jsonResponse.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  let jsonStr = textBlock.text.trim();
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed.articles || [];
  } catch (e) {
    console.error("JSON parse failed:", jsonStr.slice(0, 500));
    return [];
  }
}
