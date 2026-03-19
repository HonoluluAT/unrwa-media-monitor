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

export async function searchKeyword(
  keyword: string,
  countryNames: string
): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    // @ts-ignore
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `Search for news articles from ${weekAgo} to ${today} from media outlets in ${countryNames} (especially ORF, Der Standard, Kurier, Die Presse, NZZ, SRF, SWI swissinfo.ch, watson.ch, Tages-Anzeiger, Blick, Kleine Zeitung, Salzburger Nachrichten, Profil) that mention "${keyword}". Find as many articles as possible. For each article list: exact title, source outlet name, publication date, and full URL.`,
      },
    ],
  });

  let text = "";
  for (const block of response.content) {
    if (block.type === "text") text += block.text + "\n";
  }
  return text;
}

export async function analyzeResults(
  rawResults: string,
  keywords: string[],
  countryNames: string
): Promise<Article[]> {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: `Here are search results for UNRWA-related news from ${countryNames} media (${weekAgo} to ${today}):

${rawResults}

Create a JSON object with ALL unique articles. Deduplicate by URL. For each article:
- title: headline in original language
- source: outlet name
- country: "Austria" or "Switzerland"
- date: YYYY-MM-DD
- url: full URL
- keywords: which of these matched: ${keywords.join(", ")}
- relevance: 0-100 (how directly it covers UNRWA/Lazzarini/Palestine refugees)
- sentiment: "positive", "neutral", or "negative" toward UNRWA
- summary_en: a detailed English summary of 4-6 substantial paragraphs covering key facts, direct quotes where available, political context and background, reactions from different parties and stakeholders, and the broader significance for UNRWA operations and funding

Include ALL articles found. Be thorough.

CRITICAL: Return ONLY raw JSON. No text before or after. No markdown. Start with { end with }
{"articles":[]}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
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
