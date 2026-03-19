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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchBatch(query: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    // @ts-ignore
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: query }],
  });
  let text = "";
  for (const block of response.content) {
    if (block.type === "text") text += block.text + "\n";
  }
  return text;
}

export async function scanMedia(
  keywords: string[],
  countries: { code: string; name: string }[]
): Promise<Article[]> {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const countryNames = countries.map((c) => c.name).join(", ");
  const kwAll = keywords.join(", ");

  // Single comprehensive search instead of per-keyword to stay under 60s
  let searchResults = "";
  try {
    searchResults = await searchBatch(
      `Search for all news articles from ${weekAgo} to ${today} from media outlets in ${countryNames} (especially ORF, Der Standard, NZZ, SRF, SWI swissinfo.ch, Kurier, watson.ch, Tages-Anzeiger, Die Presse, Blick) mentioning any of these: ${kwAll}. Find as many articles as possible. List each with title, source, date, URL.`
    );
  } catch (e: any) {
    console.error("Search failed:", e.message);
    return [];
  }

  if (!searchResults.trim()) return [];

  await delay(5000);

  // Convert to JSON with detailed summaries
  const jsonResponse = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `Search results for UNRWA news from ${countryNames} media (${weekAgo} to ${today}):

${searchResults}

Create JSON with ALL unique articles. For each:
- title: original headline
- source: outlet name
- country: "Austria" or "Switzerland"
- date: YYYY-MM-DD
- url: full URL
- keywords: matching terms from: ${kwAll}
- relevance: 0-100
- sentiment: "positive", "neutral", or "negative"
- summary_en: detailed 4-6 paragraph English summary covering key facts, quotes, political context, reactions, and significance for UNRWA

Return ONLY raw JSON. No markdown. No explanation. Start with { end with }
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
